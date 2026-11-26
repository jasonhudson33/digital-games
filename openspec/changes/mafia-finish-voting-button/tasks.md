# Tasks

## 1. State and rules

- [x] 1.1 Add `voteClosed` to `GameState` and `nonVoterIds` to `VoteReveal` in `mafia-main/types.ts`, default them in `createInitialGameState`/`migrateGameState`, and verify new cases in `tests/mafia-session-coordinator.test.mjs`
- [x] 1.2 Extend `createVoteReveal` in `DayRules.ts` to record living players who did not vote, and verify new cases in `tests/mafia-day-rules.test.mjs` (everyone voted, some idle, victim still counted as a living player at vote time)

## 2. Host resolution

- [x] 2.1 In the `App.tsx` auto-resolve effect, also resolve when `voteClosed` is set and at least one vote exists, passing the living players at vote time to the reveal; verify with `npm run typecheck`
- [ ] 2.2 Reset `voteClosed` when a vote is called, when a runoff begins, on resolution, on acknowledge and on replay or new game; verify with a manual playthrough that a runoff starts unlocked
- [ ] 2.3 Verify a tie after an early finish goes to a runoff, and a tied runoff after an early finish goes to the no-elimination result screen

## 3. UI

- [ ] 3.1 In `DayPhase.tsx`, show "Finish Voting (n of m voted)" to the acting host only, disabled until a vote exists, and verify it is hidden for other players and shown to an eliminated host
- [ ] 3.2 Disable voting buttons once `voteClosed` is set and verify a late tap does not change the result
- [ ] 3.3 Show a "Did not vote" line in the reveal listing idle players; verify visually after an early finish with computer seats

## 4. Integration

- [x] 4.1 Run the full tests, `npm run typecheck` and `openspec validate mafia-finish-voting-button --strict`, and verify all pass
