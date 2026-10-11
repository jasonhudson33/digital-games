# Camel Up Context

## Purpose

Camel Up owns the complete second-edition race and betting game for three to eight human or computer players. Five racing camels move clockwise, two crazy camels move counterclockwise, and every camel can carry the stack above it.

## Model

- `lib/camel-up.js` owns lobby seats, randomized setup, ordered track stacks, spectator tiles, pyramid dice, leg and finish bets, partnerships, scoring, computer policy, and final ranking.
- Track stacks are arrays ordered bottom-to-top at logical positions. Moving a camel splits the array at that camel and carries the suffix.
- Leg tickets, pyramid tickets, money, spectator tiles, race order, and partnerships are public. Finish-card colors are private until final scoring; card owner and placement order are public.
- The fifth pyramid ticket ends a leg with one die unrevealed. Games with six or more seats resolve each partner's copy-or-decline choice before resetting the leg.
- Every pyramid roll is appended to `legRolls` (roller, die, camel, value, spectator-tile hit). When a leg is scored, `legRecap` captures the leg order, those rolls, and a per-player breakdown (ticket payouts, pyramid, tile income, partner copy, before/after money) before the reset; the next recap replaces it. The race-ending recap also carries card-by-card overall-bet results in `finish`, which exists only once the phase is `finished`.
- Recaps are public and non-blocking: no phase waits on them, and each client decides locally when it has been dismissed. Rooms stored without `legRolls`, `legRecap` or `moneyAtLegStart` still play.
- A crossing in either camel direction ends the race. Racing camels carried counterclockwise over the line rank last.

## Boundaries

- `lib/camel-up-room-adapter.js` validates named actions and projects a seat-safe view; it never sends another seat's finish-card colors before final scoring.
- `lib/camel-up-engine-room.js`, the Camel Up room store, and `/api/camel-up/rooms` keep state and randomness on the server. The browser submits choices, never rolls or whole-state replacements.
- `components/camel-up-client.js` wires the room, the shared landing, lobby, game bar, rules and results, and holds the local turn choice (selected action, tile side and space) and recap-dismissal state. It does not calculate authoritative results.
- `components/camel-up-board.js` draws the sixteen-space ring, camels, spectator tiles, pyramid and racing order, and animates camels between spaces. The animation only compares what this browser last rendered (`lib/camel-up-motion.js`); it never decides where a camel is.
- `components/camel-up-players.js` shows each bettor's public holdings, the leg-ticket stacks, and the overall decks. Finish-card camels appear only on the viewer's own cards.
- `components/camel-up-actions.js` is the one-choice turn panel. `lib/camel-up-actions.js` mirrors the engine's checks so a disabled action can say why; the server still validates every action. Tile placement points at spaces on the board that the engine's `legalSpectatorSpace` allows.
- `components/camel-up-recap.js` holds the dice tray and the leg and final recap dialogs.
- Other games must not import Camel Up rules or state.
