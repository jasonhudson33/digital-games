# Tasks

## 1. Pass-group ceiling

- [x] 1.1 Export `SCUM_MAX_PASS_GROUPS = 4` and `getScumMaxPassGroups(playerCount)` from `lib/scum.js`, and use it in `getScumTradeGroups` and in game setup. Verify with new `tests/scum-rules.test.mjs` cases: 20 players → 4, 10 → 4, 6 → 3, 3 → 1, and a 20-player standings list with 4 groups trades 4/3/2/1 cards between places 1-4 and 20-17.
- [x] 1.2 Replace the three `floor(players / 2)` clamps in `lib/scum-rooms.js` (join, leave, `setScumRoomOptions`) with the helper. Verify with a `tests/scum-rooms.test.mjs` case where a 10-player room asking for 5 groups stores 4.
- [x] 1.3 Use the helper for `maximumGroups` in `components/scum-client.js`. Verify the lobby selector offers 0-4 for a 10-player room.

## 2. Twenty seats

- [x] 2.1 Set `SCUM_MAX_PLAYERS = 20` in `lib/scum-rooms.js`. Verify the existing "advertised maximum" test in `tests/scum-rooms.test.mjs` passes at 20 and rejects the 21st join and computer, and update its stale "3-10" comment.
- [x] 2.2 Add four names to `BOT_NAMES` in `lib/scum.js` (20 total, all unique). Verify with a test that a 20-seat computer game has distinct names and no "Player N" fallback.
- [x] 2.3 Add a `getScumDeckCount(20) === 5` assertion to `tests/scum-rules.test.mjs`, and verify that a 20-player deal gives every player 13 or 14 cards.
- [x] 2.4 Change the Scum catalogue entry in `lib/games.js` to `players: [3, 20]`, and verify that any catalogue test still passes.

## 3. Integration

- [x] 3.1 Run the full test suite (`npm test`) and verify it passes.
- [x] 3.2 Play a 20-seat computer game locally through one trade phase, and verify that only 4 trades are requested, the round starts, and computer turns stay responsive.

## Workflow follow-up

- Archive the change after review. The main `games/scum` spec Purpose has already been updated to "three to twenty players".
