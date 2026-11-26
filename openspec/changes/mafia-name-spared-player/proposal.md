# Proposal

## Why

When the angel saves the killers' target, the morning result only says "A life was spared in the night." Nobody learns who was spared, so the table can't use the information or react to it.

## What Changes

- When a night attack is prevented by the angel's save, the morning result names the player who was spared, for example "Sam was attacked in the night but was spared."
- Every player sees it on the existing morning results screen.
- Only the name is shown; the spared player's card and role stay hidden.

## Capabilities

### New Capabilities

### Modified Capabilities
- `games/mafia`: adds a requirement that the morning result names a player spared by the angel.

## Impact

- `mafia-main/services/NightRules.ts`: result message in `resolveNight`.
- `tests/mafia-night-rules.test.mjs`: update the existing spared-life assertion.
- No state shape, database, or UI component changes; the results screen already prints every result line.
