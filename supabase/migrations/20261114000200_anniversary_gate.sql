begin;

create schema anniversary_private;
revoke all on schema anniversary_private from public, anon, authenticated;

create table anniversary_private.settings (
  singleton boolean primary key default true check (singleton),
  passenger_id uuid not null references auth.users(id) on delete cascade,
  pin_hash text not null
);

create table anniversary_private.access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  letter_opened_at timestamptz,
  unlocked_at timestamptz,
  attempts integer not null default 0,
  retry_at timestamptz
);

alter table anniversary_private.settings enable row level security;
alter table anniversary_private.access enable row level security;

create or replace function anniversary_private.is_passenger()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from anniversary_private.settings s where s.passenger_id = auth.uid())
$$;

create or replace function public.anniversary_access_granted()
returns boolean language sql stable security definer set search_path = '' as $$
  select not anniversary_private.is_passenger() or exists (
    select 1 from anniversary_private.access a
    where a.user_id = auth.uid() and a.unlocked_at is not null
  )
$$;

-- Keep basic account bootstrap available while the anniversary gate is closed.
create or replace function anniversary_private.is_member(rel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.relationship_members m where m.relationship_id = rel and m.user_id = auth.uid())
$$;

create or replace function public.anniversary_bootstrap_member(rel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select anniversary_private.is_member(rel)
$$;

create or replace function public.is_member(rel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.anniversary_access_granted() and anniversary_private.is_member(rel)
$$;

create or replace function public.my_relationship_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.relationship_id from public.relationship_members m where m.user_id = auth.uid()
    and public.anniversary_access_granted() limit 1
$$;

alter policy relationships_select on public.relationships using (public.anniversary_bootstrap_member(id));
alter policy members_select on public.relationship_members using (public.anniversary_bootstrap_member(relationship_id));

alter policy letters_select on public.letters using (
  public.anniversary_bootstrap_member(relationship_id)
  and (not is_draft or author_id = auth.uid())
  and (letter_type <> 'secret' or author_id = auth.uid() or public.has_unlocked('secret-letter'))
  and (
    public.anniversary_access_granted()
    or (letter_type = 'anniversary' and not is_draft and statement_timestamp() >= '2026-11-16 00:00:00+05:30'::timestamptz
      and exists (select 1 from public.user_preferences p where p.user_id = auth.uid() and p.boarding_checkin is not null))
  )
);

-- The schedule is shared by the countdown and PIN validation. Slot ends are exclusive.
create or replace function anniversary_private.schedule(slot text, at_time timestamptz)
returns table (next_start timestamptz, slot_open boolean)
language sql immutable set search_path = '' as $$
  with windows(start_at, end_at, selected) as (
    values
      ('2026-11-16 14:00:00+05:30'::timestamptz, '2026-11-16 16:00:00+05:30'::timestamptz, slot not like '21:00%'),
      ('2026-11-16 21:00:00+05:30'::timestamptz, '2026-11-16 23:00:00+05:30'::timestamptz, slot like '21:00%' or lower(slot) like 'both%')
  )
  select min(start_at) filter (where selected and at_time < start_at),
         coalesce(bool_or(selected and at_time >= start_at and at_time < end_at), false)
  from windows
$$;

create or replace function public.anniversary_gate_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'now', statement_timestamp(), 'checkedIn', p.boarding_checkin is not null,
    'nextStart', s.next_start, 'slotOpen', s.slot_open and p.boarding_checkin is not null,
    'letterOpened', a.letter_opened_at is not null, 'unlocked', a.unlocked_at is not null
  )
  from (select auth.uid() as uid) viewer
  left join public.user_preferences p on p.user_id = viewer.uid
  left join anniversary_private.access a on a.user_id = viewer.uid
  cross join lateral anniversary_private.schedule(coalesce(p.boarding_checkin ->> 'timeSlot', '14:00 to 16:00'), statement_timestamp()) s
$$;

create or replace function public.anniversary_open_letter()
returns boolean language plpgsql security definer set search_path = '' as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or statement_timestamp() < '2026-11-16 00:00:00+05:30'::timestamptz
    or not exists (select 1 from public.user_preferences p where p.user_id = viewer and p.boarding_checkin is not null)
    then return false;
  end if;
  insert into anniversary_private.access (user_id, letter_opened_at) values (viewer, statement_timestamp())
  on conflict (user_id) do update set letter_opened_at = coalesce(anniversary_private.access.letter_opened_at, excluded.letter_opened_at);
  return true;
end $$;

create or replace function public.anniversary_try_pin(pin text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  t timestamptz := statement_timestamp();
  gate anniversary_private.access%rowtype;
  status jsonb;
  secret text;
begin
  if viewer is null or not anniversary_private.is_passenger() or pin is null or pin !~ '^[0-9]{4}$' then return 'locked'; end if;
  insert into anniversary_private.access (user_id) values (viewer) on conflict do nothing;
  select * into gate from anniversary_private.access where user_id = viewer for update;
  if gate.unlocked_at is not null then return 'ok'; end if;
  status := public.anniversary_gate_status();
  if gate.letter_opened_at is null or not (status ->> 'slotOpen')::boolean then return 'locked'; end if;
  if gate.retry_at > t then return 'wait'; end if;
  select pin_hash into secret from anniversary_private.settings where singleton;
  if secret is null then return 'unavailable'; end if;
  if extensions.crypt(pin, secret) = secret then
    update anniversary_private.access set unlocked_at = t, attempts = 0, retry_at = null where user_id = viewer;
    return 'ok';
  end if;
  if gate.retry_at is not null then gate.attempts := 0; end if;
  update anniversary_private.access
  set attempts = gate.attempts + 1,
      retry_at = case when gate.attempts >= 4 then t + interval '15 minutes' end
  where user_id = viewer;
  return case when gate.attempts >= 4 then 'wait' else 'wrong' end;
end $$;

create or replace function anniversary_private.guard_checkin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz := statement_timestamp();
begin
  if not anniversary_private.is_passenger() then return new; end if;
  if tg_op = 'UPDATE' and new.boarding_checkin is not distinct from old.boarding_checkin then return new; end if;
  if new.boarding_checkin is null then
    if tg_op = 'INSERT' then return new; end if;
    raise exception 'Check-in cannot be cleared here';
  end if;
  if t < '2026-11-14 00:00:00+05:30'::timestamptz or t >= '2026-11-16 00:00:00+05:30'::timestamptz then
    raise exception 'Online check-in is closed';
  end if;
  if jsonb_typeof(new.boarding_checkin) <> 'object'
    or coalesce(new.boarding_checkin ->> 'timeSlot', '') not in ('14:00 to 16:00', '21:00 to 23:00', 'Both (can’t get enough of you)')
    or coalesce(char_length(new.boarding_checkin ->> 'seat'), 0) not between 1 and 100
    or coalesce(char_length(new.boarding_checkin ->> 'firstStop'), 0) not between 1 and 100
    or coalesce(char_length(new.boarding_checkin ->> 'memory'), 0) > 500 then
    raise exception 'Invalid check-in answers';
  end if;
  new.boarding_checkin := jsonb_set(new.boarding_checkin, '{checkedInAt}', to_jsonb(t));
  return new;
end $$;

create trigger anniversary_checkin_guard before insert or update on public.user_preferences
for each row execute function anniversary_private.guard_checkin();

create policy anniversary_prevent_preferences_delete on public.user_preferences
as restrictive for delete to authenticated using (public.anniversary_access_granted());

-- Preserve the carry-on's chosen track while restricting the full Soundtrack collection.
create or replace function public.anniversary_carry_on_track()
returns table (title text, artist text, external_url text)
language sql stable security definer set search_path = '' as $$
  select s.title, s.artist, s.external_url
  from public.songs s
  where anniversary_private.is_member(s.relationship_id) and not s.is_demo
    and s.external_url ~* '^https?://'
    and exists (select 1 from public.user_preferences p where p.user_id = auth.uid() and p.boarding_checkin is not null)
  order by s.is_favourite desc, s.created_at desc limit 1
$$;

-- Gate policies with an author-owned branch that does not call is_member.
do $$
declare t text;
begin
  foreach t in array array['game_answers', 'secrets', 'surprise_unlocks'] loop
    execute format('create policy anniversary_access_required on public.%I as restrictive to authenticated using (public.anniversary_access_granted()) with check (public.anniversary_access_granted())', t);
  end loop;
end $$;

revoke all on function public.anniversary_gate_status(), public.anniversary_try_pin(text),
  public.anniversary_bootstrap_member(uuid), public.anniversary_access_granted(),
  public.anniversary_carry_on_track(), public.anniversary_open_letter() from public, anon;

grant execute on function public.anniversary_gate_status(), public.anniversary_try_pin(text),
  public.anniversary_bootstrap_member(uuid), public.anniversary_access_granted(),
  public.anniversary_carry_on_track(), public.anniversary_open_letter() to authenticated;

commit;
