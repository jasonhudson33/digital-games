# Proposal

## Why

The site has card, board and hidden-role games, but nothing built on what the players themselves write. "What If" is a simple party game for that. Everyone secretly writes a "What if…" and a "Then…", the server mixes the halves so every IF meets someone else's THEN, and the table reads the absurd results together. It fits the existing engine-room model: the server holds what everyone wrote and reveals it only when the rules say so.

## What Changes

- A new online game, **What If**, at `/what-if`, for 3–20 people (no computer players), using the shared landing page, lobby, game bar and rules dialog.
- **Writing phase:** each player fills in a "What if…" text area and a "Then…" text area (up to 200 characters each) and submits. They can edit until the mix. Players see who has submitted, but never what anyone wrote.
- **Mix:** when everyone has submitted, or when the host taps "Mix now" with at least 3 submitted, the server pairs every IF with a THEN from a different writer. Players who hadn't submitted sit that round out.
- **Reveal:** the host steps through the pairs one at a time with Next, and every screen shows the same pair, followed by who wrote the IF and who wrote the THEN.
- **Play again** starts a new writing round in the same room.
- A catalog entry, and a new "Party" kind for the hub filters.

Out of scope: scoring or voting, multiple IFs per player, computer players, and moderating what people write.

## Capabilities

### New Capabilities

- `games/what-if`: the rules, privacy and reveal flow of the What If party game.

### Modified Capabilities

_None._ It joins the existing room, layout and catalog requirements without changing them.

## Impact

- New: `lib/what-if.js`, `lib/what-if-room-adapter.js`, `lib/what-if-room-store.js`, `lib/what-if-engine-room.js`, `app/api/what-if/rooms/route.js`, `app/api/what-if/rooms/[code]/route.js`, `components/what-if-room-service.js`, `components/what-if-client.js`, `app/what-if/page.js`, `app/what-if/what-if.css`, and tests
- Changed: `lib/games.js` (catalog entry and a `party` kind)
- Room storage uses the existing Supabase room table under a new `what-if` namespace; there are no schema changes
