# Tasks

## 1. Shared seat helper

- [x] 1.1 Create `lib/room-seat.js` with `readSeatToken`, `writeSeatToken`, `forgetSeatToken` (localStorage, migrating from sessionStorage, private-mode safe) and `isStaleSeatError`. Verify with `tests/room-seat.test.mjs`: migration, missing storage, and stale detection for null/404/403 and the two legacy messages, with the messages taken from real `lib/scum-rooms.js` rejections.
- [x] 1.2 Add `resumeRoom` with an injectable env (backoff 1s→15s, retry on `online` and on becoming visible, `cancel()`). Verify with tests where a network error retries and then succeeds, a stale error calls `onStale` once and stops, and `cancel()` stops retries.

## 2. Legacy room clients

- [x] 2.1 Scum: use the helper for storage, resume and leave, show "Reconnecting to room CODE…", and make `joinRoom` reuse a saved seat. Verify in the running app: start a game, delete only sessionStorage and reload (the seat comes back); block the network and reload (it shows reconnecting, then recovers once unblocked); enter the code and tap Join (back in the same seat).
- [x] 2.2 Secret Hitler: the same changes as 2.1. Verify the same way.
- [ ] 2.3 Killer Bunnies: forget the token only on `isStaleSeatError` and resume through `resumeRoom`. Verify by blocking the network on reload: the seat is kept and recovers.
- [ ] 2.4 Hand and Foot, Skull King, Pinochle: replace their local token and stale helpers with the shared ones, keeping their key names. Verify that `npm test` still passes and that a reload in each still resumes the seat.

## 3. Engine-based clients

- [ ] 3.1 `lib/use-engine-room.js`: resume through `resumeRoom`, remove `keys.room` only when stale, and surface the reconnecting message. Verify in one engine game (e.g. No Thanks): with the network blocked on reload it shows reconnecting and recovers, and with an unknown room it falls back to the landing page.
- [ ] 3.2 Dos and Uno: the same resume behaviour in their clients. Verify each by blocking the network on reload.
- [ ] 3.3 Catan and Risk: replace `.catch(() => undefined)` with `resumeRoom` so they retry. Verify each by blocking the network on reload.

## 4. Integration

- [ ] 4.1 Run `npm test` and verify it passes.
- [ ] 4.2 Search the code for remaining room-token `sessionStorage` use and for resume catches that remove a seat unconditionally (`grep -nE "sessionStorage|catch\(\(\) => localStorage.removeItem" components lib`). Verify only intentional uses remain, such as Camel Up's recap flag.
