# Design

## Context

Online games come in three client styles:

- **Legacy room clients** (Scum, Secret Hitler, Killer Bunnies, Hand and Foot, Skull King, Pinochle): a per-game service with `load(code, token)`. Every server error comes back as HTTP 400, so "room gone" and "bad token" can only be told apart by message: `Room not found.` and `Join the room before taking actions.`. Hand and Foot, Skull King and Pinochle already handle this correctly, each with its own copy of the storage helpers and the stale check.
- **Engine-hook games** (18 games through `lib/use-engine-room.js`, plus Dos and Uno with their own clients on `engine-room-service`): `load` returns `null` for a 404 (room gone), and a bad seat comes back as `EngineRoomError` with status 403. Tokens are already in `localStorage`. The hook, Dos and Uno forget the remembered room on any error.
- **Catan and Risk**: engine service, and their resume swallows errors (`.catch(() => undefined)`), so the seat is kept but nothing retries.

`lib/room-poll.js` already pauses on hidden tabs and refetches when the page becomes visible again. Once a client is back in the room, sleep is handled. The bug is only in the first resume.

## Goals / Non-Goals

**Goals:**
- One shared, tested piece of logic for storing seats, recognising a stale seat, and retrying the resume.

**Non-Goals:**
- No server changes. Status codes and messages stay as they are.
- No changes to how polling behaves once a client is in the room.

## Decisions

- **`lib/room-seat.js` exports:**
  - `readSeatToken(key)`, `writeSeatToken(key, token)` and `forgetSeatToken(key)`. They use `localStorage`, migrate any `sessionStorage` copy on read, and are wrapped in try/catch for private-mode browsers.
  - `isStaleSeatError(error)`, which is true when a `null` result has been turned into a not-found error, when the error is an `EngineRoomError` with status 404 or 403, or when the message is one of the two legacy messages. That keeps the message matching in one place.
  - `resumeRoom({ load, onState, onStale, onRetrying, env })`. It runs `load`. On success it calls `onState`; on a stale error, `onStale`; otherwise `onRetrying(error)`, then it retries with backoff (1s, doubling, up to 15s) and immediately on the window's `online` event or when the page becomes visible. It returns a `cancel()`. `env` can be injected like `room-poll`'s, so it can be tested without timers.
- **Per-game key names stay as they are.** Each client passes its existing key (`scum-room-token:CODE`, `hand-foot-room-token:CODE`, …), so seats saved before the change still work.
- **Engine hook.** `use-engine-room` resumes through `resumeRoom` with `load: () => service.load(code)`. A `null` result counts as stale. The remembered room (`keys.room`) is removed only in `onStale`.
- **Reconnecting UI.** Each client already has an `error` banner. `onRetrying` sets it to "Reconnecting to room CODE…", and it clears on success. The engine hook already exposes an error state, so it uses the same message.
- **Rejoin with code.** Scum and Secret Hitler `joinRoom` first try `load(code, savedToken)`, as Pinochle does. If the seat is stale they forget it and fall through to a normal join; any other error is shown to the player.

## Risks / Trade-offs

- [A `localStorage` seat outlives the tab, so on a shared browser the next person who opens the room link lands in your seat] → The same trade-off Hand and Foot, Skull King and Pinochle already make. Leave clears it.
- [Message matching breaks if someone rewords the legacy errors] → It's isolated in `isStaleSeatError`, and a test pins both messages against the real `scum-rooms` errors.
- [Infinite retries against a room that's permanently down] → Backoff caps at 15s and stops while the tab is hidden. The player can always tap Leave.
