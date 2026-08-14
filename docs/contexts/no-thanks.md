# No Thanks!

## Purpose

No Thanks! is a single-round, room-based implementation of Thorsten Gimmler's card game for 3–7 human and computer players. The room host can add or remove computer seats before starting and is responsible for advancing automatic computer turns.

## Rules model

- The deck contains one card of each value from 3 through 35.
- Nine cards are removed unseen. The remaining 24 cards form the round.
- Players begin with 11 chips at 3–5 players, 9 chips at 6 players, and 7 chips at 7 players.
- On a turn, a player takes the active card and every chip on it, or pays one chip and passes the choice left. A player without chips must take.
- Taking a card keeps the turn: a new active card is revealed and the same player chooses again.
- Only the lowest value in each consecutive card run scores. Each remaining chip subtracts one point. The lowest final score wins.

## Room model

Rooms use the shared `server_game_rooms` storage adapter under the `no-thanks` namespace. Local development falls back to in-memory storage, while deployed rooms require the configured Supabase service-role environment variables. Room updates use optimistic version checks and browser polling/broadcast synchronization, consistent with the newer room games.

## Computer players

Computer players compare the marginal score of the active card with the chips on it, favor cards that extend or bridge their runs, and become less willing to pass as their chip supply or the deck runs low. A computer with no chips always takes.
