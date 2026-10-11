# Tasks

## 1. Pure Camel Up rules

- [x] 1.1 Add `lib/camel-up.js` with the three-to-eight-seat lobby, computer-seat management, player model, server-randomized second-edition setup, injected RNG, and derived race ranking, and verify new rules tests cover valid and invalid starts, starting money, racing and crazy camel placement, and deterministic setup
- [x] 1.2 Implement the ordered-stack movement primitive for clockwise racing camels and counterclockwise crazy camels, including splitting carried units, top and bottom landings, and finish-boundary detection, and verify table-driven rules tests cover mixed stacks, camels left behind, normal landings, and crossings in both directions
- [x] 1.3 Implement leg-ticket, spectator-tile, and pyramid actions with turn validation, grey-die carrying priority, ticket exhaustion, spectator placement restrictions, cheering and booing effects, and verify rules tests cover every action, illegal and out-of-turn attempts, tile payouts, extra movement, and a fifth pyramid ticket ending the leg with one die unrevealed
- [x] 1.4 Implement leg ranking, ticket rewards, the explicit partnership-scoring phase for six or more players, copy-or-decline choices, money floors, and next-leg reset, and verify rules tests cover first/second/other payouts, pyramid payouts, forced partnerships, unresolved choices blocking reset, computer choices, and partnership-card restoration
- [x] 1.5 Implement ordered hidden winner and loser bets, immediate race completion, final leg scoring, 8/5/3/2/1 final rewards, incorrect-bet penalties, counterclockwise carried-camel ranking, ties, and verify rules tests cover card reuse rejection, both finish directions, ordered payouts, zero-money floors, and tied winners
- [x] 1.6 Implement a bounded computer policy using only public state plus the computer's own finish cards, and verify repeated seeded computer turns and partnership choices always select an available legal action without reading another player's hidden choice

## 2. Server-authoritative rooms

- [x] 2.1 Add `lib/camel-up-room-adapter.js` with narrow named actions for lobby controls, the four normal actions, partnerships, and scoring choices, plus a per-viewer projection that masks opponents' remaining and placed finish-card colors, and verify `tests/camel-up-engine-room.test.mjs` proves action validation and that serialized opponent views contain none of the hidden camel IDs
- [x] 2.2 Add `lib/camel-up-room-store.js`, `lib/camel-up-engine-room.js`, and `/api/camel-up/rooms` collection and item routes using the shared engine room and Supabase store, and verify engine-room tests cover create/join/start, three-to-eight-seat limits, seat tokens, host-only computer steps, one computer action per step, old-format rejection, and GET/POST route exports
- [x] 2.3 Add `components/camel-up-room-service.js` and connect Camel Up room polling and host-paced computer detection through `useEngineRoom`, and verify the existing engine-room service tests pass alongside the Camel Up engine-room suite

## 3. Shared-layout Camel Up interface

- [x] 3.1 Add `app/camel-up/page.js` and the landing and lobby states in `components/camel-up-client.js` using `Landing`, `Hero`, `Lobby`, and the shared rules dialog, and verify the route renders the standard entry and lobby `data-layout` markers with host computer controls and a three-seat start requirement
- [x] 3.2 Add the in-game Camel Up view using `GameHeader`, a semantic sixteen-space perimeter track, accessible bottom-to-top camel stacks, public player money and ticket panels, leg-bet stacks, finish-bet decks, partnership state, and turn-specific action controls, and verify every rules action can be submitted only when available to the viewing seat
- [x] 3.3 Add `app/camel-up/camel-up.css` with Camel Up theme tokens and responsive track, betting, action, dialog, and results layouts using original CSS artwork only, and verify `npm run audit:mobile -- --games camel-up` passes at 390x844, 320x568, and 844x390 without adding Camel Up to `UNMIGRATED`
- [x] 3.4 Add shared-dialog partnership prompts, complete second-edition rules help, move feedback, leg scoring, and final `Results`, and verify keyboard Escape/focus behavior comes from the shared dialog and a completed game names all tied winners with final Pound totals

## 4. Catalogue and project documentation

- [x] 4.1 Add Camel Up to `lib/games.js` as a 3–8 player board game with online and computer modes, verified play time and an alphabetically compatible hue, and verify the hub, player-count filters, command palette, and `gameMetadata("camel-up")` derive the new entry while the catalogue exposes 30 distinct slugs
- [x] 4.2 Add `docs/contexts/camel-up.md` describing rules ownership, hidden information, room boundaries, and UI boundaries, and update the README game inventory and room architecture notes; verify all named files and commands match the implemented modules

## 5. Integration verification

- [x] 5.1 Run the focused Camel Up rules and engine-room tests, `npm run validate`, and `npm run typecheck`, and resolve every failure without weakening hidden-information or rules assertions
- [x] 5.2 Run `npm run check` and the full mobile audit, and verify the production build includes `/camel-up`, the complete suite remains green, and no existing game's behavior or shared layout regresses
