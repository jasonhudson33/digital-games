# Tasks

## 1. Engine room options

- [x] 1.1 Let `create` and `join` in `lib/engine-room.js`, the routes and `components/engine-room-service.js` carry an optional adapter-defined `options` object passed to `createLobby` and `addPlayer`; verify existing adapters are unaffected (the full engine test suite passes) and a toy-adapter test shows options reaching both calls and an adapter error message reaching the client as a 400

## 2. Monopoly adapter

- [x] 2.1 Add the Monopoly adapter in `monopoly/src/roomAdapter.ts` (lobby with piece option, house rules, add local and computer players, start, restart, every in-game action, computer step) with the authority table from the design and `asPlayerId` for host-controlled local seats; verify with Vite-harness tests that for every row of the table the right seat succeeds and a wrong seat is rejected and the game unchanged
- [x] 2.2 Cover dice and expiry: a test pins `Math.random` and shows a roll request carrying a die value uses the server's roll, and a test shows an early `expireTrade` leaves the trade pending while one after the expiry time clears it; verify `npm run test:monopoly`
- [x] 2.3 Wire `lib/monopoly-engine-room.js` and replace the Monopoly route files with the engine routes plus a collection route; verify the route exports GET and POST only and `npm run build` passes

## 3. Client

- [x] 3.1 Replace `monopoly/src/roomService.ts` with the engine room service and convert `monopoly/src/main.tsx` from `updateGame(closure)` to named actions (including `asPlayerId` for local seats, the piece option at create and join, host `computerStep` and the trade-expiry request); verify `npm run typecheck`, `npm run build` and an undefined-name check on the converted client
- [x] 3.2 Run a game over HTTP on the dev server: create and join with pieces, add a computer and a local seat, play several turns including a purchase, rent, an auction and a trade, and confirm a stranger gets 403, a whole-state `PUT` gets 405 and a wrong-seat action is refused; verify the responses

## 4. Docs and close out

- [x] 4.1 Update `docs/contexts/monopoly.md`, `CONTEXT-MAP.md` (Catan is the only client-authoritative game), ADR 0004, `README.md`, and the Purposes of `platform/server-authoritative-rooms` and `platform/client-authoritative-rooms` in `openspec/specs/`; verify the docs list the same games as the routes that use the engine room
- [x] 4.2 Run `npm test`, `npm run typecheck`, `npm run build`, `npm run validate` and `openspec validate monopoly-server-rules --strict`; verify all pass
