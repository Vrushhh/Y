-- The existing user_preferences RLS policy limits this data to its owner.
alter table public.user_preferences
  add column if not exists boarding_checkin jsonb;

notify pgrst, 'reload schema';
