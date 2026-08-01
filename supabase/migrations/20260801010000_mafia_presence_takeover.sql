alter table public.mafia_players
add column if not exists last_seen timestamptz not null default now();

create index if not exists mafia_players_last_seen_idx
on public.mafia_players(room_code, last_seen);

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
      and coalesce((player->>'isAlive')::boolean, false)
      and presence.last_seen > now() - interval '5 minutes'
  )
  select player_id
  from active_players
  order by is_host desc, position
  limit 1;
$$;

create or replace function public.mafia_register_player(room_code text, player_id text, player_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare normalized_code text := upper(trim(room_code));
begin
  if not exists (select 1 from public.mafia_rooms where code = normalized_code) then
    raise exception 'Mafia room not found';
  end if;
  insert into public.mafia_players(room_code, player_id, token_hash, last_seen)
  values (normalized_code, player_id, public.mafia_token_hash(player_token), now())
  on conflict on constraint mafia_players_pkey
  do update set last_seen = now();
  if not public.mafia_token_valid(normalized_code, player_id, player_token) then
    raise exception 'Mafia player identity is already in use';
  end if;
end;
$$;

create or replace function public.mafia_heartbeat(room_code text, player_id text, player_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;
  update public.mafia_players
  set last_seen = now()
  where mafia_players.room_code = upper(trim(mafia_heartbeat.room_code))
    and mafia_players.player_id = mafia_heartbeat.player_id;
end;
$$;

create or replace function public.mafia_get_presence(room_code text, player_id text, player_token text)
returns table(presence_player_id text, last_seen_ms bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;
  return query
  select mafia_players.player_id,
    floor(extract(epoch from mafia_players.last_seen) * 1000)::bigint
  from public.mafia_players
  where mafia_players.room_code = upper(trim(mafia_get_presence.room_code));
end;
$$;

revoke all on function public.mafia_heartbeat(text, text, text) from public;
revoke all on function public.mafia_get_presence(text, text, text) from public;
grant execute on function public.mafia_heartbeat(text, text, text) to anon;
grant execute on function public.mafia_get_presence(text, text, text) to anon;
