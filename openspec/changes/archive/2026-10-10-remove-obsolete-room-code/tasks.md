# Tasks

## 1. Pin the remaining route's behavior

- [x] 1.1 Add `tests/client-room-route.test.mjs` covering the whole-state route as Catan and Monopoly use it (GET returns `{ state }`, a PUT whose `roomCode` differs from the URL answers 400, a PUT with a stale `expectedUpdatedAt` answers 409); verify it passes against the current route and `npm run test:root` stays green

## 2. Remove the dead code

- [x] 2.1 Search the repository for imports of `card-game-room-service` and `use-game-room`, then delete `components/card-game-room-service.js`, `lib/use-game-room.js` and the tests that cover them (`tests/room-seat-service.test.mjs`); verify the search finds no remaining importer and `npm run build` passes
- [x] 2.2 Slim `lib/client-room-route.js` to the plain whole-state `GET`/`PUT` (write validation and the version conflict) without seat tokens or the `seatAccess` option, remove `seatAccess: false` from the Catan and Monopoly route files, and delete `tests/client-room-access.test.mjs`; verify `tests/catan-room-api.test.mjs` and the new route test pass unchanged
- [x] 2.3 Trim `lib/room-seats.js` to `SEATS_KEY`, `SEAT_TOKEN_HEADER`, `addSeat` and `seatForToken` and drop the unused helpers and the now-wrong header comment; verify the engine room tests pass and a search finds no use of the removed exports

## 3. Retire the capability and update docs

- [x] 3.1 Update the comment at the top of `lib/client-room-route.js`, `CONTEXT-MAP.md` and `docs/adr/0004-seat-tokens-for-client-authoritative-rooms.md` wherever they describe whole-state seat-token gating; verify by searching for "seatAccess", "legacy room" and "token-gated" and finding none that describe current behavior
- [x] 3.2 Run `npm test`, `npm run typecheck`, `npm run build`, `npm run validate` and `openspec validate remove-obsolete-room-code --strict`; verify all pass
