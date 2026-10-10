# Tasks

## 1. No Thanks!

- [x] 1.1 Add the No Thanks! adapter over `lib/no-thanks.js` (lobby, start, take, pass, computer step) hiding the draw pile, and wire `app/api/no-thanks/rooms` with a collection route; verify with tests that no draw pile card is in a seat's payload and the count is, the active card, chips and taken cards stay public, passing with no chips or out of turn is rejected, and a full round can be played to the end
- [x] 1.2 Convert `components/no-thanks-client.js` and `no-thanks-room-service.js` to actions, `deckCount` and host `computerStep`; verify `npm run typecheck`, `npm run build`, the undefined-name check on the client, and a live HTTP run of a full round
- [x] 1.3 Update `docs/contexts/no-thanks.md`; verify `openspec validate`

## 2. Spyrium

- [x] 2.1 Add the Spyrium adapter over `lib/spyrium.js` (lobby, start, place worker, begin activation, activate card, use building, use event, withdraw money, choose bonus, pass, computer step) hiding the three decks and events beyond the next, and wire the routes; verify with tests for hidden decks and events, a public market and current and next event, and an out-of-turn or unaffordable move being rejected
- [x] 2.2 Convert `components/spyrium-client.js` and its service; verify typecheck, build, the undefined-name check and a live HTTP run through several rounds with a computer
- [x] 2.3 Update `docs/contexts/spyrium.md`; verify `openspec validate`

## 3. Life

- [x] 3.1 Add the Life adapter over `lib/life.js` (lobby, start, choose path, choose career, choose retirement, buy investment, spin with no client-supplied number, computer step) hiding tiles, the tile pool, the millionaire bonus and other seats' career offers until the game ends, and wire the routes; verify with tests that a spin request carrying a number gets the server's own spin, hidden fields are absent until finished and present after, and out-of-turn moves are rejected
- [x] 3.2 Convert `components/life-client.js` and its service so the spinner animates until the server responds and then shows `room.lastSpin.number`; verify typecheck, build, the undefined-name check and a live HTTP run from lobby to retirement
- [x] 3.3 Update `docs/contexts/life.md`; verify `openspec validate`

## 4. Close out

- [x] 4.1 Update `CONTEXT-MAP.md` (the client-authoritative group is now Catan and Monopoly only), ADR 0004, `README.md`, and the Purposes of `platform/server-authoritative-rooms` and `platform/client-authoritative-rooms` in `openspec/specs/`; verify the docs list the same games as the routes that use the engine room
- [x] 4.2 Run `npm test`, `npm run typecheck`, `npm run build` and `npm run validate`; verify all pass
