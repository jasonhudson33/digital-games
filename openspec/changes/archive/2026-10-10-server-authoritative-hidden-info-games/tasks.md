# Tasks

## 1. BANG!

- [x] 1.1 Add the BANG! adapter over `lib/bang.js` (actions for lobby, play card, respond, decline, general store, Sid Ketchum, discard, end turn; view masking roles per design decision 1, hands and deck) and wire `app/api/bang/rooms` with a collection route; verify with tests that no opponent hand card id or hidden role appears in another seat's payload, roles appear for the Sheriff, eliminated players and a finished game, and illegal or out-of-turn actions are rejected
- [x] 1.2 Convert `components/bang-client.js` and `bang-room-service.js` to actions and host `computerStep`; verify `npm run typecheck`, `npm run build` and a live HTTP run of create, join, add computer, start, play, respond, end turn
- [x] 1.3 Update `docs/contexts/bang.md`; verify `openspec validate`

## 2. Cover Your Assets

- [x] 2.1 Add the adapter over `lib/cover-your-assets.js` (pair from hand or discard, discard, challenge, play challenge card, yield) and wire the routes; verify with tests for hidden hands and deck, public stacks and top discard, and a challenge with a card not held being rejected
- [x] 2.2 Convert `components/cover-your-assets-client.js` and its service; verify typecheck, build and a live HTTP run through a challenge
- [x] 2.3 Update `docs/contexts/cover-your-assets.md`; verify `openspec validate`

## 3. Five Crowns

- [x] 3.1 Add the adapter over `lib/five-crowns.js` (draw, take discard, lay down, discard, go out) and wire the routes; verify with tests for hidden hands and deck, public top discard and laid melds, and going out with an unmeldable hand being rejected
- [x] 3.2 Convert `components/five-crowns-client.js` and its service; verify typecheck, build and a live HTTP run of a round
- [x] 3.3 Add a Five Crowns section to `docs/contexts/five-crowns.md`; verify `openspec validate`

## 4. Sequence

- [x] 4.1 Add the adapter over `lib/sequence.js` (team count, play card, exchange dead card) and wire the routes; verify with tests for hidden hands and deck, a public board, and a card not held being rejected
- [x] 4.2 Convert `components/sequence-client.js` and its service; verify typecheck, build and a live HTTP run of several turns with a computer
- [x] 4.3 Update `docs/contexts/sequence.md`; verify `openspec validate`

## 5. Qwirkle

- [x] 5.1 Add the adapter over `lib/qwirkle.js` (play tiles, exchange tiles) and wire the routes; verify with tests for hidden racks and bag count, a public board, tiles not held being rejected, and a legal move being scored on the server
- [x] 5.2 Convert `components/qwirkle-client.js` and its service to read `bagCount` and rack counts; verify typecheck, build and a live HTTP run of several turns
- [x] 5.3 Update `docs/contexts/qwirkle.md`; verify `openspec validate`

## 6. Stratego

- [x] 6.1 Add the Stratego adapter over `lib/stratego.js` (place, clear, auto place, ready, move, lobby actions) with the view from design decisions 3 and 4, and wire the routes; verify with tests that no opponent piece kind appears while pieces are unrevealed, opponent squares are absent during setup, `captured` and `lastBattle` reveal only what they should, and an illegal move or a move by the wrong seat is rejected
- [x] 6.2 Convert `components/stratego-client.js` and its service, keeping the battle dialog and computer pacing; verify typecheck, build and a live HTTP run from deployment through several moves
- [x] 6.3 Update `docs/contexts/stratego.md`; verify `openspec validate`

## 7. Close out

- [x] 7.1 Update `CONTEXT-MAP.md`, ADR 0004's game list (now 8 games), `README.md`, and the Purposes of `platform/server-authoritative-rooms` and `platform/client-authoritative-rooms` in `openspec/specs/`; verify the docs list the same games as the routes that use the engine room
- [x] 7.2 Run `npm test`, `npm run typecheck`, `npm run build` and `npm run validate`; verify all pass
