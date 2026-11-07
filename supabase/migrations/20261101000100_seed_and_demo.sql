-- =====================================================================
-- Built-in game questions + demo content generator.
-- Demo rows are flagged is_demo = true and can be removed from Settings.
-- Nothing here describes the real couple; every demo row says it is a placeholder.
-- =====================================================================

insert into public.game_questions (game_type, question_text, options, correct_answer, points, sort_order) values
-- Who knows whom better: answer for yourself, then predict your partner
('who_knows', 'Your ideal lazy Sunday?', '["Sleeping in","A long brunch","A day trip","Movies all day"]', null, 10, 1),
('who_knows', 'Comfort food after a long day?', '["Momos","Pizza","Biryani","Something sweet"]', null, 10, 2),
('who_knows', 'Which superpower would you pick?', '["Teleportation","Reading minds","Pausing time","Flying"]', null, 10, 3),
('who_knows', 'Best way to cheer you up?', '["A long hug","Food","A silly video","Space and quiet"]', null, 10, 4),
('who_knows', 'Your dream holiday?', '["Mountains","Beach","A big city","A quiet village"]', null, 10, 5),
('who_knows', 'What do you do first in the morning?', '["Check the phone","Coffee or tea","Snooze again","Stretch"]', null, 10, 6),
('who_knows', 'Pick a pet', '["Dog","Cat","Fish","No pets"]', null, 10, 7),
('who_knows', 'Your love language?', '["Words","Quality time","Gifts","Acts of service","Touch"]', null, 10, 8),
-- Guess my answer: free text, answer + prediction
('guess_my_answer', 'One word that describes our first year', '[]', null, 10, 1),
('guess_my_answer', 'A song you would dedicate to me right now', '[]', null, 10, 2),
('guess_my_answer', 'The city you most want to visit together', '[]', null, 10, 3),
('guess_my_answer', 'Your favourite colour', '[]', null, 10, 4),
('guess_my_answer', 'The dish you could eat every day', '[]', null, 10, 5),
('guess_my_answer', 'Your go-to karaoke song', '[]', null, 10, 6),
-- This or that
('this_or_that', 'Sunrise or sunset?', '["Sunrise","Sunset"]', null, 5, 1),
('this_or_that', 'Tea or coffee?', '["Tea","Coffee"]', null, 5, 2),
('this_or_that', 'Mountains or beaches?', '["Mountains","Beaches"]', null, 5, 3),
('this_or_that', 'Calls or texts?', '["Calls","Texts"]', null, 5, 4),
('this_or_that', 'Stay in or go out?', '["Stay in","Go out"]', null, 5, 5),
('this_or_that', 'Rain or sunshine?', '["Rain","Sunshine"]', null, 5, 6),
('this_or_that', 'Books or movies?', '["Books","Movies"]', null, 5, 7),
('this_or_that', 'Sweet or savoury?', '["Sweet","Savoury"]', null, 5, 8),
-- Relationship trivia (answers come from your start date; add your own in Date Mode)
('relationship_trivia', 'In which month did our story begin?', '["October","November","December","January"]', 'November', 10, 1),
('relationship_trivia', 'On which day do we celebrate our anniversary?', '["14th","15th","16th","18th"]', '16th', 10, 2),
('relationship_trivia', 'In which year did we start?', '["2024","2025","2026","2023"]', '2025', 10, 3),
('relationship_trivia', 'How many days are in our first year together?', '["364","365","366","360"]', '365', 10, 4),
('relationship_trivia', 'Demo: replace me with a question only you two can answer', '["Option A","Option B","Option C"]', null, 10, 5),
-- Would you rather
('would_you_rather', 'Would you rather have a surprise trip or a planned one?', '["Surprise trip","Planned trip"]', null, 5, 1),
('would_you_rather', 'Would you rather cook together or order in?', '["Cook together","Order in"]', null, 5, 2),
('would_you_rather', 'Would you rather relive our first date or skip ahead ten years?', '["Relive our first date","See us in ten years"]', null, 5, 3),
('would_you_rather', 'Would you rather a road trip or a train journey?', '["Road trip","Train journey"]', null, 5, 4),
('would_you_rather', 'Would you rather stargaze or watch city lights?', '["Stargaze","City lights"]', null, 5, 5),
('would_you_rather', 'Would you rather get a handwritten letter or a long voice note?', '["Handwritten letter","Voice note"]', null, 5, 6),
-- Finish my sentence
('finish_sentence', 'The moment I knew I liked you was…', '[]', null, 5, 1),
('finish_sentence', 'Our perfect date night is…', '[]', null, 5, 2),
('finish_sentence', 'In five years, we will…', '[]', null, 5, 3),
('finish_sentence', 'You make me laugh most when…', '[]', null, 5, 4),
('finish_sentence', 'My favourite thing about us is…', '[]', null, 5, 5),
-- Memory challenge (add photo questions of your own from Date Mode)
('memory_challenge', 'Think of our very first photo together. Which season was it?', '["Autumn","Winter","Spring","Summer"]', null, 10, 1),
('memory_challenge', 'Where did we spend most of our first month?', '["Out and about","Cafés","On calls","At home"]', null, 10, 2),
('memory_challenge', 'Which did we do first?', '["Watch a movie","Share a meal","Take a walk","Take a photo"]', null, 10, 3),
-- Compatibility
('compatibility', 'How do you like to spend a birthday?', '["Big party","Small dinner","Just us two","Travelling"]', null, 10, 1),
('compatibility', 'When there is a disagreement, you prefer to…', '["Talk it out now","Cool off first","Write it down","Hug first, talk later"]', null, 10, 2),
('compatibility', 'Where would you like to live someday?', '["Big city","Small town","Hills","By the sea"]', null, 10, 3),
('compatibility', 'Ideal number of holidays a year?', '["One big one","Two or three","Lots of short ones","Spontaneous only"]', null, 10, 4),
('compatibility', 'Saving or spending on experiences?', '["Saving","Experiences"]', null, 10, 5),
('compatibility', 'Morning person or night owl?', '["Morning person","Night owl"]', null, 10, 6);

