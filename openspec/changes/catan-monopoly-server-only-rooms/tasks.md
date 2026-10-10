# Tasks

## 1. Poll-and-broadcast helper

- [ ] 1.1 Add `lib/room-sync.js` exporting `subscribeToRoomState` with the poll and same-browser broadcast only (same call signature, ignores a state older than the newest delivered), with a unit test using the poll helper's injectable environment and a fake BroadcastChannel covering newer delivery, older state ignored and unsubscribe; verify `npm run test:root`

## 2. Catan and Monopoly through the server only

- [ ] 2.1 Rewrite `components/catan-room-service.js` to use only the room route (drop the Supabase client, `isCatanOnlineSyncEnabled` and the Supabase branches of load, save and update) and import `subscribeToRoomState` from `lib/room-sync.js`; verify a new source-level test finds no `getConfiguredSupabaseClient`, `supabase.from` or table name in the file and `tests/catan-room-api.test.mjs` still passes
- [ ] 2.2 Rewrite `monopoly/src/roomService.ts` the same way, drop `isOnlineSyncEnabled` and simplify the "room not found" message in `monopoly/src/main.tsx`; verify the same source-level test covers it, `npm run typecheck`, `npm run build` and `node monopoly/scripts/game-rules.test.mjs` pass
- [ ] 2.3 Delete `lib/supabase-room-sync.js` and `lib/supabase-room-sync.d.ts` once nothing imports them; verify a search finds no importer and the build passes
- [ ] 2.4 Run both games against the dev server over HTTP: create a room, join from a second client, make a few saves with `expectedUpdatedAt` and check a stale save answers 409 and a poll returns the newer state; verify the responses

## 3. Close the database

- [ ] 3.1 Add `supabase/migrations/20261010000000_remove_public_room_tables.sql` that drops the policies, revokes the browser grants, removes both tables from `supabase_realtime` and drops them, written to be re-runnable, with a header stating the deploy order; verify the SQL parses by reading it against the two original migrations and that nothing in `app/`, `components/`, `lib/` or `monopoly/src/` names the tables
- [ ] 3.2 Update `README.md`, `CONTEXT-MAP.md` and ADR 0004 to say Catan and Monopoly are reached only through the server, changes arrive by polling, the public Supabase variables now serve only Mafia, and a room is still protected only by its code; verify by searching for "browser-side Supabase tables" and "when these variables are configured" and finding none that describe current behavior

## 4. Close out

- [ ] 4.1 Run `npm test`, `npm run typecheck`, `npm run build`, `npm run validate` and `openspec validate catan-monopoly-server-only-rooms --strict`; verify all pass
