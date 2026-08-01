alter table public.mafia_players
add column if not exists access_revoked boolean not null default false;

create or replace function public.mafia_token_valid(target_code text, target_player text, token text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.mafia_players
    where room_code = upper(trim(target_code))
      and player_id = target_player
      and token_hash = public.mafia_token_hash(token)
      and not access_revoked
  );
$$;

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
      and not coalesce((player->>'hasLeft')::boolean, false)
      and not presence.access_revoked
      and presence.last_seen > now() - interval '5 minutes'
  )
  select player_id
  from active_players
  order by is_host desc, position
  limit 1;
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
  where mafia_players.room_code = upper(trim(mafia_get_presence.room_code))
    and not mafia_players.access_revoked;
end;
$$;

create or replace function public.mafia_leave_room(room_code text, player_id text, player_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;

  delete from public.mafia_requests
  where mafia_requests.room_code = upper(trim(mafia_leave_room.room_code))
    and mafia_requests.player_id = mafia_leave_room.player_id
    and mafia_requests.request_type = 'join';

  insert into public.mafia_requests(room_code, player_id, request_type, payload, updated_at)
  values (
    upper(trim(room_code)),
    player_id,
    'leave',
    jsonb_build_object('ts', floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
    now()
  )
  on conflict on constraint mafia_requests_pkey
  do update set payload = excluded.payload, updated_at = now();

  update public.mafia_players
  set access_revoked = true,
    last_seen = '-infinity'::timestamptz
  where mafia_players.room_code = upper(trim(mafia_leave_room.room_code))
    and mafia_players.player_id = mafia_leave_room.player_id;
end;
$$;

revoke all on function public.mafia_leave_room(text, text, text) from public;
grant execute on function public.mafia_leave_room(text, text, text) to anon;
