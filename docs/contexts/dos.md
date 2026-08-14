# DOS context

## Product shape

- DOS is the original 2018 center-row game for 2–4 human or computer players.
- The host creates a five-character room code, manages computer seats, and starts rounds.
- Room state uses the shared `server_game_rooms` storage through the `dos` namespace and client polling/broadcast sync.

## Rules model

- The engine uses the official 108-card deck: 88 number cards, 8 colored Wild # cards, and 12 Wild DOS cards.
- A player may single-match a center number or double-match it with two cards whose values add to that number. Each center card may be matched once per turn.
- A single color match earns one center-row placement. A double color match also makes every opponent draw one.
- After matches, used cards are discarded, the center row refills to at least two, and earned bonus placements are made. A player who draws and makes no match must add a card to the center row.
- Wild DOS is a 2 of any color. A colored Wild # is any number from 1–10, including when either appears in the center row.
- Exactly two cards requires a DOS call; a missed call costs two cards when caught.
- Round winners score opponents' cards at face value, 20 for Wild DOS, and 40 for Wild #. The first player to 200 wins.

## Computer play

- Computer players favor matches that shed two cards and earn color bonuses, call DOS, complete required center placements, and otherwise draw/place legally.
- Only the host advances computer actions.
