# Tasks

## 1. Shared module and pacing hook

- [x] 1.1 Create `lib/computer-speed.js` with the four presets, the 600ms default, `normalizeComputerDelay` and `computerDelayOf`, plus a helper that builds the control's props from a room's players, speed and change handler (nothing when there are no computers)
- [x] 1.2 Create `lib/use-computer-pacer.js` (`useComputerPacer`: arm one timer when the host is enabled and a computer is due, restart on a new room state, read the delay when it arms, return `{ waiting }`)
- [x] 1.3 Tests: preset list and default, normalisation of listed, unlisted and non-numeric values, `computerDelayOf` for rooms with and without the field

## 2. Engine room

- [x] 2.1 Add the `__computerMs` bookkeeping key to `lib/engine-room.js` (split out in `split()`, written back in `persist()`) and `computerDelayMs` to every `viewFor` view
- [x] 2.2 Add the reserved `setComputerSpeed` action: any seated human, listed values only, unchanged value is a no-op, handled before the adapter lookup and added to `RESERVED_ACTIONS`
- [x] 2.3 Make `useEngineRoom` use `useComputerPacer`, remove its `computerDelay` option, and return the control's props (`null` when the room has no computers)
- [x] 2.4 Tests in the engine-room tests: new and old rooms read Normal; a guest changes the speed and every seat sees it; an unseated or unlisted request is rejected; the value survives a reload

## 3. Control in the shared shell

- [x] 3.1 Build `ComputerSpeedControl` in `components/ui/` (button with the current speed, four-option radio list, closes on choice, Escape and outside click, 44px targets, announces the change)
- [x] 3.2 Render it from `GameHeader` and `Lobby` in `components/ui/table-shell.js` when a `computerSpeed` prop is given, and style it in `app/table.css`
- [x] 3.3 Check it fits a 320px game bar and lobby without sideways scroll, and extend `scripts/layout-check.mjs` or the mobile audit to confirm a room with computers shows it and a room without does not

## 4. Engine-room clients that pass `computerDelay` today

- [x] 4.1 Bang, Five Crowns, Hearts, Phase 10 and 7-Up: drop `computerDelay`, keep `computerDue`, pass the control to the game bar and lobby
- [x] 4.2 Camel Up: the same, keeping its pending-recap condition in `computerDue` and removing its own `stepComputer` calls where the hook now covers them

## 5. Engine-room clients with their own timers

- [x] 5.1 Cover Your Assets, Dominion, Flip 7, Life and No Thanks: delete the private timer and `stepComputer` effect, pass `computerDue` to the hook, pass the control
- [x] 5.2 Qwirkle, Sequence, Splendor, Spyrium and Ticket to Ride: the same
- [x] 5.3 DOS, UNO and Stratego (timers at 650, 680 and 850ms): the same, keeping their thinking labels driven by the hook's `waiting`
- [x] 5.4 Viticulture: replace its 680ms effect with the hook and pass the control
- [x] 5.5 Catan and Risk: replace the computer timers (700 and 950ms) with the hook, keep the human dice-roll pauses, and fold `computerHasAction` and the bot-thinking conditions into `computerDue`
- [x] 5.6 Monopoly (`monopoly/src/main.tsx`): replace its timer with the hook and pass the control
- [x] 5.7 Confirm no client still sets its own computer delay (a search for `computerDelay` and for timers that call `stepComputer`)

## 6. Skull King (own rooms)

- [x] 6.1 Split `runSkullKingComputers` into a pure `computerMove(game)`, stop calling the loop from human actions and start, and keep the loop only for tests through a helper
- [x] 6.2 Add the host-only `computerStep` and `setComputerSpeed` room actions, `computerDelayMs` and `computerDue` in the lobby and game views, and both actions in the API route
- [x] 6.3 Make the client step computers with `useComputerPacer` and pass the control
- [x] 6.4 Update `tests/skull-king-rooms.test.mjs` to step computers, and add tests for host-only stepping, nothing due, and the speed setting

## 7. Pinochle (own rooms)

- [x] 7.1 Split `runPinochleComputers` into a pure `computerMove(game)` and stop calling the loop from human actions and start
- [x] 7.2 Add `computerStep`, `setComputerSpeed`, `computerDelayMs`, `computerDue` and the route entries
- [x] 7.3 Client stepping and the control; update `tests/pinochle-rooms.test.mjs` and add the new tests

## 8. Scum (own rooms)

- [x] 8.1 Split `runScumComputers` into a pure `computerMove(game)` and stop calling the loop from human actions and start
- [x] 8.2 Add `computerStep`, `setComputerSpeed`, `computerDelayMs`, `computerDue` and the route entries
- [x] 8.3 Client stepping and the control; update `tests/scum-rooms.test.mjs` and add the new tests

## 9. Hand & Foot (own rooms)

- [x] 9.1 Split `runHandFootComputers` into a pure `computerMove(game)` and stop calling the loop from human actions and start
- [x] 9.2 Add `computerStep`, `setComputerSpeed`, `computerDelayMs`, `computerDue` and the route entries
- [x] 9.3 Client stepping and the control; update `tests/hand-and-foot-rooms.test.mjs` and the room service test, and add the new tests

## 10. Killer Bunnies (own rooms)

- [x] 10.1 Split its computer loop into a pure `computerMove(game)` and stop calling it from human actions and start
- [x] 10.2 Add `computerStep`, `setComputerSpeed`, `computerDelayMs`, `computerDue` and the route entries
- [x] 10.3 Client stepping and the control; update `tests/killer-bunnies-rooms.test.mjs` and add the new tests

## 11. Secret Hitler (own rooms)

- [x] 11.1 Split its computer loop into a pure `computerMove(game)` and stop calling it from human actions and start
- [x] 11.2 Add `computerStep`, `setComputerSpeed`, `computerDelayMs`, `computerDue` and the route entries
- [x] 11.3 Client stepping and the control; update `tests/secret-hitler-rooms.test.mjs` and add the new tests

## 12. Verify

- [x] 12.1 Run the full test suite, typecheck, frontend validation and build (`npm run check`)
- [x] 12.2 Run the mobile audit at 320px and 1280px on a computer-only room and a human-only room, confirming the control shows in the first and not the second
- [x] 12.3 Play one game from each family with computers: change the speed from a second seat mid-game, see the pace change on the next move, reload and see the speed kept
- [x] 12.4 Confirm all six custom games now show computers playing one move at a time
