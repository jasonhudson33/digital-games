create table if not exists public.mafia_rooms (
  code text primary key,
  state jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mafia_roles (
  room_code text not null references public.mafia_rooms(code) on delete cascade,
  player_id text not null,
  role text not null,
  primary key (room_code, player_id)
);

create table if not exists public.mafia_requests (
  room_code text not null references public.mafia_rooms(code) on delete cascade,
  player_id text not null,
  request_type text not null check (request_type in ('join', 'leave')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (room_code, player_id, request_type)
);

create table if not exists public.mafia_intents (
  room_code text not null references public.mafia_rooms(code) on delete cascade,
  round integer not null,
  intent_type text not null check (intent_type in ('ready', 'night', 'day')),
  player_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (room_code, round, intent_type, player_id)
);

create table if not exists public.mafia_detective_results (
  room_code text not null references public.mafia_rooms(code) on delete cascade,
  round integer not null,
  player_id text not null,
  result jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (room_code, round, player_id)
);

create or replace function public.mafia_is_acting_host(target_code text)
returns boolean
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
      where room.code = target_code
        and coalesce((player->>'isAlive')::boolean, false)
        and coalesce((player->>'isHost')::boolean, false)
      order by position
      limit 1
    ),
    (
      select player->>'id'
      from public.mafia_rooms room,
      jsonb_array_elements(coalesce(room.state->'players', '[]'::jsonb)) with ordinality as entry(player, position)
      where room.code = target_code
        and coalesce((player->>'isAlive')::boolean, false)
      order by position
      limit 1
    )
  ) = auth.uid()::text;
$$;

revoke all on function public.mafia_is_acting_host(text) from public;
grant execute on function public.mafia_is_acting_host(text) to authenticated;

alter table public.mafia_rooms enable row level security;
alter table public.mafia_roles enable row level security;
alter table public.mafia_requests enable row level security;
alter table public.mafia_intents enable row level security;
alter table public.mafia_detective_results enable row level security;

drop policy if exists "authenticated players can find mafia rooms" on public.mafia_rooms;
create policy "authenticated players can find mafia rooms" on public.mafia_rooms
for select to authenticated using (true);

drop policy if exists "hosts can create mafia rooms" on public.mafia_rooms;
create policy "hosts can create mafia rooms" on public.mafia_rooms
for insert to authenticated with check (meta->>'hostUid' = auth.uid()::text);

drop policy if exists "acting hosts can update mafia state" on public.mafia_rooms;
create policy "acting hosts can update mafia state" on public.mafia_rooms
for update to authenticated
using (
  meta->>'hostUid' = auth.uid()::text
  or public.mafia_is_acting_host(code)
)
with check (
  meta->>'hostUid' = auth.uid()::text
  or public.mafia_is_acting_host(code)
);

drop policy if exists "players can read permitted mafia roles" on public.mafia_roles;
create policy "players can read permitted mafia roles" on public.mafia_roles
for select to authenticated
using (player_id = auth.uid()::text or public.mafia_is_acting_host(room_code));

drop policy if exists "acting hosts can manage mafia roles" on public.mafia_roles;
create policy "acting hosts can manage mafia roles" on public.mafia_roles
for all to authenticated
using (public.mafia_is_acting_host(room_code))
with check (public.mafia_is_acting_host(room_code));

drop policy if exists "players and hosts can read mafia requests" on public.mafia_requests;
create policy "players and hosts can read mafia requests" on public.mafia_requests
for select to authenticated
using (player_id = auth.uid()::text or public.mafia_is_acting_host(room_code));

drop policy if exists "players can submit mafia requests" on public.mafia_requests;
create policy "players can submit mafia requests" on public.mafia_requests
for insert to authenticated with check (player_id = auth.uid()::text);

drop policy if exists "players can update mafia requests" on public.mafia_requests;
create policy "players can update mafia requests" on public.mafia_requests
for update to authenticated
using (player_id = auth.uid()::text)
with check (player_id = auth.uid()::text);

drop policy if exists "players and hosts can clear mafia requests" on public.mafia_requests;
create policy "players and hosts can clear mafia requests" on public.mafia_requests
for delete to authenticated
using (player_id = auth.uid()::text or public.mafia_is_acting_host(room_code));

drop policy if exists "players and hosts can read mafia intents" on public.mafia_intents;
create policy "players and hosts can read mafia intents" on public.mafia_intents
for select to authenticated
using (player_id = auth.uid()::text or public.mafia_is_acting_host(room_code));

drop policy if exists "players can submit mafia intents" on public.mafia_intents;
create policy "players can submit mafia intents" on public.mafia_intents
for insert to authenticated with check (player_id = auth.uid()::text);

drop policy if exists "players can update mafia intents" on public.mafia_intents;
create policy "players can update mafia intents" on public.mafia_intents
for update to authenticated
using (player_id = auth.uid()::text)
with check (player_id = auth.uid()::text);

drop policy if exists "acting hosts can clear mafia intents" on public.mafia_intents;
create policy "acting hosts can clear mafia intents" on public.mafia_intents
for delete to authenticated using (public.mafia_is_acting_host(room_code));

drop policy if exists "players can read their detective result" on public.mafia_detective_results;
create policy "players can read their detective result" on public.mafia_detective_results
for select to authenticated
using (player_id = auth.uid()::text or public.mafia_is_acting_host(room_code));

drop policy if exists "acting hosts can write detective results" on public.mafia_detective_results;
create policy "acting hosts can write detective results" on public.mafia_detective_results
for all to authenticated
using (public.mafia_is_acting_host(room_code))
with check (public.mafia_is_acting_host(room_code));

grant select, insert, update on public.mafia_rooms to authenticated;
grant select, insert, update, delete on public.mafia_roles to authenticated;
grant select, insert, update, delete on public.mafia_requests to authenticated;
grant select, insert, update, delete on public.mafia_intents to authenticated;
grant select, insert, update, delete on public.mafia_detective_results to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'mafia_rooms',
    'mafia_roles',
    'mafia_requests',
    'mafia_intents',
    'mafia_detective_results'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
