# Ticket to Ride

Ticket to Ride owns the USA map, train cards, route claiming, destination tickets and final scoring for two to five players.

## Language

**Route**: A connection scoring 1, 2, 4, 7, 10 or 15 points for lengths 1–6.

**Destination Ticket**: A secret city pair worth points if connected and costing them if not.

## Relationships

- Each player starts with 45 trains.
- When a player has two or fewer trains, every player takes one more turn.
- The longest route earns 10 points, shared on ties; the highest total wins.

## Example dialogue

> **Dev:** "What happens to an unconnected ticket?"
> **Domain expert:** "Its value is subtracted."

## Rooms

- The rules run on the server (`lib/ticket-to-ride-room-adapter.js` over `lib/ticket-to-ride.js`). A seat sends named actions and receives only its own view.
- Other seats' train cards, destination tickets and any ticket choice in progress are counts, and the train deck, discard pile and destination deck are counts. The face-up cards, the map and claimed routes are public.
- When the game finishes every seat's destination tickets are sent to every seat, together with the final scores that settle them.
- Only the host's browser asks for computer moves, one `computerStep` at a time, including each computer's opening ticket choice.

