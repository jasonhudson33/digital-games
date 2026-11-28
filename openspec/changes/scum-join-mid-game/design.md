# Design

## Context

A Scum room has two player lists. `room.players` is every human and computer with a seat token; `requireHuman` checks tokens against it, and it's capped by `SCUM_MAX_PLAYERS`. `room.game.players` is the dealt table, keyed by `playerId`. `startNextScumRound` (`lib/scum.js`) re-deals `state.players`, takes the next turn order from `standings`, titles players with `scumPlaceName(player.place, playerCount)`, and reuses the stored `deckCount`. `serializeRoom` assumes the viewer is in `game.players`, and `components/scum-client.js` reads `game.players[viewerPlayerIndex]` straight away. Scum has no server-side leave; the client just drops the seat.

## Goals / Non-Goals

**Goals:**
- A newcomer is placed in exactly one place, the next-round hand-off, and the round logic stays a pure function.

**Non-Goals:**
- A watching view of the live table for waiting players.
- Mid-game leave for seated players.

## Decisions

- **The waiting list is derived, not stored.** A waiting player is anyone in `room.players` whose `playerId` isn't in `room.game.players`. Join order is their order in `room.players`. This keeps the 20-seat cap check (`room.players.length`) correct without a second list that could drift out of sync.
- **`startNextScumRound(state, random, newcomers = [])`.** It adds newcomer seeds after `state.players` and extends the finish order to `[...state.standings, ...newIndices]`. Titles come from each player's position in that extended order (`scumPlaceName(position + 1, newCount)`) rather than the old `place`, so the previous Scum becomes Vice Scum correctly. `playerCount` and `deckCount` are recalculated, and trade groups use the extended order. With no newcomers the result is the same as today.
- **The room hands newcomers over.** `startNextScumRoomRound` gathers the waiting humans, in `room.players` order, and passes them to `startNextScumRound`.
- **`joinScumRoom` while in game.** It's allowed when `room.game` exists and the cap isn't reached; the token is returned the same way. `addScumComputer` keeps rejecting once the game has started.
- **`leaveScumRoom` action.** A waiting player is removed from `room.players`. A seated player, or anyone in the lobby, gets an error ("Seated players can't leave mid-game"), so the existing behaviour doesn't change. The client's Leave on the waiting screen calls this and then forgets the seat.
- **Waiting view.** When the viewer isn't in `game.players`, `serializeRoom` returns `{ phase: "waiting", roomCode, roundNumber, players: [{ name, isComputer }] (seated), waitingPlayers, hostControls: false, updatedAt }` with no hands, no game state and no computer pacing. Seated views gain `waitingPlayers: [{ playerId, name }]`. The client renders `WaitingScreen` when `phase === "waiting"`, before any code that reads `viewer`. Polling and the seat-resume helper work unchanged; when the next round is dealt, the next poll returns a normal seated view.
- **Seated players are told.** The results screen lists "Joins next round: …" under the standings, and the table shows a short line in the turn-message area while anyone is waiting.

## Risks / Trade-offs

- [The host starts the next round and the waiting player's next poll comes after a few seconds of backoff] → The poll snaps back to the fast interval when `updatedAt` changes, so the delay is at most one poll interval.
- [Someone joins during the trading phase and waits a whole round] → Accepted. Dealing mid-round isn't possible.
- [Existing rooms saved before this change] → Every one of them has no waiting players, so `startNextScumRound` behaves exactly as before.
