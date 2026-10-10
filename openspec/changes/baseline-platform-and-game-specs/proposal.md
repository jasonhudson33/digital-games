# Proposal

## Why

`openspec/specs/` is empty, so nothing records what the 29 games and the shared platform are required to do. Behavior lives in code, a partial set of context docs (18 of 29 games), and ADRs. The docs have drifted from the code, and one serious gap, unauthenticated client-authoritative rooms, is documented only as a code comment. Writing the specs now gives future changes a baseline to modify, and the audit needed to write them surfaces concrete fixes.

## What Changes

- Establish baseline specs for the shared platform (catalog, room lifecycle, the three room models) and for every game (rules, player counts, computer players, privacy of hidden information).
- **BREAKING** Add a room-access-control requirement: client-authoritative rooms (BANG!, Catan, Cover Your Assets, Dominion, DOS, Five Crowns, Flip 7, Life, Monopoly, No Thanks!, Phase 10, Qwirkle, Risk, Sequence, Splendor, Spyrium, Stratego, Ticket to Ride, UNO, Viticulture) must stop returning the game to anyone holding the code once it has started and must reject writes from non-members. Hiding one seated player's cards from another is deferred to a later change, and Catan and Monopoly are not yet covered. Clients that `PUT` without a seat token to a started room will be refused; rooms stored before the change keep working until they expire.
- Correct catalog data that contradicts the rules code:
  - Risk lists a solo game against two computers, but it runs shared 2–6 commander rooms.
  - Hearts lists 4 players but the engine supports 3–4 classic and 5–8 Killer, and Hearts has no room API although its catalog entry claims `online`.
  - Catan lists 3–4 (marked estimated) but the rules support paired turns for five and six players.
  - Mafia, Monopoly and Hearts player ranges are still flagged `estimated`; Mafia has no maximum (the code capped computer seats at 20, which is removed).
- Fix documentation drift: `CONTEXT-MAP.md` omits Five Crowns and Stratego; `README.md` names only three games as server-authoritative (the context map lists seven) and `docs/design/UX-AUDIT.md` still says 24 games; 11 games have no context doc.
- Record per-game "proposed changes" as explicitly non-baseline requirements only where behavior is currently wrong or inconsistent (listed above). No game rule is changed.

## Capabilities

### New Capabilities

Platform:
- `platform/game-catalog`: the hub catalog, filters by player count, metadata accuracy rules.
- `platform/room-lifecycle`: room codes, expiry, computer seats, host-driven computers, local fallback storage.
- `platform/server-authoritative-rooms`: seat tokens, per-viewer filtering, optimistic concurrency.
- `platform/client-authoritative-rooms`: current shared-state room API and its concurrency behavior.
- `platform/room-access-control`: membership-gated read/write for client-authoritative rooms (the proposed change).
- `platform/mafia-rooms`: token-validated RPC rooms, acting host, private roles.

Games (one spec each, `games/<slug>`): `seven-up`, `bang`, `catan`, `cover-your-assets`, `dominion`, `dos`, `five-crowns`, `flip-7`, `hand-and-foot`, `hearts`, `killer-bunnies`, `life`, `mafia`, `monopoly`, `no-thanks`, `phase-10`, `pinochle`, `qwirkle`, `risk`, `scum`, `secret-hitler`, `sequence`, `skull-king`, `splendor`, `spyrium`, `stratego`, `ticket-to-ride`, `uno`, `viticulture`.

### Modified Capabilities

None. No specs exist yet.

## Impact

- New files only under `openspec/` for the baseline; the access-control requirement drives later code changes in `lib/client-room-route.js`, the 20 `*-room-store.js` modules, the matching `components/*-room-service.js` clients, and a Supabase migration.
- Catalog corrections touch `lib/games.js` and `tests/games-catalog.test.mjs`.
- Doc corrections touch `CONTEXT-MAP.md`, `README.md`, `docs/contexts/`.
- Out of scope: new games, new rule variants, UI redesign (see `docs/design/UX-AUDIT.md`), the `monopoly/` and `mafia-main/` legacy source trees.
