# Proposal

## Why

`server-authoritative-hand-games` moved UNO, DOS, Flip 7 and Phase 10 to server-side rules behind a shared engine room, so seats no longer receive each other's hands. Six more games still hold hidden information in whole-state rooms that every seated player can read in full: BANG! (hidden roles and hands), Cover Your Assets, Five Crowns and Sequence (hands), Qwirkle (tile racks) and Stratego (the opponent's hidden army and secret deployment). The shared module, routes, service and hook already exist, so each game now needs only an adapter, its client conversion and tests.

## What Changes

- Run the BANG!, Cover Your Assets, Five Crowns, Sequence, Qwirkle and Stratego engines on the server through the existing engine room, with per-seat views.
- Hide per game: BANG! roles (except the Sheriff, eliminated players and the viewer), hands and draw pile; Cover Your Assets, Five Crowns and Sequence hands and draw piles; Qwirkle racks and the tile bag; Stratego the identity of the opponent's pieces and the opponent's placement during secret deployment.
- Remove whole-state `GET`/`PUT` for these six games. **BREAKING** Rooms created before the deploy cannot be resumed; they expire within 24 hours.
- Adapt the six clients from `update(state => engine(state))` closures to named actions and host-paced `computerStep`.
- Leave Dominion, Life, No Thanks!, Risk, Splendor, Spyrium, Ticket to Ride, Viticulture (still token-gated) and Catan and Monopoly unchanged; they are candidates for a later change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/client-authoritative-rooms`: the list of games that do not expose whole-state `GET`/`PUT` grows by six.
- `platform/server-authoritative-rooms`: adds masking of roles and pieces until a rule reveals them.
- `games/bang`: adds hidden roles, hands and draw pile.
- `games/cover-your-assets`: adds hidden hands and draw pile.
- `games/five-crowns`: adds hidden hands and draw pile.
- `games/sequence`: adds hidden hands and draw pile.
- `games/qwirkle`: adds hidden racks and tile bag.
- `games/stratego`: adds hidden opponent pieces and secret deployment.

## Impact

- Six new `lib/<game>-room-adapter.js` and `lib/<game>-engine-room.js` modules, six route files change to the engine routes plus a new collection route, six `components/<game>-room-service.js` wrappers and six `components/<game>-client.js` files change.
- Per-game tests that an opponent's private data is absent from another seat's payload.
- Docs: `CONTEXT-MAP.md`, ADR 0004's game list (now 8 games), the Purposes of the two platform specs, and context docs for the six games (Cover Your Assets, Qwirkle, Sequence already exist; BANG!, Five Crowns, Stratego exist from the baseline).
- No Supabase migration; `lib/engine-room.js` and the client hook are reused as they are,.
- Out of scope: new rules, UI redesign, the eight remaining token-gated games, Catan and Monopoly.
