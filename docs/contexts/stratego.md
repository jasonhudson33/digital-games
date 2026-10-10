# Stratego

Stratego owns the 10×10 board, hidden armies, combat and no-legal-move loss for two players.

## Language

**Army**: 40 pieces from Marshal (1) to Scout (9), Spy, six Bombs and the Flag.

**Lake**: Eight impassable squares.

## Relationships

- Bombs and the Flag never move; a Scout moves any distance in a straight open line.
- A lower rank wins, equal ranks both fall, only a Miner defuses a Bomb, and a Spy beats the Marshal only when attacking.
- Capturing the Flag wins; a player with no legal move loses.
- Opposing ranks stay hidden until combat reveals them.

## Example dialogue

> **Dev:** "The Marshal attacks the Spy?"
> **Domain expert:** "The Marshal wins; the Spy only wins by attacking."

## Rooms

- The rules run on the server (`lib/stratego-room-adapter.js` over `lib/stratego.js`). A seat sends named actions and receives only its own view.
- A piece's id names its kind, so an opponent's live pieces are sent under opaque ids derived from their square, with no kind, rank, label or icon. During setup the opponent's placement is withheld entirely and only their `ready` flag is shown.
- A piece is shown in full once it is captured or the game is over; the two pieces in `lastBattle` are public there. Each seat's view of `moveHistory` holds only its own moves, which is all the two-square rule reads.
- Only the host's browser asks for computer moves, one `computerStep` at a time.

