# Proposal

## Why

A detective's result ("is the person I checked a killer?") appears in a small banner that vanishes within seconds, when the host moves the night on to the angel. A detective can easily miss it, and the banner doesn't even say who was checked.

## What Changes

- Show each living detective a popup naming the player they checked and whether that player is a killer, e.g. "Sam is a killer" or "Sam is not a killer".
- The popup stays until the detective taps OK.
- The night does not move on to the angel until every living human detective has tapped OK; computer detectives count as ready.
- The main device (acting host) gets a "Continue" button, with a count such as "1 of 2 detectives ready", to move on without waiting for anyone who is idle or offline.
- The inline banner is replaced by the popup.

## Capabilities

### New Capabilities

### Modified Capabilities
- `games/mafia`: adds requirements for the detective result popup, for the night waiting on detectives to acknowledge, and for the host moving on without them.

## Impact

- `mafia-main/components/NightPhase.tsx`: popup replaces the inline banner; sends the acknowledgement.
- `mafia-main/App.tsx`: the detective step stores results, waits for acknowledgements, then advances; new host "Continue" handling.
- `mafia-main/services/NightRules.ts`: helper deciding which detectives still need to acknowledge.
- `mafia-main/types.ts`, `SessionCoordinator.ts`: a "detective result pending" flag on game state.
- `tests/mafia-night-rules.test.mjs`, `tests/mafia-session-coordinator.test.mjs`: new coverage.
- No database changes expected: acknowledgements reuse the existing per-round "ready" intent under a separate round key.
