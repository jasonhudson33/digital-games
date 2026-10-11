# Gate client-authoritative rooms with seat tokens, then move them to the server

Eighteen games computed their state in the browser and stored it whole through whole-state `GET`/`PUT` rooms (`lib/client-room-route.js`, since deleted). The room code was the only access control: anyone holding it could read every hand and replace the whole game.

## Decision

1. **Seat tokens.** Each room records a SHA-256 hash of a secret token per seat (`lib/room-seats.js`). Creating a room or joining a lobby returns that seat's token, which the browser keeps in `localStorage` and sends as `X-Seat-Token`. Once a game leaves the lobby, reading or writing needs a seated player's token, and a seated player may not remove another human from the roster. Rooms stored before this change kept working, tokenless, until they expired after 24 hours.
2. **Rules on the server.** Seat tokens keep strangers out but give seated players the whole state. All of those games have since moved behind the shared engine room (`lib/engine-room.js`): the game's rules module runs on the server, a seat sends named actions, and each seat receives only its own view (other hands, decks, roles, pieces, tiles and reservations are counts or masked). Dice, spins and shuffles are chosen by the server. Computer turns are requested by the host's browser one `computerStep` at a time.

The games moved are UNO, DOS, Flip 7, Phase 10, BANG!, Cover Your Assets, Five Crowns, Sequence, Qwirkle, Stratego, Dominion, Splendor, Viticulture, Ticket to Ride, Risk, Life, No Thanks!, Spyrium, Monopoly and Catan.

## Consequences

- Every online game is server-authoritative. Catan and Monopoly used browser-side Supabase tables that anyone with the public key could list and overwrite; they went through their room routes only, the tables were dropped and the browser holds no database client. Both then moved onto the engine room. For Catan that meant extracting the rules from the React client into `lib/catan-board.js` and `lib/catan-engine.js`; the adapter (`lib/catan-room-adapter.js`) adds the checks the browser used to do (turn, pending choices, affordability, legal placement), rolls the dice and picks the stolen card on the server, and hides other seats' resource, development and progress cards and both decks.
- A player who clears their browser storage loses their seat.
- If the host's browser closes, computer players stall until the host returns.
- Rooms created before each game moved cannot be resumed; they expired within 24 hours.
- The whole-state seat-token gating of step 1 was removed once no game used it; the token helpers that remain (`lib/room-seats.js`) serve the engine room.
