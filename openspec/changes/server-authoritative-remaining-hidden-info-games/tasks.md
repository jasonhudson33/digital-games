# Tasks

## 1. Dominion

- [x] 1.1 Add the Dominion adapter over `lib/dominion.js` (lobby, start, play action, resolve choice, advance to buy, buy, end turn, computer step) with every draw pile hidden and other hands as counts, and wire `app/api/dominion/rooms` with a collection route; verify with tests that other seats' hands and all draw piles are absent from a payload (comparing arrays and counts), discard piles stay public, and a play from a missing hand index or a buy without coins is rejected
- [x] 1.2 Convert `components/dominion-client.js` and `dominion-room-service.js` to actions and host `computerStep`; verify `npm run typecheck`, `npm run build`, the undefined-name check on the client, and a live HTTP run of a full turn including a pending choice
- [x] 1.3 Update `docs/contexts/dominion.md`; verify `openspec validate`

## 2. Splendor

- [x] 2.1 Add the Splendor adapter over `lib/splendor.js` (lobby, start, take tokens, take pair, reserve, pass, purchase, return tokens, choose noble, computer step) hiding other seats' reserved developments and the three decks, and wire the routes; verify with tests for hidden reservations and decks, public markets, and an unaffordable purchase being rejected
- [x] 2.2 Convert `components/splendor-client.js` and its service; verify typecheck, build, the undefined-name check and a live HTTP run of several turns with a computer
- [x] 2.3 Update `docs/contexts/splendor.md`, including that all of another seat's reservations are hidden; verify `openspec validate`

## 3. Viticulture

- [x] 3.1 Add the Viticulture adapter over `lib/viticulture.js` (lobby, start, choose wake-up, take action with payload and worker type, pass season, computer step) hiding other seats' cards and the four decks and discards, and wire the routes; verify with tests for hidden cards and decks, public fields and wine, and an order not held being rejected
- [x] 3.2 Convert `components/viticulture-client.js` and its service; verify typecheck, build, the undefined-name check and a live HTTP run through a year
- [x] 3.3 Update `docs/contexts/viticulture.md`; verify `openspec validate`

## 4. Ticket to Ride

- [x] 4.1 Add the Ticket to Ride adapter over `lib/ticket-to-ride.js` (lobby, start, choose opening destinations, draw card, claim route, draw destinations, choose drawn destinations, computer step) hiding other seats' cards, tickets and pending choices and all decks, revealing tickets when finished, and wire the routes; verify with tests for hidden cards, tickets and decks, tickets revealed at the end, and a claim without the cards being rejected
- [x] 4.2 Convert `components/ticket-to-ride-client.js` and its service; verify typecheck, build, the undefined-name check and a live HTTP run from ticket selection through several turns
- [x] 4.3 Update `docs/contexts/ticket-to-ride.md`; verify `openspec validate`

## 5. Risk

- [x] 5.1 Add the Risk adapter in `lib/risk-room-adapter.js` with a server-side lobby (create, join up to six, add and remove computers, trade mode, start via `createRiskGameFromLobby`), turn-gated wrappers for reinforce, trade, attack (only `attackDice` accepted), move in after conquest, fortify and end phase, and a view hiding other seats' cards and the deck; wire the routes; verify with tests that a seat that does not hold the turn is refused for every in-game action, a client-supplied rng is ignored, cards and deck are hidden, and a start with one commander is rejected
- [x] 5.2 Convert the lobby and in-game flows in `components/risk-client.js` and `risk-room-service.js` to actions and host `computerStep`; verify typecheck, build, the undefined-name check and a live HTTP run from lobby through a few turns with a computer
- [x] 5.3 Update `docs/contexts/risk.md`; verify `openspec validate`

## 6. Close out

- [x] 6.1 Update `CONTEXT-MAP.md`, ADR 0004's game list (now Life, No Thanks! and Spyrium), `README.md`, and the Purposes of `platform/server-authoritative-rooms` and `platform/client-authoritative-rooms` in `openspec/specs/`; verify the docs list the same games as the routes that use the engine room
- [x] 6.2 Run `npm test`, `npm run typecheck`, `npm run build` and `npm run validate`; verify all pass
