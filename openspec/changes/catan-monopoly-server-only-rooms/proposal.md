# Proposal

## Why

Catan and Monopoly are the last games whose browsers talk to the database directly. When the public Supabase variables are set (the README's documented production setup), the browser bundle holds the anon key and reads and writes the `catan_rooms` and `monopoly_rooms` tables itself, and those tables allow `select`, `insert` and `update` for everyone with `using (true)`. Anyone who opens the site can therefore list every room, read every player's game, and overwrite any game, without knowing a room code. Every other game was moved behind the server, where the room table accepts only the service role. Catan and Monopoly already have a server route that does exactly what the browser does (`/api/<game>/rooms/<code>`); they just do not use it in production.

## What Changes

- Catan and Monopoly rooms are always read and written through their `/api/<game>/rooms/<code>` routes, which use the server-only `server_game_rooms` table. The browser no longer builds a Supabase client for rooms.
- Other players' changes reach a browser by polling (with the same-browser broadcast kept), replacing the Supabase realtime subscription. The polling helper already used by every other game does this.
- A migration removes the open policies and the browser grants from `catan_rooms` and `monopoly_rooms`, removes them from the realtime publication, and drops the tables.
- The shared browser Supabase helper used only by these two games is replaced by a small poll-and-broadcast helper.
- **BREAKING** Games in progress at deploy time cannot be resumed (their rooms move tables); they expire within 24 hours anyway. Order matters at deploy: ship the code first, then run the migration.
- Out of scope: server-side game rules for Catan and Monopoly. Their rooms stay whole-state, so anyone holding a room code can still read and replace that one room (see Impact).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/client-authoritative-rooms`: adds that these rooms are reached only through the server, and that changes arrive by polling.

## Impact

- Edited: `components/catan-room-service.js`, `monopoly/src/roomService.ts`, `monopoly/src/main.tsx` (the "online sync" message), `README.md`, `CONTEXT-MAP.md`, ADR 0004. Replaced: `lib/supabase-room-sync.js` and its `.d.ts` with a poll-and-broadcast helper. New: one migration.
- Not touched: Mafia, which uses its own client, token-checked RPCs and Realtime; the Supabase environment variables still apply to it.
- What remains after this change: a Catan or Monopoly room can be read and replaced by anyone who knows its five-character code. Closing that needs server-side rules for the two games (the engine-room pattern), which is a rewrite of the Catan rules (about 900 lines with expansions) and the Monopoly rules module.
