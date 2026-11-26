# Proposal

## Why

At the start of a Mafia game each role card appears on screen immediately, so anyone looking at the device can see it before the owner is ready. Separately, the narration audio and phase controls live on whichever living player is acting host, so when the host is eliminated both move to another device mid-game.

## What Changes

- On the role reveal screen, hide the player's card and role behind a "reveal" button. Revealing shows the card and role, then the "I Understand" acknowledge button.
- Make the first player (room creator) the permanent main device: they stay acting host for the whole game, alive or eliminated, keeping narration audio and phase controls.
- If the main device is absent, host duty falls back to the next present player in seat order (player two, then three, and so on) and returns to the first player when their device comes back.
- **BREAKING**: acting host no longer requires being alive; the existing "living player acts as host" rule is replaced.

## Capabilities

### New Capabilities

### Modified Capabilities
- `games/mafia`: adds a requirement that a role card stays hidden at game start until its owner chooses to reveal it.
- `platform/mafia-rooms`: changes "Acting host" so the first player hosts for the whole game regardless of being eliminated, with seat-order fallback.

## Impact

- `mafia-main/components/RoleReveal.tsx`: reveal step before the card and acknowledge button.
- `mafia-main/services/SessionCoordinator.ts`: `selectActingHostId` ordering and living-status rules.
- `mafia-main/App.tsx`: callers of acting-host selection; verify host-only controls and audio work for an eliminated host.
- `tests/mafia-session-coordinator.test.mjs`: replace the living-only failover test with new host-selection cases.
- No database or API changes.
