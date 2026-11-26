# Proposal

## Why

During a Mafia trial vote, players only see a vote count per candidate. Nobody learns who voted for whom, so the table can't discuss or hold anyone accountable. The ballots also vanish the moment the vote resolves.

## What Changes

- After every living player has voted, reveal each voter's choice to all players (living and eliminated).
- Show the reveal on the verdict screen, and on the runoff screen when the first vote ties.
- A tie that cannot be broken (a tied runoff) gets a results screen showing the ballots and "no one is eliminated", instead of skipping straight to night.
- Votes stay hidden in the UI until the last vote is in, so late voters can't follow the crowd.
- Keep the ballot snapshot in room state so it survives the existing reset of in-progress votes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `games/mafia`: adds a requirement that trial ballots are revealed to everyone once voting completes, including tie and runoff outcomes.

## Impact

- `mafia-main/types.ts`: new vote-reveal field on game state.
- `mafia-main/App.tsx`: host vote resolution records the reveal and routes an unbroken tie through a results screen.
- `mafia-main/services/DayRules.ts`, `ResultRules.ts`: helpers to build the reveal and a no-elimination vote result.
- `mafia-main/components/DayPhase.tsx`: render voter names under each candidate in results and runoff views.
- `tests/mafia-day-rules.test.mjs`, `tests/mafia-result-rules.test.mjs`: new coverage.
- No database or API changes; reveal travels in existing room state.
