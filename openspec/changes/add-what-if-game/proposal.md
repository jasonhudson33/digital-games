# Proposal

## Why

The site has card, board and hidden-role games, but nothing built on what the players themselves write. "What If" is a simple party game for that. Everyone secretly writes a "What if…", each player draws one at random and answers it with a "Then…", and the server deals the Thens back onto the What ifs at random for the table to read together. It fits the existing engine-room model: the server holds what everyone wrote and reveals it only when the rules say so.

## What Changes

- A new online game, **What If**, at `/what-if`, for 3–20 players, using the shared landing page, lobby, game bar and rules dialog. The host can add computer players, who write from a built-in bank of lines.
- **What if step:** each player writes only a "What if…" in one text area (up to 200 characters). They can edit until the step ends. Players see who has written, never what.
- **Then step:** once every What if is in (or the host continues with at least 3), each player draws one at random (possibly their own), sees only its text, and writes a "Then…" for it.
- **Reveal:** the Thens are dealt onto the What ifs at random, and the host steps through every pair one at a time with Next. Every screen shows the same pair, followed by who wrote each half.
- **Play again** starts a new writing round in the same room.
- A catalog entry, and a new "Party" kind for the hub filters.

Out of scope: scoring or voting, multiple IFs per player, and moderating what people write.

## Capabilities

### New Capabilities

- `games/what-if`: the rules, privacy and reveal flow of the What If party game.

### Modified Capabilities

_None._ It joins the existing room, layout and catalog requirements without changing them.

## Impact

- New: `lib/what-if.js`, `lib/what-if-room-adapter.js`, `lib/what-if-room-store.js`, `lib/what-if-engine-room.js`, `app/api/what-if/rooms/route.js`, `app/api/what-if/rooms/[code]/route.js`, `components/what-if-room-service.js`, `components/what-if-client.js`, `app/what-if/page.js`, `app/what-if/what-if.css`, and tests
- Changed: `lib/games.js` (catalog entry and a `party` kind)
- Room storage uses the existing Supabase room table under a new `what-if` namespace; there are no schema changes
