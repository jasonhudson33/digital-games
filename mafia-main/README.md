# Mafia Online

Mafia is mounted at `/mafia` in the Digital Games Next.js app and uses Supabase for room state, private roles, actions, and Realtime updates. Players are identified by a persistent browser/device ID and private room token; Supabase Authentication is not used.

## Supabase setup

Set these values locally and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run these migrations in order in the Supabase SQL editor:

1. [`supabase/migrations/20260731010000_create_mafia_rooms.sql`](../supabase/migrations/20260731010000_create_mafia_rooms.sql)
2. [`supabase/migrations/20260731020000_mafia_device_tokens.sql`](../supabase/migrations/20260731020000_mafia_device_tokens.sql)
3. [`supabase/migrations/20260801000000_fix_mafia_rpc_conflicts.sql`](../supabase/migrations/20260801000000_fix_mafia_rpc_conflicts.sql)
4. [`supabase/migrations/20260801010000_mafia_presence_takeover.sql`](../supabase/migrations/20260801010000_mafia_presence_takeover.sql)
5. [`supabase/migrations/20260801020000_mafia_permanent_leave.sql`](../supabase/migrations/20260801020000_mafia_permanent_leave.sql)
6. [`supabase/migrations/20260801030000_mafia_alive_day_intents.sql`](../supabase/migrations/20260801030000_mafia_alive_day_intents.sql)
7. [`supabase/migrations/20260801040000_mafia_replay.sql`](../supabase/migrations/20260801040000_mafia_replay.sql)

Leave Anonymous Sign-Ins disabled. The second migration removes the Auth-based policies and exposes token-validated RPCs instead.

## Reconnecting

The current room is stored on the player device and restored automatically when that device returns to `/mafia`. Players send token-validated presence heartbeats while connected. After five minutes without a heartbeat, the acting host marks that seat as computer-controlled; the original device reclaims the same seat when it reconnects.

Choosing **Leave Room** or **Leave Game** permanently revokes that device's access to the room. An active, living player's seat becomes computer-controlled; otherwise the player is removed.

## Local development

From the repository root:

```bash
npm install
npm run dev
```
