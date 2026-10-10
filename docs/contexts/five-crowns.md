# Five Crowns

Five Crowns owns the eleven-round rummy structure, rotating wild rank, going out, and lowest-score winning for two to seven players.

## Language

**Wild Rank**: The rank equal to the round's hand size; jokers are always wild too.

**Going Out**: Melding every card in hand, which gives each other player one final turn.

## Relationships

- Round one deals three cards and round eleven deals thirteen.
- Unmelded cards score their rank, 20 for the wild rank and 50 for a joker.
- The lowest total after round eleven wins.

## Example dialogue

> **Dev:** "Are fives wild every round?"
> **Domain expert:** "Only in round five; jokers are wild always."

## Rooms

- The rules run on the server (`lib/five-crowns-room-adapter.js` over `lib/five-crowns.js`). A seat sends named actions and receives only its own view: other seats' hands and the draw pile are counts, only the top discard is sent, and melds laid down at the end of a hand are public.
- Only the host's browser asks for computer moves, one `computerStep` at a time.
- Dealing puts the opening discard on the table and removes it from the draw pile; it used to stay on top of the pile as well, so the same card could be drawn again.
