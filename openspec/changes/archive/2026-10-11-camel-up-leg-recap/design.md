# Design

## Context

Camel Up state is a single server-owned object (`lib/camel-up.js`) projected per seat by `camelUpView` and polled by `useEngineRoom`. `rollPyramid` moves a camel, then calls `beginLegScoring`; with no partnerships (always, under six seats) that falls straight through to `finishLegScoring`, which pays tickets, clears them, bumps `leg`, refills the dice and sets `lastRoll: null`, all in one step. The client only ever renders the state after that step, so nothing about the fifth roll or the scoring can be shown. Spectator-tile payouts happen inside `moveCamel` as a bare `money + 1` with no record. Race end goes `finishLegScoring` → `finishRace`, and the client shows only final totals.

Constraints: the client must not compute authoritative results; finish-card colors stay private until `finished`; the host's client drives computer steps on a timer (`computerDue`, 760ms); rooms already stored in Supabase will lack any new fields.

## Goals / Non-Goals

**Goals:**
- Preserve everything needed to explain a leg (rolls, payouts) across the reset, in server state.
- Let every client render a roll notice, a dice tray, a leg recap and a final recap from that state alone.

**Non-Goals:**
- No new game phase and no acknowledgement protocol; a slow reader never blocks the room.
- No visual redesign beyond the new components; the track, ticket cards and action bar are untouched (see the follow-up `camel-up-redesign`).
- No rule or scoring changes.

## Decisions

**1. Record rolls and the recap in game state, not derive them client-side.**
Add `legRolls` (live, per leg) and `legRecap` (latest scored leg). The client cannot diff states because polling may skip several steps (computer turns are fast) and the fifth roll's pre-reset state is never delivered. *Alternative:* client diffs consecutive polled states — rejected: lossy and duplicates scoring logic on the client.

**2. `moveCamel` reports tile hits through a transient `moveEvent` field.**
`moveCamel` already finds the tile owner and applies the bonus; it will additionally set `moveEvent: { ownerId, side, from, to }` (or `null`) on the returned state, which `rollPyramid` reads into the roll entry and clears. This keeps the existing exported signature used by table-driven rules tests. *Alternative:* diff players' money in `rollPyramid` — rejected: cannot recover side or destination, and breaks if the same player is roller and owner.

**3. Roll entry shape.**
`{ n, playerId, playerName, dieId, face, camelId, value, tile }` where `tile` is `{ ownerId, ownerName, side }` or `null`. `lastRoll` stays (derived from the latest entry) so existing code and tests keep working. Names are stored on the entry so the recap does not depend on later roster changes.

**4. Recap is built inside `finishLegScoring`, before the reset.**
Track `moneyAtLegStart` per player (set at start and at each leg reset). When scoring, compute each row from the same values the scoring already uses: ticket rewards via `ticketReward`, `pyramidTickets`, copied reward via `partnerRewardOptions`, tile income by summing `legRolls[*].tile` per owner, `before = moneyAtLegStart`, `after = new money`. Because money is floored at zero, `after` is authoritative and the UI shows any floor difference rather than recomputing. Recap: `{ leg, final, ranking, rolls, rows, finish }`.
*Alternative:* store tile income as a per-player counter — rejected: the roll entries already carry it, so one source of truth.

**5. Final race: recap plus a bet resolution list.**
`finishRace` appends `legRecap.finish = { winner: [...], loser: [...] }` with each card's `{ playerId, camelId, correct, delta }` in placement order, and the final recap row `after` includes those deltas. This is only produced when the phase becomes `finished`, which is when `camelUpView` already reveals all finish cards, so no extra projection rule is needed. Before `finished`, the recap carries no finish-card data.

**6. Non-blocking dismissal, local to each client.**
The client remembers the last dismissed recap leg number in component state (and `sessionStorage` so a refresh does not re-open it). A recap whose `leg` is greater than the dismissed number opens automatically. When the race is finished the final recap opens and flows into the standings via a Continue button. The host client treats `computerDue` as false while its own recap dialog is open so computer turns do not run away from the host; other humans are not paused. *Alternative:* a blocking `leg-summary` phase with ready-ups — rejected: adds a phase, disconnected-player edge cases and computer-seat handling for little gain (see the exploration).

**7. Live feedback.**
A roll notice keyed on the newest `legRolls` entry `n`/leg (not on `lastRoll`), so a new roll after a missed poll still announces the latest. The dice tray shows five slots per leg filled from `legRolls`; for the recap it renders from `legRecap.rolls`. Both components are fed only by state, so no timing logic lives on the server.

## Risks / Trade-offs

- [Rooms stored before this change have no `legRolls`, `legRecap`, or `moneyAtLegStart`] → treat missing fields as empty in the client and default `moneyAtLegStart` to current money when absent so recap math cannot throw.
- [Recap bloats stored state] → rolls are ≤5 small entries and one recap is kept (replaced each leg); the existing log cap is unchanged.
- [Polling can skip a whole leg if a client is backgrounded] → only the latest recap is kept, so a client may miss an earlier leg's dialog; acceptable and the log still records it.
- [Host pauses computers by leaving a dialog open] → intended, but the dialog must be dismissible with Escape/Continue and never required for human play.
- [Recap breakdown disagrees with money because of the zero floor] → show `after` as authoritative and annotate rows where the floor applied.
