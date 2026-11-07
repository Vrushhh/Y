-- =====================================================================
-- OUR LITTLE UNIVERSE — schema, security and functions
-- Every private table is restricted to the two members of a relationship
-- through Row Level Security. Game answers and time capsules are guarded
-- in the database, not only in the UI.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Core: relationships and members
-- ---------------------------------------------------------------------
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Little Universe' check (char_length(name) between 1 and 80),
  start_date date not null default '2025-11-16',
  anniversary_date date not null default '2026-11-16',
  created_at timestamptz not null default now()
);

create table public.relationship_members (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'You' check (char_length(display_name) between 1 and 40),
  avatar_url text,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  constraint one_relationship_per_user unique (user_id),
  unique (relationship_id, user_id)
);
create index on public.relationship_members (relationship_id);

create table public.relationship_invites (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (relationship_id, email)
);

-- Helpers (security definer so they can be used inside RLS policies without recursion)
create or replace function public.my_relationship_id()
returns uuid language sql stable security definer set search_path = public as $$
  select relationship_id from public.relationship_members where user_id = auth.uid() limit 1
$$;

create or replace function public.is_member(rel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.relationship_members where relationship_id = rel and user_id = auth.uid())
$$;

create or replace function public.norm(t text)
returns text language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'))
$$;

-- A relationship holds exactly two people, never more.
create or replace function public.enforce_two_members()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.relationship_members where relationship_id = new.relationship_id) >= 2 then
    raise exception 'This universe already has two members';
  end if;
  return new;
end $$;
create trigger relationship_members_max_two before insert on public.relationship_members
  for each row execute function public.enforce_two_members();

-- Sets the author column (named by the trigger argument) to the signed-in user, so authorship cannot be spoofed.
create or replace function public.set_author()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new := jsonb_populate_record(new, jsonb_build_object(tg_argv[0], auth.uid()));
  end if;
  return new;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 4000),
  location_name text check (char_length(location_name) <= 200),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  memory_date date,
  image_path text,
  image_paths text[] not null default '{}',
  category text not null default 'favourite_place'
    check (category in ('first_meeting','first_date','favourite_place','trip','special_occasion','future_destination')),
  notes text check (char_length(notes) <= 2000),
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.memories (relationship_id, memory_date);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 4000),
  event_date date not null,
  category text not null default 'special' check (category in ('firsts','dates','trips','celebrations','special')),
  image_path text,
  video_url text check (video_url is null or video_url ~* '^https?://'),
  voice_path text,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.timeline_events (relationship_id, event_date);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  content text not null default '' check (char_length(content) <= 20000),
  letter_type text not null default 'anniversary'
    check (letter_type in ('anniversary','miss_me','sad','unsaid','next_chapter','secret')),
  image_path text,
  voice_path text,
  is_favourite boolean not null default false,
  is_draft boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.letters (relationship_id, letter_type);
create trigger letters_touch before update on public.letters for each row execute function public.touch_updated_at();

