# Cover Your Assets

## Purpose

Cover Your Assets is a room-based implementation of the classic game for two to six human and
computer players. A match spans scored rounds until one player passes $1,000,000.

## Rules model

- `lib/cover-your-assets.js` owns deck composition, legal turn actions, asset stacks, challenge
  resolution, computer decisions, hand replenishment, and round scoring.
- New sets cover older sets. A player's first set is the protected nest egg, and only a later top set
  can be challenged.
- A challenge alternates matching asset or Wild cards until one player yields. The last player to
  reveal a card takes the original set and all challenge cards.
- At the end of every turn, players refill in table order beginning with the active player. Once the
  draw pile and all hands are empty, banked card values are added to match scores.

## Rooms

The rules run on the server (`lib/cover-your-assets-room-adapter.js` over `lib/cover-your-assets.js`)
in the shared `server_game_rooms` storage, which falls back to memory in local development. A seat
sends named actions and receives only its own view: other seats' hands and the draw pile are counts,
the top of the discard pile is public, and so are stacks and cards played into a challenge.

The room host's browser asks for each computer decision with one `computerStep`, including every
counter or yield within an asset challenge.
