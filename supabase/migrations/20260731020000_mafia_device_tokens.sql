create extension if not exists pgcrypto;

create table if not exists public.mafia_players (
  room_code text not null references public.mafia_rooms(code) on delete cascade,
  player_id text not null,
  token_hash text not null,
  created_at timestamptz not null default now(),
  primary key (room_code, player_id)
);

alter table public.mafia_players enable row level security;

create or replace function public.mafia_token_hash(token text)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(digest(token, 'sha256'), 'hex');
$$;

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
  );
$$;

create or replace function public.mafia_acting_host_id(target_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select player->>'id'
      from public.mafia_rooms room,
      jsonb_array_elements(coalesce(room.state->'players', '[]'::jsonb)) with ordinality as entry(player, position)
      where room.code = upper(trim(target_code))
        and coalesce((player->>'isAlive')::boolean, false)
        and coalesce((player->>'isHost')::boolean, false)
      order by position
      limit 1
    ),
    (
      select player->>'id'
      from public.mafia_rooms room,
      jsonb_array_elements(coalesce(room.state->'players', '[]'::jsonb)) with ordinality as entry(player, position)
      where room.code = upper(trim(target_code))
        and coalesce((player->>'isAlive')::boolean, false)
      order by position
      limit 1
    )
  );
$$;

