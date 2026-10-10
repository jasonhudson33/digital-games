# Gate client-authoritative rooms with seat tokens

Eighteen games (BANG!, Cover Your Assets, Dominion, DOS, Five Crowns, Flip 7, Life, No Thanks!, Phase 10, Qwirkle, Risk, Sequence, Splendor, Spyrium, Stratego, Ticket to Ride, UNO, Viticulture) compute state in the browser and store it whole through `lib/client-room-route.js`. The room code used to be the only access control.

Each room now records a SHA-256 hash of a secret token per seat (`lib/room-seats.js`). Creating a room or joining a lobby returns that seat's token, which the browser keeps in `localStorage` and sends as `X-Seat-Token`. Once a game leaves the lobby, reading or writing needs a seated player's token; a seated player may not remove another human from the roster. Rooms stored before this change keep working, tokenless, until they expire after 24 hours.

Catan and Monopoly use their own browser-side Supabase tables and are not covered yet.

## Consequences

- A stranger holding a code can no longer read or overwrite a started game.
- Seated players still receive the whole state, including other seats' hands. Hiding it needs the game rules to run on the server, as they do for the seven server-authoritative games; that is a per-game rewrite and a separate change.
- A player who clears their browser storage loses their seat.
