# BANG!

BANG! owns hidden-role assignment, character abilities, distance and weapon range, and the stalemate bound for four to seven players.

## Language

**Role**: Sheriff, Deputy, Outlaw or Renegade; only the Sheriff is public.

**Character**: One of sixteen distinct characters that sets starting lives and a special ability.

**Quiet Turn**: A turn in which no living player's lives and no survivor set changed.

## Relationships

- The Sheriff has one more life than their character and takes the first turn.
- Starting hand size equals starting lives.
- The Sheriff and Deputies win when every Outlaw and the Renegade are eliminated; Outlaws win when the Sheriff falls; the Renegade wins as the last survivor.
- Sixty consecutive **Quiet Turns** end the round as a draw among survivors.

## Example dialogue

> **Dev:** "Can a board where nobody can reach anybody run forever?"
> **Domain expert:** "No, sixty quiet turns call it a draw."

## Rooms

- The rules run on the server (`lib/bang-room-adapter.js` over `lib/bang.js`). A seat sends named actions and receives only its own view.
- Other seats' roles are hidden except the Sheriff, eliminated players and, once the game ends, everyone. Other seats' hands arrive as face-down placeholders (the browser needs the count to decide whether Panic and Cat Balou have a target), and the draw pile is a count.
- Equipment and characters are public. A computer seat moves only when the host's browser asks for one `computerStep`.
