# Viticulture

Viticulture owns seasonal worker placement, vineyard and cellar upkeep, orders, visitors and the race to 20 victory points for two to six players.

## Language

**Season**: Spring wake-up, then summer and winter, each with six action spaces.

**Visitor**: Yellow summer or blue winter cards played in their season.

**Cellar**: A medium cellar makes wine to value 6, a large cellar to value 9.

## Relationships

- The game ends at the end of a year in which a player has 20 or more victory points.
- The highest score wins; ties share the win.

## Example dialogue

> **Dev:** "Does the game stop the moment someone hits 20?"
> **Domain expert:** "No, it ends when that year ends."

## Rooms

- The rules run on the server (`lib/viticulture-room-adapter.js` over `lib/viticulture.js`). A seat sends named actions and receives only its own view.
- Other seats' vine, order and visitor cards are counts per kind, and the four decks and their discard piles are counts. Fields, structures, grapes, wine, workers and board placements are public.
- Only the host's browser asks for computer moves, one `computerStep` at a time.

