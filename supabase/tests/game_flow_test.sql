-- Integration test: two players, answer privacy, atomic reveal, scoring, capsules.
\set ON_ERROR_STOP on
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@example.com'),
                              ('22222222-2222-2222-2222-222222222222','b@example.com'),
                              ('33333333-3333-3333-3333-333333333333','intruder@example.com');

create or replace function pg_temp.as_user(uid text, email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email, 'role','authenticated')::text, false);
end $$;

set role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
select public.create_relationship('Test Universe', '2025-11-16', 'A', true) is not null as created;
select count(*) = 4 as demo_memories from memories;
select public.create_invite('B@example.com') is not null as invited;

-- B accepts invite
select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select public.accept_pending_invite() is not null as accepted;
select count(*) = 2 as two_members from relationship_members;

-- Intruder sees nothing and cannot join
select pg_temp.as_user('33333333-3333-3333-3333-333333333333','intruder@example.com');
select public.accept_pending_invite() is null as intruder_no_invite;
select count(*) = 0 as intruder_sees_no_memories from memories;

-- A creates a this_or_that room (2 rounds)
select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
create temp table ctx as select public.create_game_room('this_or_that', 2) as room;
grant all on ctx to authenticated;

select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select public.join_game_room((select room from ctx));
select public.set_player_ready((select room from ctx), true);
select status = 'waiting' as still_waiting from game_rooms where id = (select room from ctx);

select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
select public.set_player_ready((select room from ctx), true);
select status = 'playing' and current_round = 1 as started from game_rooms where id = (select room from ctx);

-- A answers round 1 with the first option
select public.submit_game_answer((select room from ctx),
  (select q.options->>0 from game_rounds r join game_questions q on q.id = r.question_id where r.room_id = (select room from ctx) and r.round_number = 1), null);

-- B must NOT see A's answer yet
select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select count(*) = 0 as answer_hidden_from_partner from game_answers where room_id = (select room from ctx);
select answered_round = 1 as partner_progress_visible from game_players where room_id = (select room from ctx) and user_id = '11111111-1111-1111-1111-111111111111';

-- Advance before reveal is refused
do $$ begin
  perform public.advance_game_round((select room from ctx), 1);
  raise exception 'advance should have failed';
exception when others then
  if sqlerrm not like 'Both players%' then raise; end if;
end $$;

-- B answers the same option -> reveal, both score
select public.submit_game_answer((select room from ctx),
  (select q.options->>0 from game_rounds r join game_questions q on q.id = r.question_id where r.room_id = (select room from ctx) and r.round_number = 1), null);
select count(*) = 2 as both_answers_visible_after_reveal from game_answers where room_id = (select room from ctx);
select status = 'revealed' and matched as revealed_matched from game_rounds where room_id = (select room from ctx) and round_number = 1;
select bool_and(score = 5) as both_scored from game_players where room_id = (select room from ctx);

-- Duplicate submission rejected
do $$ begin
  perform public.submit_game_answer((select room from ctx), 'again', null);
  raise exception 'duplicate should have failed';
exception when others then
  if sqlerrm not like '%closed%' and sqlerrm not like '%already%' then raise; end if;
end $$;

-- Both press next: only one advance happens
select public.advance_game_round((select room from ctx), 1);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
select public.advance_game_round((select room from ctx), 1);
select current_round = 2 as advanced_once from game_rooms where id = (select room from ctx);

-- Clients cannot write game state directly
do $$ begin
  update game_players set score = 999;
  if exists (select 1 from game_players where score = 999) then raise exception 'direct score write allowed'; end if;
end $$;
do $$ begin
  insert into game_answers (room_id, round_id, question_id, user_id, answer)
    select room_id, id, question_id, auth.uid(), 'x' from game_rounds where room_id = (select room from ctx) and round_number = 2;
  raise exception 'direct answer insert allowed';
exception when insufficient_privilege then null;
end $$;

-- Round 2: different answers, then finish
select public.submit_game_answer((select room from ctx),
  (select q.options->>0 from game_rounds r join game_questions q on q.id = r.question_id where r.room_id = (select room from ctx) and r.round_number = 2), null);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select public.submit_game_answer((select room from ctx),
  (select q.options->>1 from game_rounds r join game_questions q on q.id = r.question_id where r.room_id = (select room from ctx) and r.round_number = 2), null);
select not matched as round2_differs from game_rounds where room_id = (select room from ctx) and round_number = 2;
select public.advance_game_round((select room from ctx), 2);
select status = 'finished' as finished from game_rooms where id = (select room from ctx);
select public.rematch_game_room((select room from ctx)) = public.rematch_game_room((select room from ctx)) as rematch_idempotent;

-- Who knows: predictions scored against partner's real answer
truncate ctx; insert into ctx select public.create_game_room('who_knows', 1);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
select public.join_game_room((select room from ctx));
select public.set_player_ready((select room from ctx), true);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select public.set_player_ready((select room from ctx), true);
select public.submit_game_answer((select room from ctx), 'Cat', 'Dog');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
select public.submit_game_answer((select room from ctx), 'Dog', 'Fish');
select (select score from game_players where room_id=(select room from ctx) and user_id='22222222-2222-2222-2222-222222222222') = 10
   and (select score from game_players where room_id=(select room from ctx) and user_id='11111111-1111-1111-1111-111111111111') = 0 as prediction_scoring;

-- Time capsule: sealed from both people until unlock
insert into time_capsules (title, content, unlock_at) values ('Later', 'secret words', now() + interval '1 day');
select count(*) = 0 as capsule_hidden_from_author from time_capsules;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select count(*) = 0 as capsule_hidden_from_partner from time_capsules;
select count(*) = 1 and bool_and(content is null) as capsule_listed_sealed from public.list_time_capsules();
do $$ begin
  update time_capsules set unlock_at = now() - interval '1 day';
  if exists (select 1 from public.list_time_capsules() where is_unlocked) then raise exception 'capsule unlocked by update'; end if;
end $$;
do $$ begin
  insert into time_capsules (content, unlock_at) values ('past', now() - interval '1 hour');
  raise exception 'past unlock allowed';
exception when insufficient_privilege or check_violation then null;
end $$;

-- Letter drafts private; secret letter gated
select pg_temp.as_user('11111111-1111-1111-1111-111111111111','a@example.com');
insert into letters (title, content, letter_type, is_draft) values ('Draft', 'wip', 'unsaid', true);
insert into letters (title, content, letter_type) values ('Secret', 'shh', 'secret');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222','b@example.com');
select count(*) = 0 as draft_hidden from letters where title = 'Draft';
select count(*) = 0 as secret_letter_locked from letters where title = 'Secret';
insert into surprise_unlocks (unlock_key) values ('secret-letter');
select count(*) = 1 as secret_letter_unlocked from letters where title = 'Secret';

-- Author cannot be spoofed
insert into reasons (content, author_id) values ('spoof', '11111111-1111-1111-1111-111111111111');
select author_id = '22222222-2222-2222-2222-222222222222' as author_enforced from reasons where content = 'spoof';

-- A third member is impossible
reset role;
do $$ begin
  insert into relationship_members (relationship_id, user_id) select id, '33333333-3333-3333-3333-333333333333' from relationships;
  raise exception 'third member allowed';
exception when raise_exception then
  if sqlerrm not like '%two members%' then raise; end if;
end $$;
select 'ALL GAME/PRIVACY TESTS RAN' as result;