create table public.reasons (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  content text not null check (char_length(content) between 1 and 500),
  is_favourite boolean not null default false,
  read_by uuid[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.reasons (relationship_id, created_at);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  artist text check (char_length(artist) <= 160),
  artwork_path text,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  memory_note text check (char_length(memory_note) <= 2000),
  is_favourite boolean not null default false,
  is_demo boolean not null default false,
  added_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.songs (relationship_id, created_at);

create table public.bucket_list (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'experiences'
    check (category in ('places','restaurants','experiences','adventures','milestones','celebrations')),
  notes text check (char_length(notes) <= 2000),
  target_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  is_demo boolean not null default false,
  added_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.bucket_list (relationship_id, completed);

create or replace function public.bucket_completed_at()
returns trigger language plpgsql as $$
begin
  if new.completed and (tg_op = 'INSERT' or not old.completed) then new.completed_at := now(); end if;
  if not new.completed then new.completed_at := null; end if;
  return new;
end $$;
create trigger bucket_list_completed before insert or update on public.bucket_list
  for each row execute function public.bucket_completed_at();

create table public.photo_strips (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  image_path text not null,
  caption text check (char_length(caption) <= 120),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null default 'A message for later' check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 1 and 20000),
  unlock_at timestamptz not null,
  attachment_path text,
  created_at timestamptz not null default now(),
  constraint unlock_in_future check (unlock_at > created_at)
);
create index on public.time_capsules (relationship_id, unlock_at);

create table public.surprise_unlocks (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unlock_key text not null check (unlock_key ~ '^[a-z0-9-]{1,40}$'),
  unlocked_at timestamptz not null default now(),
  unique (user_id, unlock_key)
);

create or replace function public.has_unlocked(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.surprise_unlocks where user_id = auth.uid() and unlock_key = p_key)
$$;

create table public.secrets (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null default public.my_relationship_id() references public.relationships(id) on delete cascade,
  unlock_key text not null check (unlock_key in ('moon','constellation','game-champion','hidden-memory','secret-letter')),
  title text not null check (char_length(title) between 1 and 120),
  message text check (char_length(message) <= 4000),
  image_path text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  music_enabled boolean not null default false,
  animation_enabled boolean not null default true,
  intro_completed boolean not null default false,
  theme text not null default 'celestial' check (theme in ('celestial','dawn')),
  updated_at timestamptz not null default now()
);
create trigger prefs_touch before update on public.user_preferences for each row execute function public.touch_updated_at();

-- Author triggers
create trigger memories_author before insert on public.memories for each row execute function public.set_author('created_by');
create trigger timeline_author before insert on public.timeline_events for each row execute function public.set_author('created_by');
create trigger letters_author before insert on public.letters for each row execute function public.set_author('author_id');
create trigger reasons_author before insert on public.reasons for each row execute function public.set_author('author_id');
create trigger songs_author before insert on public.songs for each row execute function public.set_author('added_by');
create trigger bucket_author before insert on public.bucket_list for each row execute function public.set_author('added_by');
create trigger strips_author before insert on public.photo_strips for each row execute function public.set_author('created_by');
create trigger capsules_author before insert on public.time_capsules for each row execute function public.set_author('author_id');
create trigger unlocks_author before insert on public.surprise_unlocks for each row execute function public.set_author('user_id');
create trigger secrets_author before insert on public.secrets for each row execute function public.set_author('created_by');

-- ---------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------
create table public.game_questions (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid default public.my_relationship_id() references public.relationships(id) on delete cascade, -- null = built-in
  game_type text not null check (game_type in ('who_knows','guess_my_answer','this_or_that','relationship_trivia',
                                               'would_you_rather','finish_sentence','memory_challenge','compatibility')),
  question_text text not null check (char_length(question_text) between 1 and 300),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_answer text,
  image_path text,
  points int not null default 10 check (points between 0 and 100),
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.game_questions (game_type, relationship_id);

create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  game_type text not null,
  status text not null default 'waiting' check (status in ('waiting','playing','finished','expired')),
  current_round int not null default 0,
  total_rounds int not null check (total_rounds between 1 and 20),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours',
  finished_at timestamptz,
  next_room_id uuid references public.game_rooms(id) on delete set null
);
create index on public.game_rooms (relationship_id, status);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  is_ready boolean not null default false,
  answered_round int not null default 0,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round_number int not null,
  question_id uuid not null references public.game_questions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','open','revealed')),
  matched boolean,
  revealed_at timestamptz,
  unique (room_id, round_number)
);

create table public.game_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  question_id uuid not null references public.game_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 500),
  prediction text check (char_length(prediction) <= 500),
  points_awarded int not null default 0,
  submitted_at timestamptz not null default now(),
  constraint one_answer_per_round unique (round_id, user_id)
);
create index on public.game_answers (room_id);

create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_rooms r where r.id = p_room and public.is_member(r.relationship_id))
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.relationships enable row level security;
alter table public.relationship_members enable row level security;
alter table public.relationship_invites enable row level security;

