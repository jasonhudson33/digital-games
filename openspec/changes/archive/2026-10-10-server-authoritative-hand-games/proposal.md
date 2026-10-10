# Proposal

## Why

UNO, DOS, Flip 7 and Phase 10 are hand-management games, but they run client-authoritative: the browser computes each move and `PUT`s the whole game back, so every seat receives every other seat's hand and the draw pile. The seat tokens added by `baseline-platform-and-game-specs` keep strangers out, but a seated player can still read opponents' cards (and, in UNO, whether a Wild Draw Four was legal). Hiding them requires the rules to run on the server, as they already do for Scum, Pinochle and four other games. These four are the best first candidates because their engines in `lib/` are already pure functions that take `(game, playerId, ...)` and return a new game.

## What Changes

- Run the existing UNO, DOS, Flip 7 and Phase 10 engines on the server behind an action API (`POST /api/<game>/rooms/<code>` with `{ action, ...args }`), with the seat token proving who is acting.
- Return a per-seat view: other seats' hands and the draw pile become counts, plus game-specific hidden fields (UNO Wild Draw Four legality and Flip hidden faces, Flip 7 risk estimate computed server-side).
- Move computer pacing to a host-triggered `computerStep` action so the server, not the host browser, applies computer moves while the UI keeps its delay between them.
- **BREAKING** Remove `GET`/`PUT` whole-state access for these four games. Rooms created before the deploy cannot be resumed and answer with a clear message; they expire within 24 hours.
- Adapt the four clients from `update(state => engine(state))` closures to named actions.
- Keep the other 14 token-gated games, Catan and Monopoly unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/server-authoritative-rooms`: adds the engine-backed action API, host-paced computer steps and handling of pre-change rooms.
- `platform/client-authoritative-rooms`: narrows the whole-state API to the games that still use it.
- `games/uno`: adds hidden hands, hidden draw pile, hidden Wild Draw Four legality and hidden Flip faces.
- `games/dos`: adds hidden hands and draw pile.
- `games/flip-7`: adds hidden draw pile with a server-computed risk estimate.
- `games/phase-10`: adds hidden hands and draw pile.

## Impact

- New `lib/engine-room.js` (room actions and views) and `components/engine-room-service.js`; four game route files change from `createClientRoomRoute` to the action route; four `components/*-client.js` files change their move calls; four `components/*-room-service.js` wrappers change.
- Four new per-game modules for actions and views, with tests that an opponent's hand is absent from another seat's payload.
- Docs: `CONTEXT-MAP.md`, ADR 0004 (game list), `docs/contexts/uno.md`, `docs/contexts/dos.md`, `docs/contexts/phase-10.md`, `docs/contexts/flip-7.md`, and the Purpose of `platform/server-authoritative-rooms`.
- No Supabase migration: rooms continue to use `server_game_rooms`, and the stored value gains an `engine` marker.
- Out of scope: the other 14 token-gated games, Catan and Monopoly, new rules, and UI redesign.
