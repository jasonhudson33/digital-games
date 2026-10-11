## Why

Catan is the last game whose browser computes the rules and stores the whole game in a shared room. Any player who has the room code can read every hand, the development and progress decks and the dice outcome, and can overwrite the room with an arbitrary state. Every other game already runs its rules on the server. Catan is the only one left because its rules live inline in a 3,000-line client component (about 940 lines of handler and helper logic), so moving it is a refactor, not a wiring job.

## What Changes

- Extract the game logic from `components/catan-client.js` (board geometry, `createGame`, setup placement, dice resolution, building, trading, development and progress cards, robber/pirate, gold, barbarians, Cities & Knights actions, computer turns) into pure modules under `lib/` that both server and client import.
- Add a Catan engine-room adapter with named, token-checked actions, server-rolled dice (including alchemy and event dice) and server-shuffled decks, boards and ports.
- Send per-seat views: opponents' resource, development and progress cards become counts, and the decks become counts.
- Convert the client to call named actions instead of replacing whole state; computer turns run one step per host request.
- Remove the whole-state `PUT` route, `lib/client-room-route.js`, and the client-authoritative room spec. **BREAKING**: Catan rooms created before the deploy answer 410 and cannot resume.
- Update CONTEXT-MAP, README and ADR 0004 to say no game is client-authoritative.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `games/catan`: adds server-side rules, hidden information, server randomness and action authority.
- `platform/client-authoritative-rooms`: retired; no game uses whole-state rooms.

## Impact

- `components/catan-client.js`, `catan-rules.js`, `catan-runtime.js`, `catan-room-service.js`, `catan-state-migrations.js`; new `lib/catan-engine*.js`, `lib/catan-room-adapter.js`.
- `app/api/catan/rooms/**`, `lib/client-room-route.js`, `lib/room-sync.js` (Catan polling moves to the engine hook), `lib/catan-room-store.js`.
- Tests: existing `tests/catan-*.test.mjs` must keep passing; new engine, view and authority tests.
- Docs and specs listed above.
