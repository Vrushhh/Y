begin;

create table public.daily_seconds (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clip_date date not null check (clip_date <= (now() at time zone 'Asia/Kolkata')::date),
  video_path text not null,
  created_at timestamptz not null default now(),
  unique (relationship_id, author_id, clip_date),
  check (video_path like relationship_id::text || '/daily-seconds/%')
);

create table public.weekly_answers (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  answer text not null check (char_length(btrim(answer)) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (relationship_id, author_id, week_start)
);

create table public.photo_recreations (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  then_path text not null,
  then_date date not null,
  now_path text not null,
  now_date date not null check (now_date >= then_date),
  created_at timestamptz not null default now(),
  check (now_path like relationship_id::text || '/photo-recreations/%')
);

alter table public.daily_seconds enable row level security;
alter table public.weekly_answers enable row level security;
alter table public.photo_recreations enable row level security;

create policy daily_seconds_read on public.daily_seconds for select to authenticated
  using (public.is_member(relationship_id));
create policy daily_seconds_add on public.daily_seconds for insert to authenticated
  with check (author_id = auth.uid() and public.is_member(relationship_id));

-- A definer function can check for the caller's submission without recursing into RLS.
create function public.has_weekly_answer(p_relationship uuid, p_week date)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.weekly_answers
    where relationship_id = p_relationship and week_start = p_week and author_id = auth.uid()
  );
$$;
revoke all on function public.has_weekly_answer(uuid, date) from public, anon;
grant execute on function public.has_weekly_answer(uuid, date) to authenticated;

create policy weekly_answers_read on public.weekly_answers for select to authenticated
  using (public.is_member(relationship_id)
    and (author_id = auth.uid() or public.has_weekly_answer(relationship_id, week_start)));
create policy weekly_answers_add on public.weekly_answers for insert to authenticated
  with check (author_id = auth.uid() and public.is_member(relationship_id)
    and week_start = date_trunc('week', now() at time zone 'Asia/Kolkata')::date);

create policy photo_recreations_read on public.photo_recreations for select to authenticated
  using (public.is_member(relationship_id));
create policy photo_recreations_add on public.photo_recreations for insert to authenticated
  with check (author_id = auth.uid() and public.is_member(relationship_id)
    and exists (select 1 from public.memories m where m.id = memory_id
      and m.relationship_id = photo_recreations.relationship_id
      and photo_recreations.then_path = any(m.image_paths)));

revoke all on public.daily_seconds, public.weekly_answers, public.photo_recreations from anon, authenticated;
grant select, insert on public.daily_seconds, public.weekly_answers, public.photo_recreations to authenticated;
alter publication supabase_realtime add table public.daily_seconds, public.photo_recreations;

commit;
