# Design

## Context

`lib/engine-room.js`, `lib/engine-room-route.js`, `components/engine-room-service.js` and `lib/use-engine-room.js` already exist and are in use by UNO, DOS, Flip 7 and Phase 10. A game plugs in with an adapter `{ createLobby, addPlayer, actions, computerStep, view }` over its unchanged engine; clients call named actions and render the seat view. See `docs/adr/0004-seat-tokens-for-client-authoritative-rooms.md` and the archived `server-authoritative-hand-games` design for the pattern and its trade-offs.

Hidden state found in the six engines:

- BANG! (`lib/bang.js`): `players[].role` and `hand`, `deck`. Equipment (`table`) and `character` are public. Kit Carlson's draw keeps two of three automatically and General Store cards are shown to everyone, so no card choice is private to one player. A game ends with `phase: "finished"` and a `winner`.
- Cover Your Assets, Five Crowns, Sequence: `players[].hand`, `deck`; each has a face-up discard that is taken from.
- Qwirkle: `players[].hand` (the rack) and `bag`; the board is public.
- Stratego (`lib/stratego.js`): every piece's `kind`, `rank`, `label` and `icon` live in `game.pieces`, and `game.board` maps squares to piece ids. The client already masks opponents with `visibleStrategoPiece`, but only after receiving everything. `lastBattle` carries both pieces' identities, and `captured` lists removed pieces.

## Goals / Non-Goals

**Goals:**
- Add six adapters on the existing engine room with no change to `lib/engine-room.js`.
- Per-seat views that withhold exactly what the rules withhold.

**Non-Goals:**
- Changing rules, UI or the eight other token-gated games.
- Hiding the order of public piles (discard piles, laid melds).

## Decisions

**1. BANG! roles are shown to a seat when `role === "sheriff"`, the player is eliminated, the viewer owns the seat, or the game is finished.** Everyone else's `role` becomes `null`. Client code that reads other seats' roles (`ROLE_LABELS[player.role]`) already shows "Hidden role" when it is not allowed to see one, so the masking matches the existing display rule.

**2. Hands and piles follow the established view shape.** Other seats' hands become `[]` plus a count field (BANG! instead sends that many face-down placeholders `{ id, hidden: true }`, because `legalTargets` reads `target.hand.length` in the browser to decide whether Panic and Cat Balou have a target) (`handCount`, or `rackCount` for Qwirkle tiles), draw piles become `deck: []` plus `deckCount` (`bagCount` for Qwirkle). Discard piles that players take from stay public; other discards are counts, as in UNO.

**3. Stratego view masks pieces, not the board map.** In the view, each opponent piece not yet in `captured` is replaced by `{ id, ownerId, color, hidden: true }`, with no kind, rank, label or icon; captured pieces and the two pieces in `lastBattle` keep their identity, matching what a physical battle reveals. During `setup` the opponent's squares are removed from `board` and their unplaced pieces are masked, so the view shows only the opponent's `ready` flag. Alternative: keep the board and mask only identity; rejected because secret deployment is a rule, not just a display choice.

**4. Stratego placement actions stay on the engine.** `placeStrategoPiece`, `clearStrategoDeployment`, `autoPlaceStrategoArmy` and `setStrategoReady` become actions; the engine already checks the owner and phase.

**5. Computer steps use the existing host pacing.** Each game's `runComputerStep`, `runComputerTurn` or `runStrategoComputerTurn` becomes the adapter's `computerStep`. Clients keep their existing delays (Stratego 850 ms and its battle-dialog gating).

**6. The Stratego engine names its functions differently.** Its adapter maps action names like `place`, `clear`, `autoPlace`, `ready`, `move`, `addComputer` onto the `*Stratego*` functions; no engine renames.

## Risks / Trade-offs

- [A view leaks a card, role or piece identity] → One test per game asserts that no opponent card id, role, or piece kind appears in another seat's serialized payload, including `log` and `lastMove`, with BANG! also checked after elimination and at game end.
- [Stratego battle reveals more than intended] → The test covers `lastBattle` and `captured` as the only disclosures.
- [Client code reads opponents' full state] → Typecheck and a live HTTP run of each game catch missing fields (`handCount`, `deckCount`, `bagCount`).
- [BANG! is large (785 lines of engine, many card actions)] → Actions map one-to-one onto the exported functions; the live run exercises play, response, decline and end turn.

## Migration Plan

Convert one game at a time in the order BANG!, Cover Your Assets, Five Crowns, Sequence, Qwirkle, Stratego; each lands with its tests, docs and HTTP run. Roll back a game by reverting its commit; open rooms of that game are lost in either direction.

## Open Questions

- Whether Stratego should also reveal a surviving attacker or defender beyond `lastBattle` (the engine currently reveals only what `lastBattle` shows).
