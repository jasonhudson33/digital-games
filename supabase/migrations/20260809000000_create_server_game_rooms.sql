create table if not exists public.server_game_rooms (
  game text not null,
  code text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (game, code)
);

create index if not exists server_game_rooms_expires_at_idx
on public.server_game_rooms (expires_at);

comment on table public.server_game_rooms is
  'Private server-authoritative room state for Seven Up, Scum, Hand and Foot, and Pinochle.';

alter table public.server_game_rooms enable row level security;
alter table public.server_game_rooms force row level security;

-- Full room state includes private cards and reconnect credentials. Browser roles
-- intentionally receive no policy or table privilege; only the server service role
-- may access these rows.
revoke all on table public.server_game_rooms from public, anon, authenticated;
grant select, insert, update, delete on table public.server_game_rooms to service_role;