create or replace function public.mafia_host_token_valid(target_code text, target_player text, token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.mafia_token_valid(target_code, target_player, token)
    and public.mafia_acting_host_id(target_code) = target_player;
$$;

drop policy if exists "authenticated players can find mafia rooms" on public.mafia_rooms;
drop policy if exists "hosts can create mafia rooms" on public.mafia_rooms;
drop policy if exists "acting hosts can update mafia state" on public.mafia_rooms;
drop policy if exists "players can read permitted mafia roles" on public.mafia_roles;
drop policy if exists "acting hosts can manage mafia roles" on public.mafia_roles;
drop policy if exists "players and hosts can read mafia requests" on public.mafia_requests;
drop policy if exists "players can submit mafia requests" on public.mafia_requests;
drop policy if exists "players can update mafia requests" on public.mafia_requests;
drop policy if exists "players and hosts can clear mafia requests" on public.mafia_requests;
drop policy if exists "players and hosts can read mafia intents" on public.mafia_intents;
drop policy if exists "players can submit mafia intents" on public.mafia_intents;
drop policy if exists "players can update mafia intents" on public.mafia_intents;
drop policy if exists "acting hosts can clear mafia intents" on public.mafia_intents;
drop policy if exists "players can read their detective result" on public.mafia_detective_results;
drop policy if exists "acting hosts can write detective results" on public.mafia_detective_results;

drop function if exists public.mafia_is_acting_host(text);

drop policy if exists "any device can find mafia rooms" on public.mafia_rooms;
create policy "any device can find mafia rooms" on public.mafia_rooms
for select to anon using (true);

revoke all on public.mafia_rooms from anon, authenticated;
revoke all on public.mafia_players from anon, authenticated;
revoke all on public.mafia_roles from anon, authenticated;
revoke all on public.mafia_requests from anon, authenticated;
revoke all on public.mafia_intents from anon, authenticated;
revoke all on public.mafia_detective_results from anon, authenticated;
grant select on public.mafia_rooms to anon;

create or replace function public.mafia_create_room(
  room_code text,
  room_state jsonb,
  room_meta jsonb,
  player_id text,
  player_token text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare normalized_code text := upper(trim(room_code));
begin
  if player_id is null or player_token is null or length(player_token) < 24 then
    raise exception 'Invalid Mafia player identity';
  end if;
  insert into public.mafia_rooms(code, state, meta, updated_at)
  values (normalized_code, room_state, room_meta, now());
  insert into public.mafia_players(room_code, player_id, token_hash)
  values (normalized_code, player_id, public.mafia_token_hash(player_token));
end;
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
  insert into public.mafia_players(room_code, player_id, token_hash)
  values (normalized_code, player_id, public.mafia_token_hash(player_token))
  on conflict (room_code, player_id) do nothing;
  if not public.mafia_token_valid(normalized_code, player_id, player_token) then
    raise exception 'Mafia player identity is already in use';
  end if;
end;
$$;

create or replace function public.mafia_save_state(room_code text, player_id text, player_token text, room_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can update Mafia state';
  end if;
  update public.mafia_rooms set state = room_state, updated_at = now()
  where code = upper(trim(room_code));
end;
$$;

create or replace function public.mafia_set_meta(room_code text, player_id text, player_token text, room_meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can update Mafia metadata';
  end if;
  update public.mafia_rooms set meta = room_meta, updated_at = now()
  where code = upper(trim(room_code));
end;
$$;

create or replace function public.mafia_set_roles(room_code text, player_id text, player_token text, roles jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can set Mafia roles';
  end if;
  delete from public.mafia_roles where mafia_roles.room_code = upper(trim(mafia_set_roles.room_code));
  insert into public.mafia_roles(room_code, player_id, role)
  select upper(trim(mafia_set_roles.room_code)), key, value
  from jsonb_each_text(roles);
end;
$$;

create or replace function public.mafia_get_role(room_code text, player_id text, player_token text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare found_role text;
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;
  select role into found_role from public.mafia_roles
  where mafia_roles.room_code = upper(trim(mafia_get_role.room_code))
    and mafia_roles.player_id = mafia_get_role.player_id;
  return found_role;
end;
$$;

create or replace function public.mafia_get_roles(room_code text, player_id text, player_token text)
returns table(role_player_id text, role text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can read all Mafia roles';
  end if;
  return query select mafia_roles.player_id, mafia_roles.role from public.mafia_roles
  where mafia_roles.room_code = upper(trim(mafia_get_roles.room_code))
  order by mafia_roles.player_id;
end;
$$;

create or replace function public.mafia_submit_request(
  room_code text, player_id text, player_token text, request_type text, payload jsonb
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
  insert into public.mafia_requests(room_code, player_id, request_type, payload, updated_at)
  values (upper(trim(room_code)), player_id, request_type, payload, now())
  on conflict (room_code, player_id, request_type)
  do update set payload = excluded.payload, updated_at = now();
end;
$$;

create or replace function public.mafia_get_requests(
  room_code text, player_id text, player_token text, requested_type text
)
returns table(request_player_id text, payload jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can read Mafia requests';
  end if;
  return query select mafia_requests.player_id, mafia_requests.payload from public.mafia_requests
  where mafia_requests.room_code = upper(trim(mafia_get_requests.room_code))
    and mafia_requests.request_type = mafia_get_requests.requested_type
  order by mafia_requests.player_id;
end;
$$;

create or replace function public.mafia_clear_request(
  room_code text, player_id text, player_token text, target_player_id text, requested_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_token_valid(room_code, player_id, player_token)
    or (player_id <> target_player_id and not public.mafia_host_token_valid(room_code, player_id, player_token)) then
    raise exception 'Not allowed to clear this Mafia request';
  end if;
  delete from public.mafia_requests
  where mafia_requests.room_code = upper(trim(mafia_clear_request.room_code))
    and mafia_requests.player_id = mafia_clear_request.target_player_id
    and mafia_requests.request_type = mafia_clear_request.requested_type;
end;
$$;

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
  insert into public.mafia_intents(room_code, round, intent_type, player_id, payload, updated_at)
  values (upper(trim(room_code)), intent_round, intent_type, player_id, payload, now())
  on conflict (room_code, round, intent_type, player_id)
  do update set payload = excluded.payload, updated_at = now();
end;
$$;

create or replace function public.mafia_get_intents(
  room_code text, player_id text, player_token text, intent_round integer, requested_type text
)
returns table(intent_player_id text, payload jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can read Mafia intents';
  end if;
  return query select mafia_intents.player_id, mafia_intents.payload from public.mafia_intents
  where mafia_intents.room_code = upper(trim(mafia_get_intents.room_code))
    and mafia_intents.round = mafia_get_intents.intent_round
    and mafia_intents.intent_type = mafia_get_intents.requested_type
  order by mafia_intents.player_id;
end;
$$;

create or replace function public.mafia_clear_round_intents(
  room_code text, player_id text, player_token text, intent_round integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can clear Mafia intents';
  end if;
  delete from public.mafia_intents
  where mafia_intents.room_code = upper(trim(mafia_clear_round_intents.room_code))
    and mafia_intents.round = mafia_clear_round_intents.intent_round;
end;
$$;

create or replace function public.mafia_set_detective_result(
  room_code text, player_id text, player_token text, intent_round integer, target_player_id text, result jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can set detective results';
  end if;
  insert into public.mafia_detective_results(room_code, round, player_id, result, updated_at)
  values (upper(trim(room_code)), intent_round, target_player_id, result, now())
  on conflict (room_code, round, player_id)
  do update set result = excluded.result, updated_at = now();
end;
$$;

create or replace function public.mafia_get_detective_result(
  room_code text, player_id text, player_token text, intent_round integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare found_result jsonb;
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;
  select result into found_result from public.mafia_detective_results
  where mafia_detective_results.room_code = upper(trim(mafia_get_detective_result.room_code))
    and mafia_detective_results.round = mafia_get_detective_result.intent_round
    and mafia_detective_results.player_id = mafia_get_detective_result.player_id;
  return found_result;
end;
$$;

revoke all on function public.mafia_token_hash(text) from public;
revoke all on function public.mafia_token_valid(text, text, text) from public;
revoke all on function public.mafia_acting_host_id(text) from public;
revoke all on function public.mafia_host_token_valid(text, text, text) from public;

revoke all on function public.mafia_create_room(text, jsonb, jsonb, text, text) from public;
revoke all on function public.mafia_register_player(text, text, text) from public;
revoke all on function public.mafia_save_state(text, text, text, jsonb) from public;
revoke all on function public.mafia_set_meta(text, text, text, jsonb) from public;
revoke all on function public.mafia_set_roles(text, text, text, jsonb) from public;
revoke all on function public.mafia_get_role(text, text, text) from public;
revoke all on function public.mafia_get_roles(text, text, text) from public;
revoke all on function public.mafia_submit_request(text, text, text, text, jsonb) from public;
revoke all on function public.mafia_get_requests(text, text, text, text) from public;
revoke all on function public.mafia_clear_request(text, text, text, text, text) from public;
revoke all on function public.mafia_submit_intent(text, text, text, integer, text, jsonb) from public;
revoke all on function public.mafia_get_intents(text, text, text, integer, text) from public;
revoke all on function public.mafia_clear_round_intents(text, text, text, integer) from public;
revoke all on function public.mafia_set_detective_result(text, text, text, integer, text, jsonb) from public;
revoke all on function public.mafia_get_detective_result(text, text, text, integer) from public;

grant execute on function public.mafia_create_room(text, jsonb, jsonb, text, text) to anon;
grant execute on function public.mafia_register_player(text, text, text) to anon;
grant execute on function public.mafia_save_state(text, text, text, jsonb) to anon;
grant execute on function public.mafia_set_meta(text, text, text, jsonb) to anon;
grant execute on function public.mafia_set_roles(text, text, text, jsonb) to anon;
grant execute on function public.mafia_get_role(text, text, text) to anon;
grant execute on function public.mafia_get_roles(text, text, text) to anon;
grant execute on function public.mafia_submit_request(text, text, text, text, jsonb) to anon;
grant execute on function public.mafia_get_requests(text, text, text, text) to anon;
grant execute on function public.mafia_clear_request(text, text, text, text, text) to anon;
grant execute on function public.mafia_submit_intent(text, text, text, integer, text, jsonb) to anon;
grant execute on function public.mafia_get_intents(text, text, text, integer, text) to anon;
grant execute on function public.mafia_clear_round_intents(text, text, text, integer) to anon;
grant execute on function public.mafia_set_detective_result(text, text, text, integer, text, jsonb) to anon;
grant execute on function public.mafia_get_detective_result(text, text, text, integer) to anon;
