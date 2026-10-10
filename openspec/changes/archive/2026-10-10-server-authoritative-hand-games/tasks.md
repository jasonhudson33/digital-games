# Tasks

## 1. Shared engine room

- [x] 1.1 Add `lib/engine-room.js` with create, join, view, action and `computerStep` driven by a per-game adapter, storing the engine game with an `engine: 1` marker and seat-token hashes; verify with a unit test using a toy engine covering create, join, illegal action (400, unchanged), non-host `computerStep` rejected, and a pre-change room answering "start a new room"
- [x] 1.2 Add the shared route helper (POST actions, GET view, no `PUT`) reusing `handleApi` conflict retries and an own-property action lookup; verify with a route test that `constructor` as an action name is rejected and a whole-state `PUT` returns 405
- [x] 1.3 Add `components/engine-room-service.js` (create, join, load, action, subscribe via `createRoomPoll`) storing the seat token per room in `localStorage`; verify with a service test using stubbed fetch for a host and guest

## 2. UNO

- [x] 2.1 Add the UNO adapter (action table over `lib/uno.js`, view hiding other hands, deck, `wasLegal` and Flip inactive faces) and wire `app/api/uno/rooms`; verify with tests that no opponent card id appears in another seat's payload, `wasLegal` is absent while pending, and Flip views carry no inactive faces
- [x] 2.2 Convert `components/uno-client.js` and `uno-room-service.js` to actions and host `computerStep` with the 680 ms delay; verify `npm run typecheck`, `npm run build` and a dev-server HTTP run of create, join, start, play, draw, challenge
- [x] 2.3 Update `docs/contexts/uno.md` and confirm the UNO specs still match; verify `openspec validate`

## 3. DOS

- [x] 3.1 Add the DOS adapter and view and wire `app/api/dos/rooms`; verify with tests for hidden hands and deck, a match using a card not held being rejected, and a rejected catch
- [x] 3.2 Convert `components/dos-client.js` and its service; verify typecheck, build and an HTTP run of a full turn with a computer step
- [x] 3.3 Update `docs/contexts/dos.md`; verify `openspec validate`

## 4. Phase 10

- [x] 4.1 Add the Phase 10 adapter and view and wire `app/api/phase-10/rooms`; verify with tests for hidden hands and deck and a phase laid with a card not held being rejected
- [x] 4.2 Convert `components/phase-10-client.js` and its service; verify typecheck, build and an HTTP run of draw, lay, hit, discard
- [x] 4.3 Update `docs/contexts/phase-10.md`; verify `openspec validate`

## 5. Flip 7

- [x] 5.1 Add the Flip 7 adapter and view, including `riskPercent` per active seat and `deckCount`, and wire `app/api/flip-7/rooms`; verify with tests that the deck is absent, the estimate matches `riskPercent` on the real deck, and a repeated flip is rejected
- [x] 5.2 Convert `components/flip-7-client.js` and its service to read `deckCount` and the server estimate; verify typecheck, build and an HTTP run of flip, stay, target action
- [x] 5.3 Update `docs/contexts/flip-7.md`; verify `openspec validate`

## 6. Close out

- [x] 6.1 Update `CONTEXT-MAP.md`, ADR 0004's game list (now 14 games), the Purpose of `platform/server-authoritative-rooms` and `platform/client-authoritative-rooms` in `openspec/specs/`, and the baseline note that task 5.2 was completed for these four; verify the docs list the same games as `lib/games.js` room models
- [x] 6.2 Run `npm test`, `npm run typecheck`, `npm run build` and `npm run validate`; verify all pass
