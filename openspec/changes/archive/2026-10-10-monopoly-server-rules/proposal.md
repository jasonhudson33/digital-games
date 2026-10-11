# Proposal

## Why

Monopoly still computes every move in the browser and stores the whole game through a `GET`/`PUT` room. Anyone who knows a room code (five characters) can read it and, more importantly, replace it: give themselves money and properties, move another player's token, or skip an auction, and nothing on the server checks. The dice are rolled by the acting browser too. Monopoly holds no hidden hands, so the gain here is integrity rather than privacy, but it is the one game where a single player can quietly rewrite the result. Its engine (`monopoly/src/game.ts`) is already about forty pure functions of `(state, ...)`, which makes it the cheaper of the two remaining games to move behind the engine room.

## What Changes

- Run the Monopoly engine on the server through the existing engine room. A seat sends a named action; the server runs the engine function, decides every die roll, and returns the new game.
- Check who may act. Each action belongs to one player at one moment (the player to roll, the buyer, the player owing rent, the trade's recipient, the auction's active bidder, and so on); the server refuses an action from any other seat.
- Let the host act for local seats. Monopoly lets the host add "local" players on the same device; they have no seat token, so the host's token may act as a local seat, and only the host's.
- Decide trade expiry on the server clock.
- Remove whole-state `GET`/`PUT` for Monopoly and replace its browser room service with the engine room service. **BREAKING** Games in progress at deploy time cannot be resumed; they expire within 24 hours.
- Adapt `monopoly/src/main.tsx` from `updateGame(state => engine(state))` closures to named actions and host-paced `computerStep`.
- Leave Catan unchanged; it needs its game logic extracted from a 3,000-line React component first and gets its own change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/client-authoritative-rooms`: Monopoly joins the games that no longer expose whole-state `GET`/`PUT`, leaving Catan as the only one.
- `platform/server-authoritative-rooms`: adds host-driven local seats.
- `games/monopoly`: adds server-decided dice, per-action authority, host-controlled local seats and server-clock trade expiry.

## Impact

- New `monopoly/src/roomAdapter.ts` (or `lib/monopoly-room-adapter.js`) and `lib/monopoly-engine-room.js`; the Monopoly route files change to the engine routes plus a new collection route; `monopoly/src/roomService.ts` is replaced by the engine room service; `monopoly/src/main.tsx` changes its move calls.
- `lib/monopoly-room-store.js` (already a server-only store) is reused; no migration.
- Tests run through the same Vite harness `monopoly/scripts/game-rules.test.mjs` uses, because the engine is TypeScript; `npm run test:monopoly` is extended to run them.
- Docs: `CONTEXT-MAP.md`, ADR 0004, `README.md`, `docs/contexts/monopoly.md`, and the Purposes of the two platform specs.
- Out of scope: Catan, new rules, UI redesign.
