# Design

## Context

Three room models exist (see `CONTEXT-MAP.md`, `docs/adr/0002-room-storage-by-game.md`): seven server-authoritative games filtered per seat, twenty client-authoritative games whose browser computes state and `PUT`s the whole object through `lib/client-room-route.js`, and Mafia's Supabase RPC model. Client-authoritative `GET`/`PUT` carries no token, so a room code exposes every hand and allows overwriting the board. The code comment in `lib/client-room-route.js` calls this finding F1.

Per-game specs were first written from `lib/*.js` constants, `docs/contexts/*.md` and the catalog, then verified against the engines in task 3.1. That pass corrected Catan (2–6 players), Mafia (5+, no maximum), Monopoly (2–8), Risk (shared 2–6 rooms), Hearts (3–8, no rooms), Dominion supply sizes and end condition, Flip 7 Second Chance and bonus, Five Crowns scoring, Hand and Foot opening requirements and go-out rule, Ticket to Ride final round, Splendor setup, Stratego combat, Scum classes and Viticulture seasons. Skull King, Pinochle, Phase 10, UNO, Spyrium, Cover Your Assets, No Thanks! and DOS are sourced from their context docs and existing rules suites rather than re-read line by line.

## Goals / Non-Goals

**Goals:**
- Give every game and the platform a baseline spec that apply-time verification can check against tests.
- Define the access-control change precisely enough to implement without redesigning any game.
- Correct catalog and doc drift found while auditing.

**Non-Goals:**
- Moving client-authoritative games to server-authoritative engines (a per-game rewrite). Without it, seated players still see every hand.
- Token-gating Catan and Monopoly, which use their own browser-side Supabase tables.
- Changing any game rule, UI, or the `monopoly/` and `mafia-main/` trees.
- Authentication accounts or Supabase Auth.

## Decisions

**1. Seat tokens for client-authoritative rooms, validated at the route.** Extend `createClientRoomRoute` to require a token on `GET`/`PUT`, mapping token → seat stored with the room. Alternative: full server engines per game, which gives true integrity but is a rewrite of twenty games. Tokens fix the headline exposure (strangers with a code) at low cost.

**2. (Deferred) Redact private state on `GET`.** Found during apply: a client-authoritative browser needs the whole state to compute and `PUT` its next move, so redacting reads would break every game. Hiding one seat's cards needs the rules to run on the server, which is the per-game rewrite listed under Non-Goals, so it is a follow-up change. The original idea follows. Reads return a per-seat redacted view via a small per-game `redact(state, seat)` hook; writes check that only the acting seat's private fields and the shared fields a legal action may change differ. Alternative: validate every PUT by replaying the rules engine; strongest, but needs each engine to expose an action reducer. This is staged: tokens and redaction first, replay validation later where engines allow it.

**3. (Deferred with 2.) Redaction is a hook, not a rewrite.** Games with no hidden information (Monopoly, Catan board, Qwirkle grid, Stratego aside from hidden pieces) need only tokens. The spec lists games with private data; each task group confirms its own list.

**4. Legacy rooms keep working until expiry.** Rooms are short-lived (24 h), so tokenless legacy rooms are tolerated for one day rather than migrated.

**5. Catalog is corrected by data, guarded by test.** `tests/games-catalog.test.mjs` asserts each catalog range equals the engine's exported min/max where one exists.

## Risks / Trade-offs

- [Host-computed `PUT` is still trusted] → A seated player can still send a doctored state until replay validation exists; the spec limits writes to the acting seat and the design stages replay validation as follow-up.
- [Breaking existing clients] → Clients and routes ship together; legacy rooms keep loading for 24 h.
- [Per-seat redaction can break UI that reads all hands, e.g. computer logic on the host] → The host token receives host-visible state for computer seats only; verify each computer-turn path in tests.
- [Spec claims not yet verified against engines] → Apply verifies each game spec against tests and corrects the spec before archiving.
- [Hearts room mode] → Decide whether to remove the `online` claim or add rooms; this plan removes the claim.

## Migration Plan

1. Ship catalog and doc corrections (no behavior risk).
2. Ship token issuance and validation behind the shared route, one game at a time, starting with games with hidden hands.
3. Ship redaction per game.
4. Roll back a game by reverting its route to the unauthenticated handler; stored rooms are unchanged in shape.

## Open Questions

- Whether Dominion and Splendor, which have almost no hidden information, need redaction beyond tokens.
