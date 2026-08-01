create or replace function public.mafia_submit_intent(
  room_code text, player_id text, player_token text, intent_round integer, intent_type text, payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;

  if intent_type = 'day' and not exists (
    select 1
    from public.mafia_rooms room
    cross join lateral jsonb_array_elements(coalesce(room.state->'players', '[]'::jsonb)) as entry(player)
    where room.code = upper(trim(mafia_submit_intent.room_code))
      and player->>'id' = mafia_submit_intent.player_id
      and coalesce((player->>'isAlive')::boolean, false)
      and not coalesce((player->>'hasLeft')::boolean, false)
  ) then
    raise exception 'Eliminated Mafia players cannot participate in daytime actions';
  end if;

  insert into public.mafia_intents(room_code, round, intent_type, player_id, payload, updated_at)
  values (upper(trim(room_code)), intent_round, intent_type, player_id, payload, now())
  on conflict on constraint mafia_intents_pkey
  do update set payload = excluded.payload, updated_at = now();
end;
$$;

revoke all on function public.mafia_submit_intent(text, text, text, integer, text, jsonb) from public;
grant execute on function public.mafia_submit_intent(text, text, text, integer, text, jsonb) to anon;
