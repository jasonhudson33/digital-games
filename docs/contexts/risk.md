# Risk

Risk owns the 42-territory map, reinforcement, dice combat, card trades and conquest for two to six human or computer commanders.

## Language

**Commander**: A human or computer player in a room.

**Forced Trade**: A card set that must be traded before reinforcing.

## Relationships

- A game needs two to six commanders and is played in shared rooms.
- A player wins by owning every territory.

## Example dialogue

> **Dev:** "Is Risk solo against the computer?"
> **Domain expert:** "No, it is rooms of two to six commanders, humans or computers."

## Rooms

- The rules run on the server (`lib/risk-room-adapter.js` over `lib/risk.js`), including the lobby: creating a room, joining (two to six commanders), adding or removing computers, choosing a color, the card trade mode, starting and restarting all happen there.
- Most engine functions act on the current player without being told who is asking, so every in-game action (reinforce, trade, attack, move in after a conquest, fortify, end phase) is refused for any seat that does not hold the turn. Battle dice are rolled by the server; a request can only choose how many dice to throw.
- Other seats' territory cards are counts, and the card deck and discard pile are counts. The map is public.
- A computer takes its whole turn in one host-requested `computerStep`. A computer that conquers the last rival while holding cards now finishes its turn; before, its trade and reinforcement loops spun forever.

