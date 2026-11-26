-- The first player stays acting host for the whole game, alive or eliminated.
-- Host-flagged player first, then seat order; players who left or were revoked
-- never host, and a player must have been seen within the last 5 minutes.
create or replace function public.mafia_acting_host_id(target_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with active_players as (
    select player->>'id' as player_id,
      coalesce((player->>'isHost')::boolean, false) as is_host,
      entry.position
    from public.mafia_rooms room
    cross join lateral jsonb_array_elements(coalesce(room.state->'players', '[]'::jsonb))
      with ordinality as entry(player, position)
    join public.mafia_players presence
      on presence.room_code = room.code
      and presence.player_id = player->>'id'
    where room.code = upper(trim(target_code))
      and not coalesce((player->>'hasLeft')::boolean, false)
      and not presence.access_revoked
      and presence.last_seen > now() - interval '5 minutes'
  )
  select player_id
  from active_players
  order by is_host desc, position
  limit 1;
$$;
