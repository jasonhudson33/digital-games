# Design

## Context

`lib/engine-room.js`, `lib/engine-room-route.js`, `components/engine-room-service.js` and `lib/use-engine-room.js` run twenty-one games. A game plugs in with an adapter `{ createLobby, addPlayer, actions, computerStep, view }` over its unchanged engine. See the earlier archived server-authoritative changes and ADR 0004. The throwaway undefined-name check used for the earlier client conversions is still needed because `npm run typecheck` does not cover `components/`.

Observed in the three engines:

- Life (`lib/life.js`): `spinLife(state, playerId, forcedSpin)` accepts a number, and `components/life-client.js` picks the number in the browser (`Math.floor(Math.random() * 10) + 1`), animates, then sends it. Hidden state is `lifeTilePool`, each player's `lifeTiles` (physical tiles are held face down), `millionaireBonus`, and the career `options` in a pending career choice. The player card shows `lifeTiles.length` for everyone and the net worth only once the game has finished.
- No Thanks! (`lib/no-thanks.js`): the `deck` order is hidden; `activeCard`, each player's `cards` and `chips` are all rendered for every player, so they stay public.
- Spyrium (`lib/spyrium.js`): `decks.A/B/C` hold the cards of future markets, and `events` lists every event of the game (with drawn token values) while `currentEvent` and `futureEvent` are the only two a player may know. The client reads neither `decks` nor `events`.

## Goals / Non-Goals

**Goals:**
- Three adapters on the existing engine room with no change to `lib/engine-room.js`.
- Make Life's spin a server decision.

**Non-Goals:**
- Hiding No Thanks! chip counts (the UI shows them); Catan and Monopoly; rule or UI changes.

## Decisions

**1. Life spins on the server.** The adapter's `spin` action calls `spinLife(game, playerId)` with no third argument, so the engine rolls its own number. The client keeps its spinning animation but starts it when the seat clicks, waits for the server's response and then settles on `room.lastSpin.number`, instead of choosing the number first. The animation therefore ends when the response arrives. Alternative: let the client pre-roll and send it; rejected because that is the cheat.

**2. Life hides tiles until the end.** Other seats' `lifeTiles` become `[]` plus `lifeTileCount`; `lifeTilePool` and `millionaireBonus` become `[]` plus counts; a pending career choice keeps `options` only for the seat choosing. When `phase` is `finished`, all tiles and the bonus are included so `playerNetWorth` works on the results screen. Retirement choices reveal nothing hidden.

**3. No Thanks! hides only the draw pile.** `deck` becomes `[]` plus `deckCount`; the client's "after this one" counter reads the count.

**4. Spyrium hides decks and distant events.** `decks.A/B/C` become `[]` plus counts per period; `events` becomes `[]` plus `eventsRemaining`; `currentEvent` and `futureEvent` stay as they are.

**5. Computer steps follow the established host pacing.** `runLifeComputerTurn` (one move per step), `runComputerStep` and `runComputerTurn` become each adapter's `computerStep`. Life's computer choices use `Math.random` inside the engine, which now runs on the server.

**6. The Life engine uses differently named exports.** Its adapter maps `createLifeLobby`, `addLifePlayer`, `addLifeComputer`, `removeLifeComputer`, `startLifeGame`, `chooseLifePath`, `chooseCareer`, `chooseRetirement`, `buyInvestment` and `spinLife` onto action names; no engine renames.

## Risks / Trade-offs

- [A view leaks a tile, deck card or event] → One test per game asserts nothing hidden appears in another seat's serialized payload, including `log`.
- [Life's animation now waits on a round trip] → The spinner shows the spinning state until the response arrives; the old fixed 1.05 s delay is dropped.
- [Life's net worth shown mid-game would reveal tiles] → The client only shows it when finished, and the view includes tiles only then.
- [A computer engine loop does not terminate] → Each adapter test steps computers repeatedly with a cap, as the Risk change found a real hang that way.

## Migration Plan

Convert one game at a time in the order No Thanks!, Spyrium, Life, each with its tests, docs and a live HTTP run. Roll back a game by reverting its commit; open rooms of that game are lost either way.

## Open Questions

None that change the specs or tasks.
