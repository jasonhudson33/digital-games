# Design

## Context

- The repository already implements server-owned game state through `lib/engine-room.js`, per-game adapters and room stores, `/api/<game>/rooms` routes, browser room services, and `useEngineRoom`.
- Camel Up has mostly public state, but finish-card choices are private until final scoring. Dice selection, rolls, setup order, and computer decisions must also be server-owned.
- The in-progress `uniform-game-layout` change establishes the `Landing`, `Lobby`, `GameHeader`, `ChoiceModal`, and `Results` contract that new games should use. Camel Up should be built after or alongside that work without adding itself to the migration allowlist.
- The physical second-edition track has sixteen spaces, five clockwise racing camels, two counterclockwise crazy camels, mixed-direction stacks, six dice, and scoring interruptions between normal turns.

See proposal.md for motivation and the two spec deltas for required behavior.

## Goals / Non-Goals

**Goals:**
- Keep every rules transition pure and deterministic when supplied an RNG, so stack movement and scoring can be tested without React or room storage.
- Preserve hidden finish bets in every seat view while leaving public race, money, ticket, spectator, and partnership state inspectable.
- Render a legible sixteen-space track and all four actions on phones without abandoning the shared page shell.
- Support human and computer seats across the complete three-to-eight-player range, including the six-player partnership threshold.

**Non-Goals:**
- The first-edition rules, Supercup expansion, Grand Prix of the Sahara expansion, or house-rule variants.
- Real-time animation as a source of truth; animation may explain the latest stored move but never controls its result.
- Spectator access, matchmaking, persistent player accounts, or durable statistics.
- Reusing publisher artwork or scans. The game will use original CSS shapes, icons, and text.

## Decisions

**1. Implement a pure Camel Up rules module behind the shared engine room.** `lib/camel-up.js` will own lobby transitions, setup, legal actions, movement, scoring, bots, and derived ranking. `lib/camel-up-room-adapter.js` will expose a narrow named-action surface and construct per-seat views. The normal engine-room, route, storage, and browser-service modules remain unchanged. *Alternative:* put rules in the React client. Rejected because clients could choose dice results, inspect finish bets, or submit whole-state replacements.

**2. Represent the track as ordered stacks at logical positions.** The game will store a map of track positions to arrays of camel IDs ordered bottom-to-top. Moving a camel splits its stack at that camel, carries the suffix, and places it above or below the destination stack according to the movement effect. Positions remain logical race coordinates rather than screen coordinates, including an out-of-range finishing coordinate when a unit crosses the line. *Alternative:* store a position and height on each camel. Rejected because every movement would require synchronizing multiple height values and mixed-direction stacks are easier to corrupt.

**3. Model the pyramid as six die identities with server-generated values.** A pyramid action samples one identity from `remainingDice`, then rolls its value on the server. The grey die also determines black or white according to its face before applying the rulebook's carrying priority. The client sends only `rollPyramid`; supplied colors or values are discarded by the adapter. *Alternative:* pre-roll all six dice at the start of a leg. Rejected because storing unrevealed results expands the hidden-state surface without improving gameplay.

**4. Treat leg scoring as an explicit phase.** The fifth pyramid action first completes its movement. If the game has partnerships, the rules then enter `partnership-scoring` and collect one copy-or-decline choice from each eligible player; computer choices use one `computerStep`. Once all choices exist, the engine applies all leg rewards together, resets tickets, tiles, partnerships and dice, then resumes normal play or performs final scoring. *Alternative:* automatically copy the mathematically best partner ticket. Rejected because the rule explicitly gives each partner the choice and the UI should expose the full second-edition action even when one option is usually dominant.

**5. Store ordered finish bets with masked projections.** Winner and loser bets will each be an ordered array of `{ playerId, camelId }`. A seat view preserves order and owner for table awareness but replaces `camelId` with `null` unless the viewer owns the card or final scoring has begun. Each player's remaining finish-card colors are likewise visible only to that player. *Alternative:* hide entire bet entries. Rejected because physical card backs reveal who bet and when while concealing only the camel.

**6. Keep public money and ticket holdings public.** Egyptian Pounds, leg tickets, pyramid tickets, spectator tile placement, and partnerships are face-up physical information and will be returned in every seat view. Only finish-card identities are private. This lets the board explain scoring and allows partnership ticket selection without privileged client state.

**7. Use a sixteen-cell perimeter board with a responsive center.** The client will map spaces one through sixteen around a CSS grid perimeter and place the pyramid, remaining ticket stacks, and current-action controls in the center. Camel stacks render bottom-to-top with accessible labels; compact phone layouts can unwrap the center controls below the track while preserving track order. The page chrome uses the shared landing, lobby, game bar, rules dialog, and results dialog. *Alternative:* a canvas board. Rejected because DOM controls, labels, focus handling, responsive reflow, and automated layout inspection are substantially easier with semantic HTML and CSS.

**8. Give computers a bounded heuristic rather than privileged knowledge.** A bot may evaluate public rankings, ticket rewards, its own finish cards, its own bets, and legal spectator placements. It must not inspect another player's hidden finish-card colors. One computer step performs one normal action or one pending partnership choice, matching the shared host-paced contract.

**9. Randomize rulebook setup choices on the server.** Where physical setup permits an arbitrary stack order, the server will shuffle that order. This removes a pre-game chooser and makes setup reproducible in tests through injected RNG while staying within the rulebook's allowed outcomes.

## Risks / Trade-offs

- [Mixed-direction stacks and spectator-tile moves produce subtle above/below errors] -> centralize all stack splitting and landing in one movement primitive and cover clockwise, counterclockwise, cheering, booing, and mixed-stack cases with table-driven tests.
- [A final crossing can occur during an extra spectator-tile step] -> check the finish boundary after every movement segment and stop the race immediately at the first crossing.
- [Partnership scoring interrupts the usual one-player turn loop] -> make the phase and pending chooser explicit, expose it in `computerDue`, and test that the next leg cannot begin with an unresolved choice.
- [Polling clients could briefly render stale hidden-bet state] -> continue using engine-room `updatedAt` ordering and ensure every projection is rebuilt from server state for its requesting seat.
- [The circular board can become unreadable at 320px] -> prioritize stack color/position over ornament, allow center panels to move below the track, and include the route in the existing three-viewport mobile audit from its first implementation.
- [Depending on uncommitted shared-layout work can create merge conflicts] -> implement only after the shared shell exports used here are stable, preserve the user's current changes, and avoid editing the migration allowlist except to confirm Camel Up is absent.

## Migration Plan

1. Finish or stabilize the shared layout components required by the active `uniform-game-layout` change.
2. Add and test the pure Camel Up rules before exposing rooms or UI.
3. Add the adapter, hidden seat views, room store, engine-room composition, routes, and browser service; verify room security and computer pacing.
4. Add the shared-shell client, responsive track styling, catalogue entry, context document, README entry, and audit coverage.
5. Run focused rules and engine tests, the Camel Up mobile audit, then the full validation, typecheck, test, and build suite.

Camel Up creates only new room namespaces, so no stored-room migration is required. Rollback removes the catalogue entry and route while existing Camel Up rooms expire under the normal room retention policy.
