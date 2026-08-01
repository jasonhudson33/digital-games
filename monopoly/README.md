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

Run [`supabase/migrations/20260731000000_create_monopoly_rooms.sql`](../supabase/migrations/20260731000000_create_monopoly_rooms.sql)
in the Supabase SQL editor. It creates the `monopoly_rooms` table, grants the anonymous client the required read/write access, and enables Realtime.
When configured, the app stores rooms at `monopoly_rooms.code` and uses local storage only as a client cache.
