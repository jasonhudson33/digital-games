# Tasks

## 1. Rules

- [x] 1.1 Create `lib/what-if.js` (`createLobby`, `addPlayer` up to 20, `startGame` with at least 3, `submitEntry` with trimming, the 200-character cap, blank rejection and auto-mix when everyone is in, `mix` by rotation with shuffled order, `nextPair`, `playAgain`). Verify with `tests/what-if-rules.test.mjs`: start rejected with 2; a blank half rejected; resubmitting replaces the text; over 200 characters is capped; no self-pairs and every THEN used once (checked over many seeded mixes for 3–20 writers); Mix now rejected with fewer than 3; non-submitters sit out; Next advances; Play again clears the entries.

## 2. Room

- [x] 2.1 Add `lib/what-if-room-adapter.js` (actions and a privacy-safe `view`), `lib/what-if-room-store.js`, `lib/what-if-engine-room.js`, and the two API routes. Verify with `tests/what-if-engine-room.test.mjs` through `createEngineRoom` with a memory store: no view ever contains another player's text during writing; during the reveal no view contains a pair beyond `revealIndex`; only the host can `mixNow`, `next` and `playAgain`.

## 3. Client

- [ ] 3.1 Add `components/what-if-room-service.js`, `components/what-if-client.js`, `app/what-if/page.js` and `app/what-if/what-if.css`, with the shared landing, lobby (no computers), game bar, rules dialog, writing screen with two text areas and counters, the reveal card and the done list. Verify in the running app with three browsers: write, see submitted ticks, auto-mix, step through with Next, Play again.
- [ ] 3.2 Check the writing and reveal screens at 390x844 and 320x568. Verify there's no sideways scroll, the text areas are at least 16px, and Submit and Next are on screen while the keyboard is closed.

## 4. Catalog and integration

- [ ] 4.1 Add the catalog entry and the `party` kind to `lib/games.js`. Verify that `tests/games-catalog.test.mjs` (with What If added to its limit table if needed) and `tests/layout-check.test.mjs` pass, and that the hub shows What If under Party.
- [ ] 4.2 Run `npm test` and verify it passes.