create or replace function public.seed_demo_for(p_rel uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into memories (relationship_id, title, description, location_name, latitude, longitude, memory_date, category, is_demo) values
    (p_rel, 'Demo: where we first met', 'Placeholder. Tap edit to add the real place, date, and the story of that day.', 'Add the real place', 20.5937, 78.9629, '2025-11-16', 'first_meeting', true),
    (p_rel, 'Demo: our first date', 'Placeholder for your first date. Add photos and what you ordered.', 'Add the real place', 21.2, 79.6, null, 'first_date', true),
    (p_rel, 'Demo: a favourite spot', 'Placeholder for the place you keep going back to.', 'Add the real place', 19.8, 78.1, null, 'favourite_place', true),
    (p_rel, 'Demo: somewhere we want to go', 'A future destination. Pin the real one.', 'Dream destination', 22.4, 80.9, null, 'future_destination', true);

  insert into timeline_events (relationship_id, title, description, event_date, category, is_demo) values
    (p_rel, 'The day it all began', 'Demo text. Replace with how your story started.', '2025-11-16', 'firsts', true),
    (p_rel, 'Demo: first trip together', 'Placeholder. Add the real date, photos or a voice note.', '2026-02-14', 'trips', true),
    (p_rel, 'Demo: a celebration', 'Placeholder for a birthday, festival or small win.', '2026-06-01', 'celebrations', true),
    (p_rel, 'Our first anniversary', 'One year. Edit this once the day arrives.', '2026-11-16', 'celebrations', true);

  insert into reasons (relationship_id, content, is_demo) values
    (p_rel, 'Demo reason: replace me with something only you would notice about them.', true),
    (p_rel, 'Demo reason: the small habit of theirs you secretly love.', true),
    (p_rel, 'Demo reason: a moment when they made a hard day easier.', true),
    (p_rel, 'Demo reason: what their laugh sounds like to you.', true),
    (p_rel, 'Demo reason: something they taught you.', true);

  insert into songs (relationship_id, title, artist, memory_note, is_demo) values
    (p_rel, 'Demo: the song from our first drive', 'Add the artist', 'Replace with your real song and paste a Spotify or YouTube link.', true),
    (p_rel, 'Demo: the one that is always stuck in our heads', 'Add the artist', 'Placeholder.', true);

  insert into bucket_list (relationship_id, title, category, notes, is_demo) values
    (p_rel, 'Demo: watch a sunrise from a hilltop', 'experiences', 'Placeholder goal. Edit or delete.', true),
    (p_rel, 'Demo: a trip just for the two of us', 'places', null, true),
    (p_rel, 'Demo: the restaurant we keep talking about', 'restaurants', null, true),
    (p_rel, 'Demo: celebrate our second anniversary somewhere new', 'celebrations', null, true);

  insert into letters (relationship_id, title, content, letter_type, is_demo) values
    (p_rel, 'Demo: our anniversary letter', E'This is a placeholder.\n\nWrite the real letter from the Letters page. Drafts stay private until you publish them.', 'anniversary', true);
end $$;

create or replace function public.seed_demo_content()
returns void language plpgsql security definer set search_path = public as $$
declare v_rel uuid := public.my_relationship_id();
begin
  if v_rel is null then raise exception 'Not a member' using errcode = '42501'; end if;
  perform public.seed_demo_for(v_rel);
end $$;

create or replace function public.clear_demo_content()
returns void language plpgsql security definer set search_path = public as $$
declare v_rel uuid := public.my_relationship_id();
begin
  if v_rel is null then raise exception 'Not a member' using errcode = '42501'; end if;
  delete from memories where relationship_id = v_rel and is_demo;
  delete from timeline_events where relationship_id = v_rel and is_demo;
  delete from reasons where relationship_id = v_rel and is_demo;
  delete from songs where relationship_id = v_rel and is_demo;
  delete from bucket_list where relationship_id = v_rel and is_demo;
  delete from letters where relationship_id = v_rel and is_demo;
end $$;

revoke execute on function public.seed_demo_for(uuid) from public, anon, authenticated;
revoke execute on all functions in schema public from anon;
grant execute on function public.seed_demo_content() to authenticated;
grant execute on function public.clear_demo_content() to authenticated;
