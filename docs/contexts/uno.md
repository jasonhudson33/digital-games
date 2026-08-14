# UNO context

## Product shape

- UNO is a private room game for 2–10 human or computer players with a host-selectable Classic UNO or UNO Flip ruleset.
- The host creates a five-character room code, manages computer seats in the lobby, and deals each later round.
- Room state uses the shared `server_game_rooms` storage through the `uno` namespace and client polling/broadcast sync.

## Rules model

- The engine uses the classic 108-card deck: 76 numbers, 24 colored actions, 4 Wilds, and 4 Wild Draw Fours.
- Players match by active color, number, or action. Drawing voluntarily restricts the player to the drawn card for the rest of that turn.
- Draw Two, Skip, Reverse, opening action-card behavior, two-player Reverse behavior, and discard reshuffling follow Mattel's classic rules.
- Wild Draw Four legality is recorded when played so the victim can accept or challenge. Successful and failed challenges apply the official 4/6-card outcomes.
- A player may arm an UNO call before playing down to one card. A missed call remains catchable until the next player acts and costs two cards.
- Round winners score opponents' cards at face value / 20 / 50. The first player to 500 wins.

## UNO Flip ruleset

- The 112 physical cards each have a Light Side and Dark Side face. All hands and both piles start on the Light Side.
- Playing FLIP reverses the draw and discard pile order and exposes the opposite face of every card. The newly exposed discard controls the next match.
- Light Side actions are Draw One, Reverse, Skip, FLIP, Wild, and challengeable Wild Draw Two.
- Dark Side actions are Draw Five, Reverse, Skip Everyone, FLIP, Wild, and challengeable Wild Draw Color.
- Wild Draw Color draws through the chosen color; an unsuccessful challenge adds two more cards.
- Scoring uses the face showing when the round ends: Draw One 10; Draw Five, Reverse, Skip, and FLIP 20; Skip Everyone 30; Wild 40; Wild Draw Two 50; Wild Draw Color 60.

## Computer play

- Computer players prefer legal high-value discards, select the active-side color most represented in their remaining hand, call UNO automatically, draw/pass correctly, and resolve Classic or Flip wild challenges.
- Only the host advances computer actions, preventing multiple clients from racing the same bot turn.
