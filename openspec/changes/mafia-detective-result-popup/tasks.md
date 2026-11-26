# Tasks

## 1. State and rules

- [x] 1.1 Add `detectivePending` to `GameState` in `mafia-main/types.ts`, default it in `createInitialGameState`/`migrateGameState`, and verify new cases in `tests/mafia-session-coordinator.test.mjs`
- [x] 1.2 Add a `NightRules.ts` helper returning living human detectives who have not acknowledged (computers excluded), and verify cases in `tests/mafia-night-rules.test.mjs` (none pending, some pending, only computers, dead detective ignored)
- [x] 1.3 Check that `mafia_submit_intent` accepts a `ready` intent under an offset round key; verify by reading the latest function in `supabase/migrations`, and update the design and add a migration task if it does not

## 2. Host flow

- [x] 2.1 In the `App.tsx` detective step, store results, set `detectivePending`, and keep the phase until acknowledgements are complete or the flag is cleared; verify with `npm run typecheck`
- [ ] 2.2 Add the host effect that clears the flag when no human detective is pending, then speaks the angel narration and moves to `NIGHT_ANGEL` and clears the acknowledgement round; verify by a playthrough with one human detective and one computer detective
- [ ] 2.3 Add a host "Continue" handler that clears the flag; verify the angel step starts with an unacknowledged detective, including when the host is eliminated

## 3. UI

- [ ] 3.1 In `NightPhase.tsx`, replace the inline banner with a popup naming the checked player and killer status, dismissed by tapping OK, which sends the acknowledgement; verify visually as a detective and that no other role sees it
- [ ] 3.2 Show the host "Continue (n of m detectives ready)" during the detective wait and verify it is hidden for other players
- [ ] 3.3 Verify a reload before tapping OK shows the popup again, and a detective who is skipped by Continue still sees the result until they dismiss it

## 4. Integration

- [x] 4.1 Run the full tests, `npm run typecheck` and `openspec validate mafia-detective-result-popup --strict`, and verify all pass
