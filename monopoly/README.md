# Monopoly Online

A small online Monopoly-inspired board game mounted inside the Digital Games Next.js app.

## Run Locally

```bash
cd /Users/hudfam/code/digital-games
npm install
npm run dev
```

Open [http://localhost:3000/monopoly](http://localhost:3000/monopoly), create a room, and share the room code or URL with another player.

## Online Play

The app works immediately in a local hot-seat mode. During local development, rooms are stored by the Digital Games Next.js API and sync between open tabs with `BroadcastChannel` plus a lightweight polling fallback.

To sync between devices, add Supabase values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Create a `monopoly_rooms` table:

```sql
create table if not exists public.monopoly_rooms (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.monopoly_rooms enable row level security;

create policy "rooms are readable"
on public.monopoly_rooms for select
using (true);

create policy "rooms can be created"
on public.monopoly_rooms for insert
with check (true);

create policy "rooms can be updated"
on public.monopoly_rooms for update
using (true)
with check (true);
```

Enable Realtime for the table in Supabase. When configured, the app stores rooms at `monopoly_rooms.code`.
