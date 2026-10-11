## 1. Extract pure modules

- [x] 1.1 Move board geometry, ports and legality helpers to `lib/catan-board.js` and import them in the client
- [x] 1.2 Move `createGame`, `createLobby` and the module-level game functions to `lib/catan-engine.js` with an injectable `rng`
- [x] 1.3 Run existing `tests/catan-*.test.mjs`, typecheck and the undefined-name check

## 2. Server rules

- [x] 2.1 Add `lib/catan-room-adapter.js` with lobby actions (ruleset, color, computers, start, restart)
- [x] 2.2 Add play actions (roll, build, trade, cards, robber/pirate, gold, discard, Cities & Knights) with the authority table
- [x] 2.3 Add `catanView`, computer step, awards reconcile; add `lib/catan-engine-room.js`, routes (GET/POST) and service

## 3. Client

- [x] 3.1 Convert handlers to named actions via `use-engine-room`; remove local dice and whole-state saves
- [x] 3.2 Delete the PUT route, `lib/client-room-route.js`, `lib/room-sync.js` Catan use and the old store if unused

## 4. Tests and docs

- [x] 4.1 Add engine-room tests: hidden cards, deck counts, authority for every action, computer step host-only, GET/POST only, old room 410
- [x] 4.2 Run a live HTTP smoke game through setup and several turns
- [x] 4.3 Update CONTEXT-MAP, README, ADR 0004 and docs; run `npm test`, typecheck, build and `npm run validate`
