# Proposal

## Why

Camel Up resets the table the moment the fifth pyramid ticket is taken. The fifth roll, the final leg order, and every player's payout are erased in the same server step that scores the leg, so players see money change with no explanation. Individual rolls are also hard to follow: the only record is one small line that is overwritten by the next turn (computer turns arrive every ~760ms) and is hidden on mobile.

## What Changes

- Record every pyramid roll in the leg as a public entry: who rolled, which die, which camel moved, the rolled number, and any spectator-tile payout and bonus move it caused.
- Capture a leg recap at the moment a leg is scored: final leg order, the leg's rolls, and a per-player breakdown (each leg ticket's payout, pyramid ticket, spectator-tile income, partner copy, money before and after). The recap survives the leg reset.
- Show the leg's rolls as a persistent dice tray with the rolled number for each camel, plus a clear notice for each new roll.
- Show a leg-end recap dialog to every player when a leg is scored. It is non-blocking: play continues underneath and each player dismisses it locally. Host-driven computer steps wait while the host's recap dialog is open.
- When the race ends, show the final leg's recap first and then resolve the overall winner and loser bets card by card, with each card's owner, camel, and payout, before the final standings.
- Out of scope: any visual redesign of the track, ticket cards, or action bar (a separate follow-up change, `camel-up-redesign`), and any rule change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `games/camel-up`: adds requirements for the public per-leg roll record, the leg-end recap with per-player payout breakdown, and the final-race recap of overall bets. Existing scoring and turn rules are unchanged.

## Impact

- `lib/camel-up.js`: roll history, tile-hit reporting from camel movement, recap construction in leg and race scoring, per-leg starting money.
- `lib/camel-up-room-adapter.js`: no new actions; recap fields pass through the seat-safe view (they contain only public information until the race is finished).
- `components/camel-up-client.js` and `app/camel-up/camel-up.css`: dice tray, roll notice, leg-recap dialog, final recap sequence, computer-pause while the host's recap is open.
- `tests/camel-up-rules.test.mjs`, `tests/camel-up-engine-room.test.mjs`, and `docs/contexts/camel-up.md`.
- No new dependency, route, or storage table. Stored rooms from before this change have no recap or roll history; the client must tolerate their absence.
