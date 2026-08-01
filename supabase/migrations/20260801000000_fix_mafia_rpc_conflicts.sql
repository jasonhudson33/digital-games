-- Use named constraints so PL/pgSQL parameters cannot conflict with column names.
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
  on conflict on constraint mafia_players_pkey do nothing;
  if not public.mafia_token_valid(normalized_code, player_id, player_token) then
    raise exception 'Mafia player identity is already in use';
  end if;
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
  on conflict on constraint mafia_requests_pkey
  do update set payload = excluded.payload, updated_at = now();
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
  on conflict on constraint mafia_intents_pkey
  do update set payload = excluded.payload, updated_at = now();
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
  on conflict on constraint mafia_detective_results_pkey
  do update set result = excluded.result, updated_at = now();
end;
$$;
