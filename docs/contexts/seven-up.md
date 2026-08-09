# Seven Up

Seven Up owns the rules and private player view for sequential suit-card play.

## Language

**Room**: A shared game identified by a code and containing device-bound players.

**Hand**: Cards visible only to the player who owns them.

**Dealer**: The player whose left-hand neighbor receives the first card.

## Relationships

- A **Room** has one **Dealer** and one **Hand** per player.
- A **Hand** becomes public only as its cards are played.

## Example dialogue

> **Dev:** "Can the **Dealer** receive the first card?"
> **Domain expert:** "No, dealing starts with the player to the dealer's left."
