# Proposal

## Why

Every online game except Catan and Monopoly now runs on the server through the shared engine room, so the seat-token gating built for whole-state rooms (`platform/room-access-control`) no longer applies to any game: Catan and Monopoly are explicitly exempt from it. The code and tests that implemented it are dead weight, and the spec describes behavior nothing exhibits. Left in place they mislead readers about how rooms are secured.

## What Changes

- Delete code that nothing in the app uses any more: `components/card-game-room-service.js` (the browser service for token-gated whole-state rooms) and `lib/use-game-room.js` (the shared client hook for them).
- Slim `lib/client-room-route.js`, now used only by Catan and Monopoly with seat tokens switched off, to the plain whole-state `GET`/`PUT` with write validation and the version conflict check, and remove its seat-token branches and the `seatAccess` option.
- Trim `lib/room-seats.js` to what the engine room uses (`SEATS_KEY`, `SEAT_TOKEN_HEADER`, `addSeat`, `seatForToken`) and drop the helpers only the whole-state route used.
- Remove the tests that covered the deleted behavior (`tests/room-seat-service.test.mjs`, `tests/client-room-access.test.mjs`), keeping a small test that the remaining route still validates writes and rejects stale ones.
- Retire the `platform/room-access-control` capability: its five requirements are removed. The seat-token requirement that still applies (engine-backed rooms) already lives in `platform/server-authoritative-rooms`.
- No behavior change for players: Catan and Monopoly rooms work exactly as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/room-access-control`: all requirements removed and the capability retired.

## Impact

- Deleted: two source files and two test files. Edited: `lib/client-room-route.js`, `lib/room-seats.js`, the Catan and Monopoly route files (drop the `seatAccess: false` option), docs that mention the old gating.
- Nothing in `app/` or `components/` other than the two Catan and Monopoly routes imports the removed code, which a search and the build confirm.
- Out of scope: securing Catan and Monopoly (a separate change needing Supabase row-level security), and any rules or UI.
