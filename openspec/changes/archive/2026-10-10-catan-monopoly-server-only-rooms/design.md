# Design

## Context

Both services already contain two code paths: a Supabase path (used when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present) and a path through `/api/<game>/rooms/<code>` with `saveLocalRoom` and `loadLocalRoom` (used otherwise, and in development). Both use compare-and-set updates: the Supabase path matches `state->>updatedAt`; the route path sends `expectedUpdatedAt` and the server answers 409. The route stores into `server_game_rooms` through the same version-checked store every other game uses. `subscribeToRoomState` in `lib/supabase-room-sync.js` combines a poll, a BroadcastChannel and a Supabase realtime channel; only Catan and Monopoly still call it or `getConfiguredSupabaseClient`. Monopoly's `isOnlineSyncEnabled` only chooses an error message.

## Goals / Non-Goals

**Goals:**
- Remove the browser's direct database access and the open policies behind it, with identical play for users.

**Non-Goals:**
- Server-side rules or per-seat views for Catan and Monopoly.
- Changing Mafia's client or policies.

## Decisions

**1. Always use the route path.** The Supabase branches are deleted from `load`, `save` and `update`, leaving the route path that already works in development and in every test. The offline fallback to the local mirror stays. Alternative: keep both paths behind a flag; rejected because the flag would keep the unsafe path reachable.

**2. Poll-only subscription.** The poll interval already used by every other game (1.2 s, backing off when quiet, paused on hidden tabs) replaces realtime. The latency is the same as the other twenty-four games. A new `lib/room-sync.js` holds a `subscribeToRoomState` with the poll and broadcast parts only and the same call signature, so the two services change only their import.

**3. One migration that drops the tables.** `drop table if exists` removes each table together with its policies, grants and realtime publication membership, so no separate revoke or publication statements are needed, and it succeeds when the tables are already gone. Dropping is safe because nothing reads these tables after the code change and rooms live 24 hours. Rollback is reverting the code and re-running the original migrations, which recreate empty tables.

**4. Deploy order: code, then migration.** Browsers running the old bundle would fail once the tables are gone, so the migration runs after the new code is live and players have reloaded; a stale tab shows the existing "could not save the room" error. This is documented in the migration's header and the README.

**5. State the remaining exposure plainly.** The whole-state route is still protected only by the room code, so docs say so rather than implying the games are secure.

## Risks / Trade-offs

- [A stale browser bundle after the migration] → The deploy order above; the failure is a visible error, not data corruption.
- [Poll latency feels slower than realtime for turn changes] → It matches every other game; the interval backs off only when the room is quiet.
- [Removing realtime changes Monopoly dice animations that rely on instant updates] → Monopoly's animations are driven by the acting browser's own state, and a manual run of both games is listed as a follow-up since it cannot be automated here.
- [The migration cannot be run or tested in this environment] → It is written to be idempotent, and the source-level test proves no browser code references the tables.

## Migration Plan

1. Merge and deploy the code (routes already exist).
2. Run the new migration in Supabase.
3. Confirm with the public key that selecting from the old tables is denied, if the project has a way to check; otherwise rely on the migration dropping them.

## Open Questions

None that change the specs or tasks.
