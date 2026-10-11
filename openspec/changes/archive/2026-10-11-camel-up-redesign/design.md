# Design

## Context

`components/camel-up-client.js` is one ~330-line component (plus the recap and tray added by `camel-up-leg-recap`) that renders the scoreboard, the 5x5 CSS-grid ring (`.camel-track`, spaces placed by `.space-N` grid areas), the center pyramid and order list, a side panel of leg-ticket buttons, the overall-bet decks and log, and a sticky bar of four `<fieldset>`s with `<select>` controls. Camels are CSS blobs (`.camel-piece`) in a column-reverse flex stack. All of `app/camel-up/camel-up.css` is hand-written single-line rules. State arrives as whole seat views from `useEngineRoom`; the client submits named actions (`takeLegTicket`, `placeSpectator`, `rollPyramid`, `placeFinishBet`, `formPartnership`) and never computes authority. `legalSpectatorSpace` is already exported from the engine and used by the client. The shared shell (`Landing`, `Lobby`, `GameHeader`, dialogs) is fixed by `platform/game-layout` and stays as is. See proposal.md for motivation and scope; no server behavior changes.

## Goals / Non-Goals

**Goals:**
- A legible, attractive board and a turn panel that makes the one choice per turn obvious, on phone first.
- Spectator-tile placement by pointing at the board.
- Movement and last-move feedback that is purely derived from state the client already receives.

**Non-Goals:**
- No change to rules, engine, adapter, API, storage or the recap content.
- No sound, no dark theme, no new dependencies, no change to the shared shell components.
- No attempt to replay every intermediate state when polling skips several; motion is a courtesy, not a log.

## Decisions

**1. Keep the 16-space ring and its grid-area placement; redraw it.**
The ring maps cleanly to the physical board and the existing `.space-N` coordinates are tested by use. The redesign changes what each space looks like (path tile with number, chevron direction cues, a finish arch on space 16, a start marker on space 1), the camel art, and the stack presentation, not the geometry. *Alternative:* an SVG board with free-form path — rejected: much more work, harder to make accessible and responsive, and no gameplay gain.

**2. Camels as one reusable SVG-or-CSS component at two sizes.**
A single `Camel` renders from color tokens and is used on the track, in the order list, ticket stacks, and recap. Stack order is made obvious with overlap and a shadow per level, and the last-moved unit gets a ring. The decision of SVG versus layered CSS is left to the implementer's judgment against the existing `.camel-piece` look, as long as it renders crisply at 24px and 56px and keeps its `aria-label`.

**3. Movement animation by FLIP in the client, from positions diffed between renders.**
A small hook records each camel's DOM rect after render and, when the next state arrives, applies an inverse transform and transitions it to zero (first-last-invert-play). The set of camels that changed space is found by a pure helper `diffCamelPositions(prevStacks, nextStacks)` in `lib/` (testable without a DOM), which also yields the moved unit for the highlight; the roll record's latest entry names the moved camel as a cross-check. If several moves arrive in one update the camels simply slide from where they last were. `prefers-reduced-motion` disables the transform. *Alternatives:* an animation library — rejected (new dependency for a cosmetic effect); animating from the server's move event — rejected: it would require engine state purely for decoration and fails when polling skips states anyway.

**4. One action panel with a segmented choice, not four fieldsets.**
The panel has a tab-like control (Leg bet, Roll, Tile, Finish bet, Partner when six or more seats) and renders only the chosen action's controls:
- *Roll* is the default and primary: a large button showing tickets left.
- *Leg bet* lets the player tap a camel's ticket stack; the stacks live in the panel and double as the "bets at a glance" display.
- *Tile* offers a cheer/boo toggle, then the track enters a placing mode.
- *Finish bet* shows the player's remaining finish cards as pickable camel cards plus a winner/loser toggle and a confirm button.
- *Partner* lists available players.
Disabled actions show a reason (not your turn, no tickets left, all cards placed, tile has no legal space). On a phone the panel docks to the bottom and collapses to the segmented control when it is not the player's turn.

**5. Tile placement mode on the track.**
In placing mode the track marks `legalSpectatorSpace` spaces as buttons (`aria-label` "Place cheering tile on space 9"), other spaces are inert and dimmed, and a preview tile follows the selected space; a confirm button submits `placeSpectator` and a cancel control exits with no action. Outside placing mode spaces are not interactive. The client only filters with the engine's own legality helper; the server still validates. *Alternative:* drag and drop — rejected: poor on touch and keyboard.

**6. Public bet display from existing state.**
Ticket stacks come from `legBetStacks`; held tickets, pyramid count, tile and partner from each player; deck counts from `finishBets`. No new server fields. A player's own finish cards come from the existing seat view (`finishCards`), which already hides others'.

**7. Split the client into presentational modules.**
`camel-up-client.js` keeps room wiring, dismissal state and dialogs; new modules `camel-up-board.js` (track, pyramid, order, movement hook), `camel-up-players.js` (scoreboard and ticket stacks), `camel-up-actions.js` (panel), and `camel-up-recap.js` (tray and recap dialogs moved unchanged in behavior). This follows the repo's one-client-per-game convention while keeping files reviewable. `docs/contexts/camel-up.md` records the boundaries.

**8. Styling approach.**
Rewrite `camel-up.css` with the existing `.camel-up-theme` / `tbl` tokens and a small set of local custom properties (sand, ink, accent, per-camel colors) instead of repeated literals, in readable multi-line rules. Desktop is a two-column layout (board, side panel); under ~1050px a single column with the action panel docked; under 650px the order list moves to a strip above the board. The dice tray and recap keep their markup and are restyled to match.

## Risks / Trade-offs

- [FLIP transforms fight the stack layout when units move together] → animate per camel from rect to rect and verify against stacked moves, booing/cheering shifts and crazy-camel carrying in a real game; fall back to no animation for a camel whose rect cannot be measured.
- [A large CSS rewrite causes regressions in the shared dialogs or recap] → keep shared-shell classes untouched, restyle recap/tray deliberately, and check landing, lobby, recap and final dialogs at three widths.
- [Sticky bottom panel hides the board on small phones] → keep it compact (segmented control plus one row), collapse when not the player's turn, and verify at 320x568 and 844x390.
- [Placing mode with tiny tap targets on the ring at 320px] → space buttons fill their whole cell and meet a practical touch size within the cell geometry; verify by tapping in an emulated phone.
- [Hiding unavailable actions' reasons adds copy to maintain] → keep reasons short and derived from state in one function.
- [Animation timing under 760ms computer pacing] → keep transitions short (about 350ms) so back-to-back computer moves never overlap visibly.

## Migration Plan

Single deploy; no data or API change, so rooms in progress simply render with the new UI. Rollback is reverting the client and CSS files.
