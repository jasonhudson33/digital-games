# Proposal

## Why

A trial vote only resolves once every living player has voted, so one slow or idle player holds up a result everyone else is ready for. The table has no way to move on.

## What Changes

- Give the main device (the acting host) a "Finish Voting" button during a trial or runoff vote, showing how many have voted.
- Tapping it ends voting with the ballots cast so far and resolves it exactly as a complete vote would: verdict, runoff on a tie, or no elimination on a tied runoff.
- The button is disabled until at least one vote is in.
- The ballot reveal lists living players who did not vote.
- Voting is locked once the host finishes it; late votes are ignored.

## Capabilities

### New Capabilities

### Modified Capabilities
- `games/mafia`: adds a requirement for the host to finish voting early, and changes "Trial ballot reveal" so it also covers votes ended early and names players who did not vote.

## Impact

- `mafia-main/types.ts`: a vote-closed flag on game state and a non-voter list on the vote reveal.
- `mafia-main/App.tsx`: auto-resolve effect also fires when the flag is set; flag reset when a vote starts, a runoff begins, or a vote resolves.
- `mafia-main/services/DayRules.ts`, `SessionCoordinator.ts`: reveal builder and state defaults.
- `mafia-main/components/DayPhase.tsx`: the button, vote locking, and a "did not vote" line in the reveal.
- `tests/mafia-day-rules.test.mjs`, `tests/mafia-session-coordinator.test.mjs`: new coverage.
- No database or API changes.
