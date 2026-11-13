create or replace function public.partner_boarding_checkin()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select prefs.boarding_checkin
  from public.relationship_members viewer
  join public.relationship_members passenger
    on passenger.relationship_id = viewer.relationship_id
  join auth.users account on account.id = passenger.user_id
  join public.user_preferences prefs on prefs.user_id = passenger.user_id
  where viewer.user_id = auth.uid()
    and lower(account.email) = 'yuktasoni05@gmail.com'
  limit 1
$$;

revoke all on function public.partner_boarding_checkin() from public, anon;
grant execute on function public.partner_boarding_checkin() to authenticated;
