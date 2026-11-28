# Tasks

## 1. Round logic

- [x] 1.1 Extend `startNextScumRound(state, random, newcomers = [])` in `lib/scum.js`: add newcomers after `state.players`, extend the finish order, recalculate `playerCount` and `deckCount`, and title players by position in the extended order. Verify with `tests/scum-rules.test.mjs`: 4 finishers + 1 newcomer → 5 hands, 2 decks, the newcomer is Scum and last in turn order, the old Scum is Vice Scum, and with one trade group the newcomer trades with the President; two newcomers → the latest joiner is lowest; no newcomers → same result as before.

## 2. Room service

- [x] 2.1 `lib/scum-rooms.js`: allow `joinScumRoom` during a game within the 20-seat cap, keep `addScumComputer` rejecting once started, and hand waiting humans to `startNextScumRound` in `startNextScumRoomRound`. Verify with `tests/scum-rooms.test.mjs`: a mid-game join succeeds and isn't dealt in, the 21st seat (seated plus waiting) is rejected, a computer can't be added mid-game, and the next round deals the newcomer in as Scum.
- [x] 2.2 Add a `leaveScumRoom` action (waiting players only) and route it in `app/api/scum/rooms/[code]/route.js`. Verify with tests that a waiting player who leaves isn't dealt in, and that a seated player gets an error.
- [x] 2.3 Give `serializeRoom` a waiting view for viewers who aren't in `game.players` (no hands or game state), and add `waitingPlayers` to seated views. Verify with a test that the waiting view has no `hand` anywhere and that seated views list the waiting players.

## 3. Client

- [x] 3.1 In `components/scum-client.js`, add a `WaitingScreen` for `phase === "waiting"` (room code, round, seated players, "You'll be dealt in next round as Scum", and Leave, which calls the `leave` action and forgets the seat). Verify in the running app that a second browser joining mid-game sees it.
- [ ] 3.2 Show "Joins next round: …" on the results screen and a short line on the table while anyone is waiting. Verify in the running app from the host's browser.

## 4. Integration

- [x] 4.1 Run `npm test` and verify it passes.
- [ ] 4.2 Play through end to end in two browsers: the host plays with computers, a second browser joins mid-round, sees the waiting screen, and is dealt in as Scum when the host starts the next round (including the President trade).
