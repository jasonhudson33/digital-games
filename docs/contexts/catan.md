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
