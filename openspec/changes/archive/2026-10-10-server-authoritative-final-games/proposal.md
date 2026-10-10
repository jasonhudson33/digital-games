# Proposal

## Why

After `server-authoritative-remaining-hidden-info-games`, only Life, No Thanks! and Spyrium (besides Catan and Monopoly, which use their own storage) still keep the whole game in the browser. They hold little hidden state, but each has some: the No Thanks! draw pile, Spyrium's period decks and its later events, and Life's face-down LIFE tiles, millionaire bonus and offered career cards. More importantly, any seated player can still replace the whole game with a `PUT`, and Life lets the browser choose its own spinner result: the client rolls the number and sends it to the engine, which accepts it. Moving these three finishes the migration for every game that uses the seat-token room model.

## What Changes

- Run the Life, No Thanks! and Spyrium engines on the server through the existing engine room, with per-seat views.
- Hide per game: No Thanks! draw pile (the active card, taken cards and chip counts stay public, as the table shows them today); Spyrium's three period decks and events beyond the next one; Life's LIFE tile pool, other seats' LIFE tile values until the game ends, the millionaire bonus until the end, and career cards offered to another seat.
- Life's spinner is chosen by the server. The browser animates while it waits and shows the number the server returns.
- Remove whole-state `GET`/`PUT` for these three games. **BREAKING** Rooms created before the deploy cannot be resumed; they expire within 24 hours.
- Adapt the three clients from `update(state => engine(state))` closures to named actions and host-paced `computerStep`.
- Leave Catan and Monopoly unchanged (their own browser-side Supabase tables).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/client-authoritative-rooms`: the list of games without whole-state `GET`/`PUT` grows by three, leaving Catan and Monopoly.
- `platform/server-authoritative-rooms`: adds that every die, spin and shuffle is chosen by the server.
- `games/life`: adds a server-chosen spin and hidden LIFE tiles, pool, bonus and career offers.
- `games/no-thanks`: adds a hidden draw pile.
- `games/spyrium`: adds hidden period decks and later events.

## Impact

- Three new `lib/<game>-room-adapter.js` and `lib/<game>-engine-room.js` modules; three route files change to the engine routes plus a new collection route; three `components/<game>-room-service.js` wrappers and three `components/<game>-client.js` files change.
- Per-game tests; a Life test that a client-supplied spin result is ignored.
- Docs: `CONTEXT-MAP.md` (the client-authoritative group shrinks to Catan and Monopoly), ADR 0004 (no token-gated engine-room games left), `README.md`, the Purposes of the two platform specs, and context docs for Life, No Thanks! and Spyrium.
- No Supabase migration; `lib/engine-room.js` and the hook are reused as they are.
- Out of scope: new rules, UI redesign, hiding No Thanks! chip counts (the table shows them), Catan and Monopoly.
