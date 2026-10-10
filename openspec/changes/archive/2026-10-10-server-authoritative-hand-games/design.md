# Design

## Context

Seven games already run on the server (`lib/scum-rooms.js` and kin): the token lives on the player record, each action is a named function behind `POST /api/<game>/rooms/<code>`, and `serializeRoom` builds a per-seat view. UNO, DOS, Flip 7 and Phase 10 instead use `createCardGameRoomService` and `createClientRoomRoute`: the browser calls an engine function on a locally loaded copy and `PUT`s the result. Their engines (`lib/uno.js`, `lib/dos.js`, `lib/flip-7.js`, `lib/phase-10.js`) are pure `(game, playerId, ...args, rng) => game` functions that already check the acting player and return the game unchanged on an illegal move, so they can be reused as the server's rules unchanged. Seat tokens and `__seats` hashing from `lib/room-seats.js` already exist.

Observed hidden state in these games: every player's `hand`, the `deck` order, UNO's `pendingDrawFour.wasLegal` (tells the victim whether to challenge), and UNO Flip's opposite card faces. Flip 7 has no hands; its hidden state is the deck, and the client's risk meter reads `game.deck` through `riskPercent`.

## Goals / Non-Goals

**Goals:**
- Reuse the four engines unchanged as the server's rules.
- One shared room module so each game adds only an action table and a view function.
- Keep computer play paced as it is today.

**Non-Goals:**
- Rewriting rules, or converting the other 14 token-gated games.
- Hiding the order of public information (discard pile, other seats' laid melds, Flip 7 table cards).
- Catan and Monopoly.

## Decisions

**1. One generic engine room, per-game adapters.** `lib/engine-room.js` implements create, join, get-view, action and `computerStep`. A game supplies `{ engine, actions, view, minPlayers, maxPlayers }`. Alternative: copy `scum-rooms.js` four times, as the existing seven did, which is about 300 lines each and drifts. Trade-off: the existing seven keep their own copies; consolidating them is out of scope.

**2. Store the engine game as-is, marked `engine: 1`, with `__seats`.** The existing `server_game_rooms` row and compare-and-set store are reused with the same namespace. A room without the marker is a pre-change room and answers 410 with the "start a new room" message. Alternative: migrate old rooms in place; rooms live 24 h and a mid-game migration of hidden state is not worth the code.

**3. Action table maps names to engine calls.** Example for UNO: `play: (game, id, args, rng) => playCard(game, id, args.cardIds, args.options, rng)`. The route rejects unknown actions the way `handleRoomAction` does (own-property check). An engine returning the same object means 400. The acting player id comes from the token, never from the body.

**4. Views by projection.** `view(game, viewerId)` starts from the stored game and replaces other seats' `hand` with `[]` plus `handCount`, `deck` with `[]` plus `deckCount`, and strips game-specific fields. UNO removes `wasLegal` from `pendingDrawFour` until resolved, and for Flip drops the inactive face from cards in the view. Flip 7 adds `riskPercent` per active seat computed from the unseen cards. Client code that read `game.deck.length` switches to `deckCount`.

**5. Computer turns by host `computerStep`.** Alternative: run all computer moves inside the human's request, as Scum does; that is simpler but removes the 680 ms pacing and the card-play animations that read as the computer "thinking". The host browser keeps its timer and posts `computerStep`; the server checks host token, that a computer is due, and applies one `runComputerStep` or equivalent. If the host leaves, computers stall exactly as today.

**6. Clients move from closures to actions.** Each `update((current) => engineFn(current, playerId, ...))` becomes `act("name", args)`. UI helpers that inspect state (`playableCards`, `matchOptions`, `findPhaseLayout`, `targetOptions`, `canHitGroup`) keep importing the engine because they only need the viewer's own hand and public fields. The server remains the validator.

**7. Randomness on the server.** Engines take an `rng`; the server passes `Math.random` per request so a client cannot influence a draw. Alternative: seeded RNG stored in the room for replay; not needed.

## Risks / Trade-offs

- [A hidden field is missed in a view] → One test per game asserts no opponent card id appears anywhere in another seat's serialized payload, including `log`, and a UNO test covers `wasLegal`.
- [Engine returns unchanged for a legal-looking move, silently 400s in the UI] → The action route returns the engine's reason when it exposes one; otherwise a generic message, and clients show it.
- [Host closes the tab] → Computers stall, same as before; documented, not fixed here.
- [Per-action round trip replaces local compute] → Moves wait for the server; the host's 680 ms computer step already tolerates this.
- [Large client diffs in four files] → One game at a time behind the shared module, each with its own tests before the next.

## Migration Plan

1. Land `lib/engine-room.js`, route helper and service with tests, unused.
2. Convert one game at a time (UNO, DOS, Phase 10, Flip 7): adapter, route, client, tests.
3. After each game ships, its old `PUT` route handler is gone, so rollback is reverting that game's commit; rooms open at the time of a rollback are lost, as in the forward direction.
4. Update docs and specs once all four are done.

## Open Questions

- Whether to also convert the remaining token-gated games afterward, one change each (BANG!, Cover Your Assets, Five Crowns, No Thanks!, Qwirkle, Sequence and others).