create policy relationships_select on public.relationships for select to authenticated using (public.is_member(id));
create policy relationships_update on public.relationships for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy members_select on public.relationship_members for select to authenticated using (public.is_member(relationship_id));
create policy members_update_self on public.relationship_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy invites_select on public.relationship_invites for select to authenticated using (public.is_member(relationship_id));

-- Shared, fully collaborative tables
do $$
declare t text;
begin
  foreach t in array array['memories','timeline_events','reasons','songs','bucket_list','photo_strips'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(relationship_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_member(relationship_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_member(relationship_id)) with check (public.is_member(relationship_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_member(relationship_id))', t || '_delete', t);
  end loop;
end $$;

-- Letters: drafts are private to their author; the secret letter needs the secret unlocked.
alter table public.letters enable row level security;
create policy letters_select on public.letters for select to authenticated using (
  public.is_member(relationship_id)
  and (not is_draft or author_id = auth.uid())
  and (letter_type <> 'secret' or author_id = auth.uid() or public.has_unlocked('secret-letter'))
);
create policy letters_insert on public.letters for insert to authenticated with check (public.is_member(relationship_id));
create policy letters_update on public.letters for update to authenticated
  using (public.is_member(relationship_id) and author_id = auth.uid()) with check (public.is_member(relationship_id) and author_id = auth.uid());
create policy letters_delete on public.letters for delete to authenticated using (public.is_member(relationship_id) and author_id = auth.uid());

-- Time capsules: no one (not even the author) can read the message before unlock_at.
-- Sealed metadata is listed through list_time_capsules(). No update or delete policy exists, so a locked capsule cannot change.
alter table public.time_capsules enable row level security;
create policy capsules_select on public.time_capsules for select to authenticated
  using (public.is_member(relationship_id) and unlock_at <= now());
create policy capsules_insert on public.time_capsules for insert to authenticated
  with check (public.is_member(relationship_id) and unlock_at > now());

alter table public.surprise_unlocks enable row level security;
create policy unlocks_select on public.surprise_unlocks for select to authenticated using (public.is_member(relationship_id));
create policy unlocks_insert on public.surprise_unlocks for insert to authenticated
  with check (public.is_member(relationship_id) and user_id = auth.uid());

alter table public.secrets enable row level security;
create policy secrets_select on public.secrets for select to authenticated using (
  public.is_member(relationship_id) and (created_by = auth.uid() or public.has_unlocked(unlock_key))
);
create policy secrets_insert on public.secrets for insert to authenticated with check (public.is_member(relationship_id));
create policy secrets_update on public.secrets for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy secrets_delete on public.secrets for delete to authenticated using (created_by = auth.uid());

alter table public.user_preferences enable row level security;
create policy prefs_all on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.game_questions enable row level security;
create policy questions_select on public.game_questions for select to authenticated
  using (relationship_id is null or public.is_member(relationship_id));
create policy questions_insert on public.game_questions for insert to authenticated
  with check (relationship_id is not null and public.is_member(relationship_id));
create policy questions_update on public.game_questions for update to authenticated
  using (relationship_id is not null and public.is_member(relationship_id)) with check (relationship_id is not null and public.is_member(relationship_id));
create policy questions_delete on public.game_questions for delete to authenticated
  using (relationship_id is not null and public.is_member(relationship_id));

-- Game state tables are read-only to clients; every change goes through the functions below.
alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_answers enable row level security;
create policy rooms_select on public.game_rooms for select to authenticated using (public.is_member(relationship_id));
create policy players_select on public.game_players for select to authenticated using (public.is_room_member(room_id));
create policy rounds_select on public.game_rounds for select to authenticated using (public.is_room_member(room_id));
-- An answer is visible to its author, and to the partner only once the round has been revealed.
create policy answers_select on public.game_answers for select to authenticated using (
  user_id = auth.uid()
  or (public.is_room_member(room_id)
      and exists (select 1 from public.game_rounds r where r.id = round_id and r.status = 'revealed'))
);

-- ---------------------------------------------------------------------
-- Functions: onboarding
-- ---------------------------------------------------------------------
create or replace function public.create_relationship(p_name text, p_start_date date, p_display_name text, p_with_demo boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_rel uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if exists (select 1 from relationship_members where user_id = auth.uid()) then
    raise exception 'You already belong to a universe';
  end if;
  insert into relationships (name, start_date, anniversary_date)
    values (coalesce(nullif(btrim(p_name), ''), 'Our Little Universe'), coalesce(p_start_date, '2025-11-16'),
            (coalesce(p_start_date, '2025-11-16') + interval '1 year')::date)
    returning id into v_rel;
  insert into relationship_members (relationship_id, user_id, display_name, role)
    values (v_rel, auth.uid(), coalesce(nullif(btrim(p_display_name), ''), 'You'), 'owner');
  if p_with_demo then perform public.seed_demo_for(v_rel); end if;
  return v_rel;
end $$;

create or replace function public.create_invite(p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_rel uuid := public.my_relationship_id(); v_id uuid;
begin
  if v_rel is null then raise exception 'Create your universe first' using errcode = '42501'; end if;
  if (select count(*) from relationship_members where relationship_id = v_rel) >= 2 then
    raise exception 'Your universe already has two members';
  end if;
  insert into relationship_invites (relationship_id, email, invited_by)
    values (v_rel, lower(btrim(p_email)), auth.uid())
    on conflict (relationship_id, email) do update set created_at = now(), accepted_at = null
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.accept_pending_invite()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', '')); v_inv relationship_invites;
begin
  if auth.uid() is null or v_email = '' then return null; end if;
  if exists (select 1 from relationship_members where user_id = auth.uid()) then return public.my_relationship_id(); end if;
  select * into v_inv from relationship_invites where email = v_email and accepted_at is null order by created_at desc limit 1;
  if not found then return null; end if;
  insert into relationship_members (relationship_id, user_id, display_name, role)
    values (v_inv.relationship_id, auth.uid(), initcap(split_part(v_email, '@', 1)), 'member');
  update relationship_invites set accepted_at = now() where id = v_inv.id;
  return v_inv.relationship_id;
end $$;

create or replace function public.toggle_letter_favourite(p_letter uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v boolean;
begin
  update letters set is_favourite = not is_favourite
   where id = p_letter and public.is_member(relationship_id)
     and (not is_draft or author_id = auth.uid())
     and (letter_type <> 'secret' or author_id = auth.uid() or public.has_unlocked('secret-letter'))
   returning is_favourite into v;
  if not found then raise exception 'Letter not found'; end if;
  return v;
end $$;

create or replace function public.list_time_capsules()
returns table (id uuid, author_id uuid, title text, unlock_at timestamptz, created_at timestamptz,
               is_unlocked boolean, content text, attachment_path text)
language sql stable security definer set search_path = public as $$
  select c.id, c.author_id, c.title, c.unlock_at, c.created_at, c.unlock_at <= now(),
         case when c.unlock_at <= now() then c.content end,
         case when c.unlock_at <= now() then c.attachment_path end
  from public.time_capsules c
  where public.is_member(c.relationship_id)
  order by c.unlock_at
$$;

-- ---------------------------------------------------------------------
-- Functions: games (all state transitions lock the room row, so they are atomic)
-- ---------------------------------------------------------------------
create or replace function public.create_game_room(p_game_type text, p_rounds int default 5)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_rel uuid := public.my_relationship_id(); v_room uuid; v_n int;
begin
  if v_rel is null then raise exception 'You are not part of a universe yet' using errcode = '42501'; end if;
  if p_game_type not in ('who_knows','guess_my_answer','this_or_that','relationship_trivia',
                         'would_you_rather','finish_sentence','memory_challenge','compatibility') then
    raise exception 'Unknown game';
  end if;
  p_rounds := greatest(1, least(coalesce(p_rounds, 5), 20));
  update game_rooms set status = 'expired'
   where relationship_id = v_rel and status in ('waiting','playing') and expires_at < now();
  insert into game_rooms (relationship_id, game_type, total_rounds, created_by)
    values (v_rel, p_game_type, p_rounds, auth.uid()) returning id into v_room;
  insert into game_rounds (room_id, round_number, question_id)
    select v_room, row_number() over (), q.id
    from (select id from game_questions
           where game_type = p_game_type and (relationship_id is null or relationship_id = v_rel)
           order by random() limit p_rounds) q;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'There are no questions for this game yet. Add some first.'; end if;
  update game_rooms set total_rounds = v_n where id = v_room;
  insert into game_players (room_id, user_id) values (v_room, auth.uid());
  return v_room;
end $$;

create or replace function public.join_game_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  select * into r from game_rooms where id = p_room for update;
  if not found or not public.is_member(r.relationship_id) then raise exception 'Room not found' using errcode = '42501'; end if;
  if exists (select 1 from game_players where room_id = p_room and user_id = auth.uid()) then return; end if;
  if r.status <> 'waiting' then raise exception 'This game has already started'; end if;
  if r.expires_at < now() then raise exception 'This room has expired. Start a new one.'; end if;
  if (select count(*) from game_players where room_id = p_room) >= 2 then raise exception 'This room is full'; end if;
  insert into game_players (room_id, user_id) values (p_room, auth.uid());
end $$;

create or replace function public.set_player_ready(p_room uuid, p_ready boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r game_rooms; v_ready int; v_total int;
begin
  select * into r from game_rooms where id = p_room for update;
  if not found or not public.is_member(r.relationship_id) then raise exception 'Room not found' using errcode = '42501'; end if;
  if r.status <> 'waiting' then return; end if;
  update game_players set is_ready = p_ready where room_id = p_room and user_id = auth.uid();
  if not found then raise exception 'Join the room first'; end if;
  select count(*) filter (where is_ready), count(*) into v_ready, v_total from game_players where room_id = p_room;
  if v_total = 2 and v_ready = 2 then
    update game_rooms set status = 'playing', current_round = 1, expires_at = greatest(expires_at, now() + interval '6 hours')
     where id = p_room;
    update game_rounds set status = 'open' where room_id = p_room and round_number = 1;
  end if;
end $$;

create or replace function public.submit_game_answer(p_room uuid, p_answer text, p_prediction text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r game_rooms; rd game_rounds; q game_questions; a1 game_answers; a2 game_answers;
  v_answer text := nullif(btrim(coalesce(p_answer, '')), '');
  v_prediction text := nullif(btrim(coalesce(p_prediction, '')), '');
  v_matched boolean;
begin
  select * into r from game_rooms where id = p_room for update;
  if not found or not public.is_member(r.relationship_id) then raise exception 'Room not found' using errcode = '42501'; end if;
  if not exists (select 1 from game_players where room_id = p_room and user_id = auth.uid()) then
    raise exception 'You are not playing in this room' using errcode = '42501';
  end if;
  if r.status <> 'playing' then raise exception 'This game is not in progress'; end if;
  select * into rd from game_rounds where room_id = p_room and round_number = r.current_round;
  if rd.status <> 'open' then raise exception 'This round is already closed'; end if;
  if v_answer is null then raise exception 'Answer cannot be empty'; end if;
  select * into q from game_questions where id = rd.question_id;
  if q.game_type in ('who_knows','guess_my_answer') and v_prediction is null then
    raise exception 'Predict your partner''s answer too';
  end if;

  begin
    insert into game_answers (room_id, round_id, question_id, user_id, answer, prediction)
      values (p_room, rd.id, rd.question_id, auth.uid(), left(v_answer, 500), left(v_prediction, 500));
  exception when unique_violation then
    raise exception 'You already answered this round';
  end;
  update game_players set answered_round = r.current_round where room_id = p_room and user_id = auth.uid();

  if (select count(*) from game_answers where round_id = rd.id) = 2 then
    select * into a1 from game_answers where round_id = rd.id order by submitted_at, id limit 1;
    select * into a2 from game_answers where round_id = rd.id and id <> a1.id;

    if q.game_type in ('who_knows','guess_my_answer') then
      update game_answers ga set points_awarded =
        case when public.norm(ga.prediction) = public.norm(case when ga.user_id = a1.user_id then a2.answer else a1.answer end)
             then q.points else 0 end
       where ga.round_id = rd.id;
      v_matched := public.norm(a1.prediction) = public.norm(a2.answer) and public.norm(a2.prediction) = public.norm(a1.answer);
    elsif q.game_type in ('relationship_trivia','memory_challenge') and q.correct_answer is not null then
      update game_answers ga set points_awarded =
        case when public.norm(ga.answer) = public.norm(q.correct_answer) then q.points else 0 end
       where ga.round_id = rd.id;
      v_matched := public.norm(a1.answer) = public.norm(a2.answer);
    else
      v_matched := public.norm(a1.answer) = public.norm(a2.answer);
      update game_answers ga set points_awarded = case when v_matched then q.points else 0 end where ga.round_id = rd.id;
    end if;

    update game_players p set score = p.score + a.points_awarded
      from game_answers a where a.round_id = rd.id and a.user_id = p.user_id and p.room_id = p_room;
    update game_rounds set status = 'revealed', revealed_at = now(), matched = v_matched where id = rd.id;
  end if;
end $$;

-- Idempotent: both players can press "Next"; only the first call for a given round advances.
create or replace function public.advance_game_round(p_room uuid, p_from_round int)
returns void language plpgsql security definer set search_path = public as $$
declare r game_rooms; v_status text;
begin
  select * into r from game_rooms where id = p_room for update;
  if not found or not public.is_member(r.relationship_id) then raise exception 'Room not found' using errcode = '42501'; end if;
  if r.status <> 'playing' or r.current_round <> p_from_round then return; end if;
  select status into v_status from game_rounds where room_id = p_room and round_number = p_from_round;
  if v_status <> 'revealed' then raise exception 'Both players need to answer first'; end if;
  if p_from_round >= r.total_rounds then
    update game_rooms set status = 'finished', finished_at = now() where id = p_room;
  else
    update game_rooms set current_round = p_from_round + 1 where id = p_room;
    update game_rounds set status = 'open' where room_id = p_room and round_number = p_from_round + 1;
  end if;
end $$;

create or replace function public.rematch_game_room(p_room uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r game_rooms; v_new uuid;
begin
  select * into r from game_rooms where id = p_room for update;
  if not found or not public.is_member(r.relationship_id) then raise exception 'Room not found' using errcode = '42501'; end if;
  if r.next_room_id is not null then return r.next_room_id; end if;
  v_new := public.create_game_room(r.game_type, r.total_rounds);
  update game_rooms set next_room_id = v_new where id = p_room;
  return v_new;
end $$;

-- ---------------------------------------------------------------------
-- Storage: one private bucket; files live under <relationship_id>/...
-- capsules/ files open only after unlock; secrets/ files only for the author or after unlocking.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 26214400)
on conflict (id) do nothing;

create or replace function public.can_read_media(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/'); v_rel uuid;
begin
  begin v_rel := parts[1]::uuid; exception when others then return false; end;
  if not public.is_member(v_rel) then return false; end if;
  if parts[2] = 'capsules' then
    return exists (select 1 from time_capsules where attachment_path = p_name and unlock_at <= now());
  elsif parts[2] = 'secrets' then
    return exists (select 1 from secrets s where s.image_path = p_name and (s.created_by = auth.uid() or public.has_unlocked(s.unlock_key)))
        or not exists (select 1 from secrets s where s.image_path = p_name); -- the uploader can preview before saving
  end if;
  return true;
end $$;

create or replace function public.can_write_media(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_rel uuid;
begin
  begin v_rel := (string_to_array(p_name, '/'))[1]::uuid; exception when others then return false; end;
  return public.is_member(v_rel);
end $$;

create policy media_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.can_read_media(name));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.can_write_media(name));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- Realtime (game_answers, time_capsules and secrets are deliberately excluded)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.memories, public.timeline_events, public.letters, public.reasons, public.songs,
  public.bucket_list, public.photo_strips, public.game_rooms, public.game_players, public.game_rounds,
  public.surprise_unlocks;

-- Lock down function execution to signed-in users
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
