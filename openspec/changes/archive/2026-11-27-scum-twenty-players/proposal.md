# Proposal

## Why

Scum is a party game, and tables of more than ten people want to play it together. Today rooms stop at ten seats. Raising the cap to twenty exposes a trade problem: the number of trade pairs can grow to half the table, and the top pair trades as many cards as there are pairs. At twenty players that would mean the President and Scum swapping ten of their roughly thirteen cards.

## What Changes

- Scum rooms seat from three to twenty players (previously three to ten), online and with computer seats.
- The host's pass-group option is capped at four groups regardless of table size (previously up to half the table). Players outside the trade groups do not trade and play as Citizens.
- **BREAKING** (behavioral): nine- and ten-player rooms can no longer pick five pass groups; existing rooms with five groups are clamped to four.
- Computer seats get enough distinct names to fill a twenty-seat table.
- The game catalogue advertises 3-20 players for Scum.

Out of scope: changing the opponent layout for large tables on phones (we'll ship and watch), and Hand and Foot, which already supports up to sixteen players.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `games/scum`: the player range rises to three to twenty, and a new requirement caps class trades at four groups, with untraded middle players as Citizens.

## Impact

- `lib/scum-rooms.js`: seat cap and pass-group clamping
- `lib/scum.js`: trade-group computation, bot names
- `components/scum-client.js`: lobby pass-group selector
- `lib/games.js`: catalogue player range
- `tests/scum-rules.test.mjs`, `tests/scum-rooms.test.mjs`
- No API shape, storage, or dependency changes.
