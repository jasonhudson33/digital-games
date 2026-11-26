# Design

## Context

Voting state (`dayVotes`, voter to target) is already in shared room state, but the host clears it when the vote resolves (`App.tsx` auto-resolve effect), and the UI shows only counts. A tied runoff jumps straight to `NIGHT_TRANSITION` with no results screen. Results are acknowledged through `phaseResult` / `acknowledgePhaseResult`.

## Goals / Non-Goals

**Goals:**
- Reveal ballots after the last vote, on verdict, runoff, and unbroken-tie outcomes.
- Keep the change inside existing room state and the existing acknowledge flow.

**Non-Goals:**
- True secrecy of votes in transit. `dayVotes` is already readable by every client; hiding is UI-level, as it is today.
- Showing past rounds' ballots or a vote history log.
- Changing how ties and runoffs are decided.

## Decisions

- **New `voteReveal` field on `GameState`** holding `{ ballots: Record<voterId, targetId>, isRunoff }`, written by the host in the same update that clears `dayVotes`. Alternative: put ballots on `PhaseResult`. Rejected because the runoff case has no phase result, and one field serves all three outcomes.
- **Reveal is the existing resolution moment.** The host already waits 1.2s after the last vote; the verdict and tie screens are acknowledged by the narrator, so ballots stay on screen as long as needed. The runoff screen shows the first ballot as a "Tied vote" panel until the runoff resolves.
- **Unbroken tie goes through `DAY_RESULTS`** via a vote `PhaseResult` with `eliminatedPlayerId: null` and `nextPhase: NIGHT_TRANSITION`. This reuses the acknowledge flow and gives the ballots a screen. Alternative: a timed overlay on the night screen. Rejected as more new UI and timing logic. `nightSelectionHistory` is reset at resolution, as today.
- **Clear `voteReveal`** when a new vote is called, on replay, and when the next day begins, so stale ballots never show.
- **Pure helper in `DayRules.ts`** groups ballots by candidate with voter names, so rendering logic is unit-testable.

## Risks / Trade-offs

- Verdict screen gets longer with large tables → render compact voter name chips, grouped per candidate.
- Existing rooms mid-vote during deploy lack `voteReveal` → treat missing field as no reveal; `migrateGameState` defaults it.
- Tied-runoff now needs a narrator acknowledge → matches every other result screen; small added friction.
