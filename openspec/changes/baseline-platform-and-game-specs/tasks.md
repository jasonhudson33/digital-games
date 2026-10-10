# Tasks

## 1. Catalog accuracy

- [x] 1.1 Update Hearts to 3–8 players and drop `online` from its modes in `lib/games.js`; verify `npm run test:root` passes with a new assertion in `tests/games-catalog.test.mjs`
- [x] 1.2 Update Catan to 2–6 players, and clear `estimated` for Catan, Hearts, Mafia and Monopoly once confirmed against their engines; verify the catalog test asserts the ranges
- [x] 1.3 Add a catalog test that every slug has an app route and that no tool route is listed; verify `npm run test:root`
- [x] 1.4 Make Mafia open-ended: remove the 20-seat cap in the lobby rules and UI and let the catalog express a missing maximum; verify `tests/mafia-lobby-rules.test.mjs` and `tests/games-catalog.test.mjs` pass

## 2. Documentation drift

- [x] 2.1 Add Five Crowns and Stratego to `CONTEXT-MAP.md` and correct the room-model lists; verify every game in `lib/games.js` appears exactly once
- [x] 2.2 Fix the README's server-authoritative list and game count, and the stale count in `docs/design/UX-AUDIT.md`; verify by comparing against `CONTEXT-MAP.md`
- [x] 2.3 Write context docs for the 11 games without one (BANG!, Dominion, Five Crowns, Flip 7, Killer Bunnies, Life, Risk, Secret Hitler, Stratego, Ticket to Ride, Viticulture); verify each linked from `CONTEXT-MAP.md`

## 3. Verify per-game specs against engines

- [x] 3.1 For each game spec under `specs/games/`, confirm each scenario against `lib/<game>.js` and its test, fixing the spec where it disagrees; verify by listing each scenario with its covering test
- [x] 3.2 Add tests pinning the engine-level scenarios corrected or confirmed in 3.1 (`tests/spec-conformance*.test.mjs`); verify `npm run test:root` passes. Scenarios for Skull King, Pinochle, Phase 10, UNO, Spyrium, Cover Your Assets, DOS play rules rely on their existing suites.

## 4. Room access control foundation

- [x] 4.1 Add seat-token issuance at create/join and a token→seat record to the shared client-room route and store; verify with a route test that a code-only GET returns 401/403
- [x] 4.2 Reject PUTs from non-members and PUTs that remove another human from the roster; verify with route tests returning 401/403
- [x] 4.3 Keep tokenless legacy rooms loading until expiry; verify with a test that a pre-existing room loads
- [x] 4.4 Document the model in `CONTEXT-MAP.md` and `docs/adr/` (new ADR); verify the F1 note in `lib/client-room-route.js` is removed

## 5. Roll out per game

- [x] 5.1 Send and store seat tokens in the shared card-game room service used by all 18 token-gated games; verify with a two-browser service test (create, join, start, stranger refused)
- [ ] 5.2 (Deferred to a follow-up change: needs server-side game engines, see design decision 2) Hide opponents' private cards from other seats; verify each game with a test that an opponent's hand is absent from another seat's GET
- [x] 5.3 Confirm host-driven computer turns still work under token gating; verify with a route test where the host token drives a computer seat through a started game

## 6. Integration

- [x] 6.1 Run `npm test`, `npm run typecheck`, `npm run build` and `npm run validate`; verify all pass
- [x] 6.2 HTTP smoke test of the token-gated UNO room API on a running dev server (create, join, start, stranger read and write refused, roster protected, no seat hashes in responses); verify each returns the expected status. A manual browser run of the game screens has not been done.
