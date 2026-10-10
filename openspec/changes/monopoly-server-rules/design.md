# Design

## Context

The engine room (`lib/engine-room.js`, its routes and browser service) runs every game except Catan and Monopoly. Monopoly's rules are in `monopoly/src/game.ts` (about 40 exported pure functions, TypeScript) and its UI in `monopoly/src/main.tsx`, which calls `updateGame(state => engineFunction(state, ...))` about 36 times. Most engine functions act on "whoever's decision is pending" without naming a player (`rollDice(state)`, `buyPendingProperty(state)`, `acceptTrade(state)`, `bidAuction(state)`); a few name one (`mortgageProperty(state, playerId, spaceId)`, `proposeTrade(state, fromPlayerId, ...)`). Dice use `Math.random` inside the engine. `computerShouldAct(state)` and `takeComputerAction(state)` already express who moves next and the computer policy. `addLocalPlayer` adds hot-seat players with ids starting `local-`. `makeInitialState(hostId, name, code, piece)` and `joinPlayer(state, id, name, piece)` take a chosen piece. `monopoly/scripts/game-rules.test.mjs` loads the TypeScript through a Vite server; there is no Node-native way to import it.

## Goals / Non-Goals

**Goals:**
- Run the engine unchanged on the server with an authority check on every action.
- Keep local (hot-seat) play, computer players, trades with a timer and the piece picker working.

**Non-Goals:**
- Catan; rule changes; UI changes beyond swapping how actions are sent.

## Decisions

**1. The adapter derives authority from state, not from the request.** For each action the adapter computes the one player allowed to make it, then requires that the acting seat is that player (or, for the host, a local seat that is that player). The table:

| Action | Allowed player |
|---|---|
| roll, pay to leave jail, use jail card, stay in jail and roll | the current player |
| forced jail exit (pay, use card) | `pendingJailExit.playerId` |
| acknowledge card | `pendingCard.playerId` |
| buy or decline the pending property | `pendingPurchase.playerId` |
| flat or percent income tax | `pendingTax.playerId` |
| acknowledge rent | `pendingRent.payerId` |
| roll utility rent | `pendingUtilityRent.payerId` |
| finish debt payment | `pendingDebt.playerId` |
| finish management stage, buy, sell, mortgage, unmortgage | the player named in the request, who must be the acting player |
| propose trade | the proposer named in the request |
| accept or decline a trade | `pendingTrade.toPlayerId` |
| auction bid, pass, complete | `pendingAuction.activePlayerId` |
| expire a trade | any seated player; the engine ignores it before the expiry time |
| set house rules, add computer or local player, start, restart | the host |

**2. Host acts for local seats.** A request may carry `asPlayerId`. It is honored only when the sender is the host and the named player's id starts with `local-`; otherwise an `asPlayerId` is rejected. Alternative: give each local seat a token the host holds; rejected because it adds storage for no benefit.

**3. Pass create and join options through the engine room.** `create` and `join` gain an optional adapter-defined `options` object, passed unchanged to `createLobby` and `addPlayer`. Monopoly uses it for the chosen piece, and its adapter throws a specific error ("That piece is already taken") instead of the generic refusal. Existing adapters ignore it.

**4. Dice and randomness stay inside the engine.** Because the engine runs on the server, `Math.random` is already the server's. The adapter never reads a die from a request, and a test pins `Math.random` to prove it.

**5. Trade expiry uses the server clock.** The client's timer still asks the server to `expireTrade`; the engine's own `now < expiresAt` check makes an early request a no-op, and the server passes its own `Date.now()`.

**6. Computer steps use the established host pacing.** `takeComputerAction` is the adapter's `computerStep`, guarded by `computerShouldAct`; the client keeps its delay.

**7. TypeScript adapter, Vite-harness tests.** The adapter imports `game.ts`, so it is written in TypeScript under `monopoly/src/` and tested with the same Vite server pattern `game-rules.test.mjs` uses; `npm run test:monopoly` runs the new test file as well. The route files import the engine room module, which Next compiles as it already does for the rest of the app.

## Risks / Trade-offs

- [An action's allowed player is mis-derived and blocks legitimate play] → One test per row of the table for the right seat succeeding and a wrong seat failing, and a live HTTP run through a full turn with a computer and a local seat.
- [Local seats are used by the host in ways the id-prefix rule does not cover] → The rule matches `addLocalPlayer`, the only way a local seat is created.
- [Trade timer relies on the client] → A client that never asks leaves a trade pending, as before; the server never expires early.
- [The engine room change affects every game] → The new `options` argument is optional and ignored by existing adapters; the whole existing engine test suite must pass unchanged.

## Migration Plan

Land the engine-room `options` support with tests, then the adapter and its tests, then the client conversion, then docs. Roll back by reverting the commits; open rooms are lost either way, as in the earlier moves.

## Open Questions

None that change the specs or tasks.
