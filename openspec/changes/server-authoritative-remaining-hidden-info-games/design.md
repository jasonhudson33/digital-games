# Design

## Context

`lib/engine-room.js`, `lib/engine-room-route.js`, `components/engine-room-service.js` and `lib/use-engine-room.js` run ten games. A game plugs in with an adapter `{ createLobby, addPlayer, actions, computerStep, view }` over its unchanged engine. See the archived `server-authoritative-hand-games` and `server-authoritative-hidden-info-games` changes and ADR 0004 for the pattern and its trade-offs. A throwaway undefined-name check is needed for client conversion because `npm run typecheck` does not cover `components/`.

Hidden state in the five engines:

- Dominion (`lib/dominion.js`): `players[].hand` and `deck`, both arrays of card names such as `"copper"`, not unique ids, so tests compare arrays and counts rather than searching for ids. Discard piles, cards in play, the supply and trash are public. Pending choices (Cellar, Remodel, Mine, Militia) carry no card contents.
- Risk (`lib/risk.js`): `players[].cards` and the card `deck`/`discard`. The engine has no lobby: the lobby object, joining and starting (`createRiskGameFromLobby`) live in the browser. Most functions (`placeReinforcement`, `attackTerritory`, `fortifyTerritory`, `advancePhase`) act on the current player without taking a player id. `attackTerritory` accepts an `options.rng`, which a client must never supply.
- Splendor (`lib/splendor.js`): `players[].reserved`, and `decks` (three face-down decks). The three markets are public.
- Ticket to Ride (`lib/ticket-to-ride.js`): `players[].cards`, `destinations` and `pendingDestinations`, and `trainDeck`, `trainDiscard`, `destinationDeck`. `faceUp` is public. `finalScores` at the end reveals ticket outcomes.
- Viticulture (`lib/viticulture.js`): `players[].cards` (`vines`, `orders`, `summer`, `winter`), and `decks` and `discard` per kind. Fields, structures, grapes, wine, placements and wake-up rows are public.

## Goals / Non-Goals

**Goals:**
- Five adapters on the existing engine room with no change to `lib/engine-room.js`.
- Per-seat views that withhold exactly what the rules withhold; for Risk, authority over turns and dice.

**Non-Goals:**
- Changing rules or UI; moving Life, No Thanks! or Spyrium, which hold nothing hidden; Catan and Monopoly.

## Decisions

**1. Views follow the established shape.** Other seats' hidden lists become `[]` plus a count (`handCount`, `cardCount`, `reservedCount`, per-kind counts for Viticulture), and each deck or hidden pile becomes `[]` plus a count (`deckCount`, and a per-level or per-kind count object). Where the browser reads `array.length` for display, the client switches to the count.

**2. Dominion hides every draw pile, including the viewer's own.** A player may not know the order or contents of their draw pile. Discard piles stay public, as in the physical game.

**3. Risk gets a small server module for what the engine lacks.** `lib/risk-room-adapter.js` adds `createLobby`, `addPlayer` (up to six), `addComputer`, `removeComputer`, `setTradeMode`, and `start` (via `createRiskGameFromLobby`), and wraps each in-game action with a check that `playerId` is the current player before calling the engine. Attack options are rebuilt from the request as only `{ attackDice }`; the server's `rng` is the only source of dice. Alternative: change every engine function to take a player id; rejected as a wider edit than the adapter.

**4. Risk's computer turn is one step.** `runComputerTurn` plays a whole computer turn, matching the existing client behavior; the host's browser keeps its pacing and calls `computerStep` once per computer turn.

**5. Ticket to Ride reveals tickets at the end.** While playing, other seats' `destinations` and `pendingDestinations` are empty with counts; when `phase` is `finished`, every seat's `destinations` are included so the final scoring screen can list them.

**6. Splendor hides all of another seat's reserved cards.** In the physical game a card reserved from the market is public and one reserved from a deck is not; the engine does not record which it was, so the view hides both. A later change can add the source if players want the market-reserved cards shown.

**7. Viticulture decks and discards become counts per kind.** `decks` and `discard` keep their keys (`vines`, `orders`, `summer`, `winter`) with an empty list and a count beside each.

**8. Computer steps use the existing host pacing** for all five games, with each engine's `runComputerTurn`.

## Risks / Trade-offs

- [A view leaks a card, ticket or reservation] → One test per game asserts that nothing from another seat's hidden fields or the decks appears in a seat's serialized payload (arrays and counts for Dominion), including `log`.
- [Risk's client is large and holds lobby logic] → The lobby moves first with its own tests and a live HTTP run before the in-game actions; the undefined-name check runs on the converted client.
- [Splendor over-hides market reservations] → Documented in decision 6 and the context doc.
- [A client reads an opponent's hidden array length] → The undefined-name check and the live HTTP runs catch missing fields.
- [Engine functions with no player argument accept moves from anyone] → Every Risk action is gated by the adapter's turn check, with a test per action that a non-current seat is refused.

## Migration Plan

Convert one game at a time in the order Dominion, Splendor, Viticulture, Ticket to Ride, Risk, each with its tests, docs and a live HTTP run. Roll back a game by reverting its commit; open rooms of that game are lost either way.

## Open Questions

- Whether to also move Life, No Thanks! and Spyrium so a seated player cannot overwrite their boards with a `PUT`; they hold nothing hidden, so it is deferred.
