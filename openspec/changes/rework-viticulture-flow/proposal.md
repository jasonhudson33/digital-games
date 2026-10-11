# Proposal

## Why

Viticulture's rules work, but it plays poorly online. An action is a modal wizard (click a space, pick a worker, pick a card, pick a field, confirm), even for "Give tour". The player's own cards, grapes and wine sit below the board, so choosing an action means scrolling away from it. Autumn and year end happen instantly and silently, the Cottage's "keep one" choice is made for the player, and the autumn draw follows an invented wake-row rule. An opponent's move shows up only as one of nine text lines in the log: nothing moves, nothing highlights, and the page has one keyframe animation. The modal's idea of the first-worker bonus is a client-side guess that can disagree with the server.

## What Changes

- The rules engine keeps every existing rule, action, building and card, and is restructured around explicit phases (spring, summer, autumn, winter, then a year-end transition) and pending decisions. A phase can wait for a player's choice instead of the engine making it.
- Autumn becomes a visible phase. Each player draws a visitor of a colour they choose; a Cottage owner draws both colours and keeps one. Computer players decide at once. This replaces the wake-row-parity rule and is the one rules change in this proposal.
- Every action records structured events with increasing sequence numbers (worker placed, coins, VP, cards drawn, wine made, season changed). The log lines are produced from the same events, so text and animation cannot drift apart. Events name no hidden card: a drawn card is a count to everyone but its owner.
- Year end stays one atomic step but now produces a recap (income paid, ageing, score changes) that every client can show without blocking play.
- The first-worker bonus is computed once on the server and sent to the client with each action space, so the client stops guessing.
- The in-game screen is rebuilt as one table: the shared board in the centre, opponents as a compact strip, and the player's hand and estate docked below (a bottom sheet on a phone, with a pannable and zoomable board). Choosing an action happens inline, with only the choices that action needs; "Give tour" is one tap.
- Clients replay new events as motion: a worker travels to its space, coin and VP changes float up, cards deal into the hand, grapes become wine, and a banner marks each season. A client that loads or rejoins mid-game shows the current state without replaying history. All motion is skipped under reduced-motion.
- The 3.3 MB board image is replaced with a light board that loads quickly on a phone.

## Capabilities

### New Capabilities
<!-- None. The behaviour belongs to the existing Viticulture capability. -->

### Modified Capabilities
- `games/viticulture`: adds requirements for explicit phases and pending decisions, the autumn visitor choice, structured events that hide private cards, the year-end recap, a server-computed first-worker bonus, a one-screen table with inline actions, and event-driven motion. Existing requirements (seasons, cellars, game end, hidden information, server-checked actions) stay as they are.

## Impact

- `lib/viticulture.js` (engine), `lib/viticulture-room-adapter.js` (view and a new `decide` action) and their tests in `tests/viticulture-rules.test.mjs` and `tests/viticulture-engine-room.test.mjs`.
- `components/viticulture-client.js`, `app/viticulture/viticulture.css` and `public/viticulture/` are rewritten; a replay helper is added alongside them.
- The shared table shell (`components/ui/table-shell.js`) and the shared card fan are reused, not changed.
- Room state grows by a short capped event list. Rooms saved before this change load without events and without a pending decision.
- The host's browser still paces the computer players; that mechanism is shared by every game and is not changed here.
- No change to other games, APIs or the room store.
