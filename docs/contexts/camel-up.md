# Camel Up Context

## Purpose

Camel Up owns the complete second-edition race and betting game for three to eight human or computer players. Five racing camels move clockwise, two crazy camels move counterclockwise, and every camel can carry the stack above it.

## Model

- `lib/camel-up.js` owns lobby seats, randomized setup, ordered track stacks, spectator tiles, pyramid dice, leg and finish bets, partnerships, scoring, computer policy, and final ranking.
- Track stacks are arrays ordered bottom-to-top at logical positions. Moving a camel splits the array at that camel and carries the suffix.
- Leg tickets, pyramid tickets, money, spectator tiles, race order, and partnerships are public. Finish-card colors are private until final scoring; card owner and placement order are public.
- The fifth pyramid ticket ends a leg with one die unrevealed. Games with six or more seats resolve each partner's copy-or-decline choice before resetting the leg.
- A crossing in either camel direction ends the race. Racing camels carried counterclockwise over the line rank last.

## Boundaries

- `lib/camel-up-room-adapter.js` validates named actions and projects a seat-safe view; it never sends another seat's finish-card colors before final scoring.
- `lib/camel-up-engine-room.js`, the Camel Up room store, and `/api/camel-up/rooms` keep state and randomness on the server. The browser submits choices, never rolls or whole-state replacements.
- `components/camel-up-client.js` renders the shared landing, lobby, game bar, dialogs, results, and the game-specific sixteen-space track. It does not calculate authoritative results.
- Other games must not import Camel Up rules or state.
