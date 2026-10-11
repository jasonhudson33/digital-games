## Context

Catan state lives in `components/catan-client.js`. The module-level functions (lines ~1531–2400: `placeStartingSettlement`, `resolveDiceRoll`, `advanceGameTurn`, `buyDevelopmentCardFor`, `completeBuild`, robber/pirate/gold resolvers, `awardProgressCards`, `takeComputerAction`, knight and city-track actions) are already pure `(game, …) => game`. Board geometry, `createGame` and `createLobby` (lines 1–504) are also pure. The ~30 React handlers (lines 640–1180) wrap them with validation and call `CatanRoomService.update(code, updater)`. `catan-rules.js` and `catan-computer-strategy.js` are already pure and tested.

## Goals / Non-Goals

**Goals:** server-run rules, hidden cards, server randomness, one-step computer turns; existing Catan tests and visible gameplay unchanged.
**Non-Goals:** rule changes, UI redesign, TypeScript conversion, spectator mode.

## Decisions

1. **Move, don't rewrite.** Cut the pure code into `lib/catan-board.js` (geometry, ports, legality), `lib/catan-engine.js` (create/setup/turn/build/trade/cards/robber/barbarians/computer), keeping function bodies intact. The component imports board helpers it needs for rendering. Rationale: lowest regression risk; verified by existing tests plus a full-game smoke run.
2. **Handlers become actions.** Each handler's validation moves into an adapter action `{ run(game, {playerId, args, rng}) }` returning the unchanged game when illegal. Client handlers call `service.act(name, args)`. A table in the adapter lists authority per action (active player, victim, discarding player, trade partner, gold/city-loss chooser, host).
3. **Randomness via injected `rng`.** `catanRuntime.rollDice`, `shuffled`, deck draws and robber steal index take an `rng`; the client no longer rolls. Steal index is chosen on the server instead of the victim's picked card slot UI, with the victim's card choice removed from args.
4. **Views.** `catanView(game, viewerId)` replaces other players' `resources`, `developmentCards`, `progressCards` with counts and empties both decks; `__seats` and engine marker follow the existing engine room.
5. **Awards reconcile on the server.** `reconcileCatanAwards` runs after every changed action, as `updateGame` does today.
6. **Polling.** Catan switches to `lib/use-engine-room.js`; `subscribeToRoomState` and the whole-state route are removed with `client-room-route.js`.
7. **Staging.** Extract and test first (client still works through a shim), then add adapter and tests, then convert client and delete the old route.

## Risks / Trade-offs

- A single missed handler check is a hole → authority table test enumerates every action and asserts out-of-turn rejection.
- Client prediction (legal vertices/edges) still uses local helpers; stale views only cost a rejected action.
- Host-driven computer turns stall without the host's browser (same as other games).
- Old rooms are dropped (410), accepted for every earlier conversion.
- No real-browser pass is possible in this environment; verify with HTTP smoke and manual play afterwards.
