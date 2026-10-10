# Life

Life owns the board path, forced stops, family spaces, retirement and net-worth winner for two to six players.

## Language

**Stop Space**: A job, marriage, house, career-change or retire space that halts movement.

**Retirement**: Choosing Millionaire Estates or Countryside Acres.

## Relationships

- A baby space adds one child and twins add two, each awarding a life tile.
- The game ends when every player has retired.
- The richest Millionaire Estates retiree takes the bonus tiles, shared on ties; the highest net worth wins.

## Example dialogue

> **Dev:** "When does the game end?"
> **Domain expert:** "When everyone has retired, then net worth decides."

## Rooms

- The rules run on the server (`lib/life-room-adapter.js` over `lib/life.js`), including the lobby. A seat sends named actions and receives only its own view.
- The spin is chosen by the server. `spinLife` accepts a number as a third argument, which is how the browser used to pick its own result; the room's `spin` action never passes one, so a request cannot influence it. The wheel in the browser spins until the server answers and then shows the number it returned.
- Other seats' LIFE tile values (held face down) are counts, the LIFE tile pool and millionaire bonus are counts, and career cards on offer are shown only to the seat choosing among them. When the game finishes the tiles and bonus are revealed so the final net worth can be shown.
- Only the host's browser asks for computer moves, one `computerStep` at a time.

