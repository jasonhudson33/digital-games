# Proposal

## Why

Players get booted from online games when their phone sleeps. When they come back, the page reloads, and many games throw away the player's seat token if that first reload request fails for any reason, including the network simply not being back yet. Scum and Secret Hitler also keep the token in `sessionStorage`, which mobile browsers clear when they discard a sleeping tab. Once the token is gone, a started game won't let the player back in.

## What Changes

- Every online game keeps its seat token in `localStorage`. Scum and Secret Hitler move off `sessionStorage`, and a token already in `sessionStorage` is migrated on first read.
- On reload, a game forgets the saved seat only when the server says the room is gone or the token isn't valid. A network or server error keeps the seat, shows a "Reconnecting…" message, and retries automatically with backoff and when the browser comes back online.
- Typing the room code to join again reuses a saved seat instead of joining as a new player. Scum and Secret Hitler are the two games that still lack this.
- Leaving a room still forgets the seat on purpose.

Out of scope: rejoining from a different device or after storage is cleared (host-approved rejoin), and Mafia, which has no online seats.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `platform/room-lifecycle`: adds requirements that a seat survives reloads and sleep, that it's kept through temporary failures with automatic reconnection, and that rejoining with the room code reuses it.

## Impact

- New shared helper `lib/room-seat.js` (token storage, stale-seat test, resume with retry), with tests
- `components/scum-client.js`, `components/secret-hitler-client.js`: storage, reload, join
- `components/killer-bunnies-client.js`, `components/hand-and-foot-client.js`, `components/skull-king-client.js`, `components/pinochle-client.js`: use the shared helper
- `components/dos-client.js`, `components/uno-client.js`, `lib/use-engine-room.js` (18 engine-hook games): keep the room on temporary errors and retry
- `components/catan-client.js`, `components/risk-client.js`: retry the resume
- No server, API, or storage-schema changes
