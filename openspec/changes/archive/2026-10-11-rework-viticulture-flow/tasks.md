# Tasks

## 1. Events and the bonus rule (engine)

- [x] 1.1 Add `events`, `eventSeq` and an `emit` helper to `lib/viticulture.js`; read missing fields as empty so saved rooms still load
- [x] 1.2 Emit events from every action (`worker-placed`, coins, VP, cards drawn, card played, planted, built, harvested, wine made, order filled, season changed) in place of the `resolve*` message strings
- [x] 1.3 Write the log line from the events an action emitted, and keep the `log` field and its 80-line cap
- [x] 1.4 Add `bonusOpen(game, actionId)` as the single bonus rule; use it in `placeWorker`
- [x] 1.5 Tests: events are ordered and match the log; the bonus shown equals the bonus given

## 2. Phases, pending decisions and autumn

- [x] 2.1 Add `game.pending` and block `takeAction`, `chooseWakeUp` and `passSeason` while a decision is pending
- [x] 2.2 Make autumn a phase: set `pending` for every player when summer ends, and begin winter once all have decided
- [x] 2.3 Implement the autumn choice (colour, or the Cottage draw-both-keep-one with a private stash) and the computer players' immediate decisions
- [x] 2.4 Record `yearRecap` and emit `year-ended` in `endYear`, then go straight to spring or finished
- [x] 2.5 Tests: season order, a waiting human, the wrong seat deciding, both autumn cases, the recap contents, a 20 VP finish

## 3. Room adapter and privacy

- [x] 3.1 Add the `decide` action to `lib/viticulture-room-adapter.js`, accepted only from a seat the decision waits on
- [x] 3.2 Add `bonusOpen` for the current season's spaces to the seat view
- [x] 3.3 Strip other seats' Cottage stash from the view
- [x] 3.4 Tests in `tests/viticulture-engine-room.test.mjs`: events and stash leak no hidden card (`assertNoneLeaked`); a pending decision survives a save and reload; old saved rooms load

## 4. Replay helper

- [x] 4.1 Create `lib/viticulture-replay.js` with `planReplay` (no replay on first load, skip when hidden or reduced, trim long backlogs, keep order)
- [x] 4.2 Tests: rejoin shows nothing, in-order play, backlog trimming, reduced motion

## 5. Table layout

- [x] 5.1 Rebuild `components/viticulture-client.js` as player strip, board and docked mat, split into small components under `components/viticulture/`
- [x] 5.2 Build the dock: hand tray on the shared `CardFan`, with fields, cellar and structures as tabs (desktop) or a sheet (phone)
- [x] 5.3 Move the log into a collapsible list in the board header (the board is a reflowing grid, so it needs no pan and zoom)
- [x] 5.4 Show whose turn it is and what the game is waiting on, including a pending autumn choice
- [x] 5.5 Rewrite `app/viticulture/viticulture.css` for the new layout, phone first

## 6. Board and assets

- [x] 6.1 Draw the board in CSS and inline SVG for summer and winter, and remove `estate-board-v2.png`
- [x] 6.2 Re-encode the four card art images to WebP and check the first-load image total is under 600 KB

## 7. Inline actions

- [x] 7.1 Take choice-free actions (tour, draw vine, draw order, train worker) on one tap
- [x] 7.2 Build the choice panel under the board with only the choices each action needs; choose the grande worker with a chip when both workers fit
- [x] 7.3 Add card-first selection: tapping a hand card highlights its spaces and fields
- [x] 7.4 Read the bonus from the server's `bonusOpen` and delete the client's own guess

## 8. Motion

- [x] 8.1 Add the replay scheduler hook driven by `planReplay`
- [x] 8.2 Animate the worker flight, coin and VP floaters, card deals and grape-to-wine, and show a season banner
- [x] 8.3 Build the autumn choice screen and the year-end recap sheet
- [x] 8.4 Honour `prefers-reduced-motion` through the same code path with no animation

## 9. Verify

- [x] 9.1 Run the rules and engine-room tests and `npm run check`
- [x] 9.2 Run the mobile audit for Viticulture at 320px, 390px and 1280px, and confirm the board and hand are on screen together at 390px
- [x] 9.3 Play a year through the UI with computers and with two human seats, checking opponent moves, autumn, the recap and a mid-game rejoin; simulate complete computer-only games to confirm none stall
