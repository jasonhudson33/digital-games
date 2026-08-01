# Mafia Online

Mafia is mounted at `/mafia` in the Digital Games Next.js app and uses Supabase for anonymous player identity, room state, private roles, actions, and Realtime updates.

## Supabase setup

Set these values locally and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run [`supabase/migrations/20260731010000_create_mafia_rooms.sql`](../supabase/migrations/20260731010000_create_mafia_rooms.sql) in the Supabase SQL editor.

In the Supabase dashboard, open **Authentication → Providers → Anonymous Sign-Ins** and enable anonymous sign-ins. Mafia uses the resulting persisted user id to enforce private-role and action policies.

## Local development

From the repository root:

```bash
npm install
npm run dev
```
