# Design

## Context

See proposal.md for motivation. What the code does today:

- `lib/viticulture.js` is one pure engine. A turn is `takeAction`, which places a worker, resolves the action and advances the cursor. Spring is `chooseWakeUp`. `passSeason` moves summer to winter by running autumn and winter inline, and winter to year end by running `endYear` inline. The engine never rests in autumn or at year end, so no one can be asked anything there.
- Each `resolve*` returns a plain message string that becomes a log line; nothing structured is recorded. The first-worker bonus is computed inside `placeWorker`, and the client re-derives it with `placements.length === 0`, which differs from the server.
- `lib/viticulture-room-adapter.js` sends each seat a view with decks emptied and opponents' cards replaced by counts. Actions are `wakeUp`, `action`, `pass`.
- Clients get state by polling every 1.2 seconds (`createRoomPoll`), keep the newest by `updatedAt`, and the host's browser steps the computer players one move at a time.
- The client is one 431-line file with a three-column grid and the player's estate below it; every action opens `ActionResolver`, a modal.
- `public/viticulture/` holds a 3.3 MB board image and four card art images of about 0.5 MB each.

## Goals / Non-Goals

**Goals:**
- Every rule behaves as it does today, except the autumn draw.
- A phase can wait on a player, and every change is a structured, ordered event the client can animate.
- A player can play a whole turn without scrolling away from the board, on a phone.

**Non-Goals:**
- Rules closer to the board game (a different, larger change).
- Changing how computer players are paced or how rooms sync (shared by every game).
- Sound, chat, or a spectator view.

## Decisions

**1. Events are part of game state, not a side channel.** The engine gains `game.events` (the last 60) and `game.eventSeq`. A small `emit(game, type, data)` helper appends one event: `{ seq, type, playerId, ...data }`. Types: `worker-placed`, `coins`, `vp`, `cards-drawn`, `card-played`, `field-planted`, `structure-built`, `grapes-harvested`, `wine-made`, `order-filled`, `season-changed`, `decision-needed`, `year-ended`. Because polling already delivers whole state, events ride the same path with no new transport. Alternative: a separate event endpoint, which needs ordering and cursoring that the sequence number already gives.

**2. The log is derived from events.** One function turns an event into a log line, and `takeAction` writes the log from the events it emitted. The `resolve*` functions stop returning message strings. This is what stops text and motion drifting apart.

**3. Events carry no private identities.** A `cards-drawn` event holds a deck and a count. The viewer's own hand changes arrive in state, and the client animates a deal by comparing the viewer's previous and new hand. Alternative: seat-scoped events that name cards, which adds a second visibility rule to maintain and test for no visual gain, since opponents' drawn cards are never shown anyway. A test uses `assertNoneLeaked` on the events as well as the state.

**4. Phases and pending decisions.** `game.season` gains `autumn`; `game.pending` is `null` or `{ kind, waitingOn: [playerIds], ... }`. `takeAction`, `chooseWakeUp` and `passSeason` return the game unchanged while a decision is pending. A new adapter action, `decide`, takes `{ choice }` and is accepted only from a seat in `waitingOn`. The phase list is the existing one plus autumn; year end stays an atomic transition inside `passSeason`, which now also records `game.yearRecap`.

**5. Autumn.** When summer ends, every player is added to `pending.waitingOn`. A player without a Cottage chooses `summer` or `winter` and draws one. A Cottage owner has one of each drawn at once into `pending.stash[playerId]` (private, hidden from other views like cards in hand) and keeps one. A computer player's decision is made in the same step, taking the colour it holds fewer of (summer on a tie). Once `waitingOn` is empty, winter begins. This replaces the wake-row-parity draw and is the only rules change.

**6. Year-end recap, not a blocking step.** `endYear` records `yearRecap: { year, players: [{ id, income, aged: {...}, scoreBefore, scoreAfter }] }`, emits `year-ended`, and goes straight to spring. Clients show the recap as a sheet when they see the event. Nobody has to dismiss it before the next spring can be played, because blocking every player on one dismissal is what makes online turns drag.

**7. One bonus function.** `bonusOpen(game, actionId)` is the only place the rule lives. `placeWorker` calls it, and the adapter view adds `bonusOpen: { [actionId]: boolean }` for the current season's spaces. The client shows that value and the modal's own guess is deleted.

**8. Replay is a pure function.** `planReplay({ lastSeq, events, hidden, reduced })` returns `{ play, nextSeq }`. It returns no events on first load (so rejoining never replays), skips everything when the tab is hidden or the player prefers reduced motion (the state is already correct), and drops all but the last few when a backlog is long. The component only schedules what it returns. It is testable without a browser.

**9. Layout: strip, board, dock.** The table is three rows. The top row is a strip of player chips (score, coins, workers, a "choosing" marker). The middle row is the board: a reflowing grid of the season's six space cards, two columns on a phone and three on a desktop, so it needs no pan and zoom (zooming a grid of text cards only shrinks the text). The bottom row is the player's dock, sticky to the bottom of the screen: a hand tray built on the shared `CardFan`, with fields, cellar and buildings as tabs that open above it. The log is a collapsible list in the board's header. Alternative: keep the three-column desktop grid and shrink it, which keeps the estate below the fold.

**10. Inline actions and card-first selection.** A space with no choices (tour, draw vine, draw order, train worker) is taken on one tap. A space with choices opens a panel directly under the board holding only that action's choices, scrolled into view; there is no worker picker, because the worker was chosen by how the space was tapped. A tap places a regular worker, or the grande one when only that fits; when both fit, a small "G" chip on the space chooses the grande. Tapping a card in the dock highlights its space and, in the panel and the Fields tab, the fields it fits; tapping the highlighted space with an order or a visitor selected places the worker at once. Alternatives: a popover anchored to the space, which needs positioning maths and a different layout on a phone; drag and drop, which is poor on touch.

**11. Motion is CSS and the Web Animations API.** A worker flight measures the origin and target rectangles and animates a clone between them; floaters and card deals are short keyframes; a season banner is a timed overlay. Under `prefers-reduced-motion` the same code path runs with no animation, so there is one set of state updates to test.

**12. Light assets.** The 3.3 MB board image is replaced by a board drawn in CSS and inline SVG, and the four card images are re-encoded to a small WebP size. Target: under 600 KB of images on first load.

## Risks / Trade-offs

- [Polling delivers events in batches, so motion can look late or crowded] → events carry their sequence, play in order with short durations, and a long backlog is skipped to the final state.
- [A hidden-card identity leaks through an event or the Cottage stash] → events carry only counts, the stash is stripped from other seats' views, and tests assert both.
- [Rooms saved before this change] → missing `events`, `eventSeq`, `pending` and `yearRecap` are read as empty on load; the engine never rested in autumn, so no old room is mid-autumn.
- [The autumn rule changes game balance slightly] → it is a small, explicit choice in place of an arbitrary one; flagged for review below.
- [The host's browser stalls bots when the tab is hidden] → unchanged, shared by every game, and recorded below.
- [A rewrite of the client and stylesheet is large] → the rules tests stay green throughout, and the client is rebuilt in pieces behind the same room API.

## Migration Plan

Engine and adapter first (events, bonus, phases, `decide`), with the old client still working because `log` and the existing state fields are kept. Then the new client replaces the old in one step. No data migration; a revert restores the old client, which ignores the new fields.

## Open Questions

- Is the autumn rule (each player chooses a colour, a Cottage owner keeps one) the one you want? It can change without affecting the rest of the design.
- The host's browser still drives the computers. If that proves a problem in practice, letting any seated human step them is a change to the shared engine room, not to this game.
