# Tasks

## 1. Roll record in the engine

- [x] 1.1 Make `moveCamel` in `lib/camel-up.js` report a spectator-tile hit (`ownerId`, `side`, `from`, `to`) on its returned state without changing its exported signature; verify the existing movement tests in `tests/camel-up-rules.test.mjs` still pass
- [x] 1.2 In `rollPyramid`, append an entry (`n`, roller id/name, die, face, camel, value, tile or `null`) to `legRolls`, keep `lastRoll` as the latest entry, and clear the transient move event; add rules tests for racing die, grey die, a cheering tile, a booing tile, and the race-ending roll, and verify they pass
- [x] 1.3 Initialise `legRolls` and per-player `moneyAtLegStart` in `startGame` and the leg reset, defaulting safely for stored rooms that lack them; add a test that a room without these fields can still roll and score

## 2. Leg and final recap in the engine

- [x] 2.1 Build `legRecap` in `finishLegScoring` before the reset (leg, ranking, rolls, per-player rows with ticket payouts, pyramid, tile income, copied reward, before, after), clear the live `legRolls`, and publish only after partnership choices finish; add tests for a normal leg, a leg with tile income, a leg with a partner copy, and the zero floor, verifying `after` matches scored money
- [x] 2.2 Extend `finishRace` to attach `legRecap.final = true` and ordered winner/loser bet resolutions (owner, camel, correct, delta) and fold their deltas into `after`; add tests for correct and incorrect cards, ordering, and that no finish-card camel appears in any recap before the phase is `finished`
- [x] 2.3 Add an engine-room test in `tests/camel-up-engine-room.test.mjs` that the fifth roll's recap is delivered to every seat while a seat's own unplayed finish cards remain hidden, and that the next leg's first player can act immediately
- [x] 2.4 Update `docs/contexts/camel-up.md` with the roll record, recap, and non-blocking recap model, and verify the Model and Boundaries sections still describe the code

## 3. Client display

- [x] 3.1 Add a dice-tray component to `components/camel-up-client.js` showing the leg's five slots with camel color, roller, and rolled number, and a per-roll notice (including tile payout) keyed on the newest roll; verify with the app running (and `npm run build` or the project's lint) that it renders on desktop and mobile widths and is not hidden at the mobile breakpoint
- [x] 3.2 Add the leg-recap dialog (leg order, rolls, per-player breakdown with before/after) built on the shared `ChoiceModal`, opened automatically for a newer leg than the locally dismissed one and remembered across refresh; verify by playing a computer-filled room through a leg end
- [x] 3.3 Make the final sequence show the final leg recap, then the winner and loser bet resolutions, then the existing `RaceResults` standings; verify by playing a race to the finish
- [x] 3.4 Hold host-driven computer steps in the `computerDue` callback while the host's recap dialog is open, and verify computers resume after Continue and that human play is never gated
- [x] 3.5 Add styles for the tray, notice, and recap to `app/camel-up/camel-up.css` following existing tokens and breakpoints, and verify no horizontal overflow at the 650px mobile breakpoint

## 4. Integration

- [x] 4.1 Run the full test suite and the repo's mobile layout audit, and play a six-plus-seat partnership game through a leg end to confirm the recap includes copied rewards
