# Proposal

## Why

Scum games go on for many rounds, and people arrive late. Today a started room refuses every new join with "That game has already started.", so a latecomer has to wait for a whole new game. Scum already has a natural seat for a latecomer: the bottom of the table.

## What Changes

- A person can join a Scum room with its code while a game is in progress, up to the 20-seat limit. They're seated on a waiting list, not dealt in.
- A waiting player sees a waiting screen that names the room, the round in progress and the people playing, and says they'll be dealt in next round as Scum. They can leave from there.
- When the host starts the next round, waiting players join the table at the bottom of the previous finish order: they're Scum and play last. If several joined, the latest is lowest. The deck count is recalculated for the new table size, and the usual class trades follow, so a newcomer at the bottom trades with the President.
- Seated players see who will join next round, both on the table and on the results screen.
- Only people can join mid-game. Adding computers stays limited to the lobby.

Out of scope: removing or replacing seated players mid-game, and letting waiting players watch the live table.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `games/scum`: new requirements for joining a game in progress, for the waiting player's view, and for newcomers being placed as Scum at the next deal.

## Impact

- `lib/scum.js`: `startNextScumRound` accepts newcomers, extends the finish order, and recalculates decks and titles
- `lib/scum-rooms.js`: join while in game, a `leave` action for waiting players, newcomers handed over at the next round, and a waiting view in `serializeRoom`
- `app/api/scum/rooms/[code]/route.js`: the `leave` action
- `components/scum-client.js`: the waiting screen and "joins next round" notes
- `tests/scum-rules.test.mjs`, `tests/scum-rooms.test.mjs`
