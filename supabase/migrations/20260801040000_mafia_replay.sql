create or replace function public.mafia_reset_game_data(room_code text, player_id text, player_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mafia_host_token_valid(room_code, player_id, player_token) then
    raise exception 'Only the acting host can reset Mafia game data';
  end if;

  delete from public.mafia_intents
  where mafia_intents.room_code = upper(trim(mafia_reset_game_data.room_code));

  delete from public.mafia_detective_results
  where mafia_detective_results.room_code = upper(trim(mafia_reset_game_data.room_code));

  delete from public.mafia_roles
  where mafia_roles.room_code = upper(trim(mafia_reset_game_data.room_code));
end;
$$;

revoke all on function public.mafia_reset_game_data(text, text, text) from public;
grant execute on function public.mafia_reset_game_data(text, text, text) to anon;
