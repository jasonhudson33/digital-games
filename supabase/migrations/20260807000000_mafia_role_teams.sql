-- Kings know the other Kings, and Jacks share a team during their night phase.
-- All other callers continue to receive only their own private role.
create or replace function public.mafia_get_role_team(
  room_code text,
  player_id text,
  player_token text
)
returns table(role_player_id text, role text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if not public.mafia_token_valid(room_code, player_id, player_token) then
    raise exception 'Invalid Mafia player identity';
  end if;

  select mafia_roles.role into caller_role
  from public.mafia_roles
  where mafia_roles.room_code = upper(trim(mafia_get_role_team.room_code))
    and mafia_roles.player_id = mafia_get_role_team.player_id;

  return query
  select mafia_roles.player_id, mafia_roles.role
  from public.mafia_roles
  where mafia_roles.room_code = upper(trim(mafia_get_role_team.room_code))
    and (
      mafia_roles.player_id = mafia_get_role_team.player_id
      or (caller_role in ('King', 'Jack') and mafia_roles.role = caller_role)
    )
  order by mafia_roles.player_id;
end;
$$;

revoke all on function public.mafia_get_role_team(text, text, text) from public;
grant execute on function public.mafia_get_role_team(text, text, text) to anon;
