-- Storage read rule for year-one-post-credits
-- Requires relationship membership AND all five Secret Corner unlocks:
-- 'moon', 'constellation', 'game-champion', 'hidden-memory', 'secret-letter'
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
  elsif parts[2] = 'year-one-post-credits' then
    return public.has_unlocked('moon')
       and public.has_unlocked('constellation')
       and public.has_unlocked('game-champion')
       and public.has_unlocked('hidden-memory')
       and public.has_unlocked('secret-letter');
  end if;
  return true;
end $$;

