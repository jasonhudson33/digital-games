# Proposal

## Why

Camel Up is playable and now explains each leg (see the archived `camel-up-leg-recap`), but it still looks and plays like a prototype. The track is a plain ring of boxes with small blob camels, the pyramid is a clipped triangle with a number, held bets are only a count, and every turn option sits in one bar of four unrelated fieldsets built from raw `<select>` elements. Placing a spectator tile means choosing "Space 9" from a dropdown instead of pointing at the board, and camels jump between spaces with no sense of movement. The game's appeal is watching stacks tumble and betting on what you see, so the interface should make that legible and enjoyable, especially on a phone.

## What Changes

- **Track:** redraw the sixteen-space ring as a readable path with direction cues and a clear finish line, larger camels whose stack order is obvious, spectator tiles that look like tiles, and a highlight on the unit that just moved. Camels animate between spaces; the motion is cosmetic and is skipped for users who prefer reduced motion.
- **Pyramid and dice:** replace the triangle-and-number with a pyramid that shows which of the six dice are still inside, beside a compact racing order.
- **Turn actions:** replace the four-fieldset bar with one clear choice of action per turn (leg bet, roll pyramid, spectator tile, secret finish bet, and partnership in six-plus games) with only the chosen action's controls expanded. Unavailable actions are shown disabled with a reason, and the primary action is a clear touch-sized button.
- **Spectator tiles from the board:** choose cheering or booing, then point at a highlighted legal space on the track instead of picking from a dropdown.
- **Bets at a glance:** show each camel's remaining leg-ticket values as a ticket stack, show each player's held leg tickets, pyramid tickets, tile and partner on their scoreboard card, and present secret finish bets as pickable camel cards with a winner/loser toggle.
- **Turn clarity:** make whose turn it is, and what the current player may do, obvious from the scoreboard and action panel.
- **Phone layout:** a layout designed for 320–430px, with the action panel docked at the bottom, instead of a shrunken desktop board.
- Out of scope: any rule, scoring, engine, API or storage change (the server and `lib/camel-up.js` are untouched), sound, a dark theme, and changes to the shared landing, lobby, game bar or dialogs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `games/camel-up`: adds requirements for choosing a spectator-tile space on the track, and for how the table presents the race, bets and available actions. Existing rules and scoring requirements are unchanged.

## Impact

- `components/camel-up-client.js` is slimmed to orchestration; new presentational modules for the board, the player and bet panels, the action panel, and the recap (moved from the client) are added under `components/`.
- `app/camel-up/camel-up.css` is largely rewritten; the dice tray and recap styles from the previous change are kept and restyled to match.
- A small pure helper for comparing camel positions between states, with a unit test; no engine or adapter change.
- `docs/contexts/camel-up.md` updated for the new component boundaries.
- No new dependency, route, storage or server behavior. Shared components in `components/ui/` are reused, not modified.
