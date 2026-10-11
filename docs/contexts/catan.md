# Catan

Catan owns board generation, production, building, trading, awards, and expansion rules.

## Language

**Ruleset**: The selected combination of Original, Seafarers, and Cities and Knights systems.

**Primary Turn**: The dice, trade, and build turn for the active player.

**Paired Turn**: The additional build and bank-trade stage used with five or six players.

**Pending Choice**: A required discard, robber, progress-card, or expansion decision blocking progression.

## Relationships

- A **Ruleset** determines the board, victory target, and available card systems.
- A **Primary Turn** cannot finish while a **Pending Choice** remains.
- A **Paired Turn** never rolls dice.

## Example dialogue

> **Dev:** "Can the **Paired Turn** play a development card?"
> **Domain expert:** "No, it is limited to building and bank trading."

## Rooms

- The rules run on the server (`lib/catan-room-adapter.js` over `lib/catan-engine.js`, `lib/catan-board.js` and `components/catan-rules.js`), including the lobby: joining (two to six), computers, color, ruleset, start and restart.
- The engine functions validate most of their own preconditions but not who is acting, so the adapter requires the turn (or the player a pending choice waits on), no other pending choice, affordability and a legal placement for every action.
- Dice (including the event and alchemy dice) are rolled by the server, and a robber steal picks the card on the server; the thief only chooses the victim.
- Other seats' resource, development and progress cards, the development and progress decks, and unrevealed victory points are counts or zero in each seat's view.
- A computer takes one step per host-requested `computerStep`. A card or knight the computer could not use used to leave it stuck forever; it now tries the next option.
