# Design

## Context

After the server-authoritative changes, `lib/client-room-route.js` is imported by exactly two route files (Catan and Monopoly), both passing `seatAccess: false`, so its token branches never run outside the tests written for them. `components/card-game-room-service.js` is imported only by `tests/room-seat-service.test.mjs`, and `lib/use-game-room.js` by nothing. `lib/room-seats.js` is imported by `lib/engine-room.js` (`SEATS_KEY`, `addSeat`, `seatForToken`), `lib/engine-room-route.js` (`SEAT_TOKEN_HEADER`) and `lib/client-room-route.js`; `stripSeats`, `isLegacyRoom`, `joiningPlayerId` and `keepsOtherHumans` are used only by the route being slimmed.

## Goals / Non-Goals

**Goals:**
- Remove dead code and the spec that describes it, with no player-visible change.
- Keep Catan and Monopoly rooms behaving exactly as they do now.

**Non-Goals:**
- Securing or migrating Catan and Monopoly.
- Touching the engine room, the engine service or any game rules.

## Decisions

**1. Delete, don't deprecate.** The code is private to this repository and has no external callers, so it is removed rather than left behind a comment.

**2. Keep one small test for the remaining route.** `tests/catan-room-api.test.mjs` already covers compare-and-set. A new `tests/client-room-route.test.mjs` keeps the two behaviors the slimmed route still promises (reject a body whose `roomCode` differs from the URL, answer 409 for a stale write), taken from the deleted access test.

**3. Retire the capability in one change.** All five requirements go in a REMOVED-only delta with `retire_capabilities: true` in `.openspec.yaml`, so archiving removes the capability's main spec instead of leaving an empty one.

**4. Order of work: tests first, then deletion.** The new route test lands against the current route, then the route is slimmed, so a regression shows up at once.

## Risks / Trade-offs

- [A file I think is unused is imported somewhere] → A repository-wide search before each deletion and `npm run build` after catch it.
- [Slimming the route changes Catan or Monopoly behavior] → The existing Catan and Monopoly route tests and the new route test must pass unchanged.
- [Someone later wants seat tokens for Catan or Monopoly] → The token helpers the engine room uses stay; the whole-state gating can be rebuilt from git history if needed.

## Migration Plan

One commit per task group. Rollback is a revert; nothing is stored differently.

## Open Questions

None.
