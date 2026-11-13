begin;

alter table public.game_questions drop constraint game_questions_game_type_check;
alter table public.game_questions add constraint game_questions_game_type_check
  check (game_type in ('who_knows','guess_my_answer','this_or_that','relationship_trivia',
                       'would_you_rather','finish_sentence','memory_challenge','compatibility','every_lifetime'));

insert into public.game_questions (relationship_id, game_type, question_text, points, sort_order)
values
  (null, 'every_lifetime', 'A record shop has three listening booths. Leave a line inside a record that only your person would recognize as yours.', 0, 1),
  (null, 'every_lifetime', 'If we got separated in a crowded city, where would you go to look for me? Leave one clue that would help me find that spot.', 0, 2),
  (null, 'every_lifetime', 'It’s 2076. Write a message from your future self. What would we still be laughing about fifty years from now?', 0, 3),
  (null, 'every_lifetime', 'In any lifetime, I’d know it was you because…', 0, 4);

create or replace function public.create_game_room(p_game_type text, p_rounds int default 5)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_rel uuid := public.my_relationship_id(); v_room uuid; v_n int;
begin
  if v_rel is null then raise exception 'You are not part of a universe yet' using errcode = '42501'; end if;
  if p_game_type not in ('who_knows','guess_my_answer','this_or_that','relationship_trivia',
                         'would_you_rather','finish_sentence','memory_challenge','compatibility','every_lifetime') then
    raise exception 'Unknown game';
  end if;
  p_rounds := greatest(1, least(coalesce(p_rounds, 5), 20));
  update game_rooms set status = 'expired'
   where relationship_id = v_rel and status in ('waiting','playing') and expires_at < now();
  insert into game_rooms (relationship_id, game_type, total_rounds, created_by)
    values (v_rel, p_game_type, p_rounds, auth.uid()) returning id into v_room;
  if p_game_type = 'every_lifetime' then
    insert into game_rounds (room_id, round_number, question_id)
      select v_room, q.sort_order, q.id
      from (
        select distinct on (sort_order) id, sort_order
        from game_questions
        where game_type = 'every_lifetime' and relationship_id is null
        order by sort_order, id
      ) q
      order by q.sort_order;
    get diagnostics v_n = row_count;
  else
    insert into game_rounds (room_id, round_number, question_id)
      select v_room, row_number() over (), q.id
      from (select id from game_questions
             where game_type = p_game_type and (relationship_id is null or relationship_id = v_rel)
             order by random() limit p_rounds) q;
    get diagnostics v_n = row_count;
  end if;
  if v_n = 0 then raise exception 'There are no questions for this game yet. Add some first.'; end if;
  update game_rooms set total_rounds = v_n where id = v_room;
  insert into game_players (room_id, user_id) values (v_room, auth.uid());
  return v_room;
end $$;

commit;
