# Monopoly

Monopoly owns property economics, turn stages, trades, buildings, debt, and bankruptcy.

## Language

**Manage Stage**: The post-roll stage where the active player may trade and build.

**Monopoly**: Ownership of every unmortgaged property in a color group.

**Debt**: An amount a player must satisfy through cash and legal mortgaging.

**Bankruptcy**: Elimination after all transferable value is surrendered to the creditor.

## Relationships

- A **Monopoly** permits even building during the **Manage Stage**.
- Unresolved **Debt** can produce **Bankruptcy**.

## Example dialogue

> **Dev:** "Can a mortgaged property complete a **Monopoly**?"
> **Domain expert:** "No, every property in the group must be unmortgaged."

## Rooms

- The rules run on the server (`monopoly/src/roomAdapter.ts` over `monopoly/src/game.ts`). A seat sends named actions and the server returns the game; Monopoly has no hidden hands, so every seat sees the whole game.
- Dice are rolled by the engine on the server and are never read from a request.
- Each decision belongs to one player: the current player rolls and manages, the player a pending card, purchase, tax, rent, debt or jail exit belongs to answers it, a trade is proposed by the proposer and answered by its recipient, an auction is played by its active bidder, and the owner mortgages and builds. Any other seat is refused and the game is unchanged.
- The host controls the local seats it added on its own device by naming them in `asPlayerId`; no one else may, and the host may not act for another human's seat. Computer players move one `computerStep` at a time when the host's browser asks.
- A trade expires on the server's clock: an early expiry request does nothing, and the browser asks again shortly after if the trade is still pending.
- The piece chosen on create and join travels as a game option; a piece already taken is refused with a message.

