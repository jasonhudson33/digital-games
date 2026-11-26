# Tasks

## 1. Data and rules

- [x] 1.1 Add `voteReveal` to `GameState` in `mafia-main/types.ts`, default it in `createInitialGameState`/`migrateGameState`, and verify `tests/mafia-session-coordinator.test.mjs` passes with a case for the default
- [x] 1.2 Add a `DayRules` helper that groups ballots by candidate with voter ids, and verify new cases in `tests/mafia-day-rules.test.mjs` (one winner, tie, no votes for a candidate)
- [x] 1.3 Allow `createVotePhaseResult` to produce a no-elimination tie result (`eliminatedPlayerId: null`, next phase night), and verify new cases in `tests/mafia-result-rules.test.mjs`

## 2. Host resolution

- [x] 2.1 In the `App.tsx` auto-resolve effect, write `voteReveal` with the final ballots on elimination, runoff, and tied-runoff outcomes, and verify with a typecheck (`tsconfig.typecheck.json`)
- [ ] 2.2 Route a tied runoff to `DAY_RESULTS` with the tie result instead of `NIGHT_TRANSITION`, resetting `nightSelectionHistory`, and verify the acknowledge flow reaches night in a manual two-tab/computer-seat playthrough
- [ ] 2.3 Clear `voteReveal` when a vote is called, on replay, and when the next day starts; verify no stale ballots appear in the playthrough

## 3. UI

- [ ] 3.1 In `DayPhase.tsx` results view, render voter names under each candidate and the "no one is eliminated" tie text; verify visually with a verdict and a tied runoff
- [ ] 3.2 Show the first-vote ballots as a "Tied vote" panel on the runoff screen; verify visually after forcing a first-round tie with computer seats
- [ ] 3.3 Confirm no voter names render while voting is in progress and eliminated viewers see the reveal; verify in the manual playthrough

## 4. Integration

- [x] 4.1 Run the full Mafia test files and `openspec validate mafia-vote-reveal`, and verify both pass
