# Tasks

## 1. Turn alert helper

- [x] 1.1 Create `lib/turn-alert.js` (`createTurnAlert` with injectable storage, audio and vibrate; two-tone Web Audio chime; dedupe by key; skip when muted or the page is hidden; `unlock()`; mute stored under `digital-games:turn-sound`). Verify with `tests/turn-alert.test.mjs`: the same key alerts once, a new key alerts again, muted and hidden pages stay silent, the mute choice persists, and vibrate is called when available.

## 2. Scum turn sound

- [x] 2.1 In `components/scum-client.js`, compute the alert key (play turn and pending trade), call `alert(key)` from an effect, unlock audio on the first pointer or key event, and add the "Turn sound" toggle to `GameHeader` `actions`. Verify in the running app with a spy on `AudioContext`/`navigator.vibrate`: one alert when the turn arrives, none on later polls of the same turn, none after muting, and the mute survives a reload.

## 3. Phone layout

- [x] 3.1 In `app/scum/scum.css`, under `max-width: 560px`: a `100dvh` flex column for the board, the opponent strip as sideways-scrolling chips (with passed, finished and active states), a one-line last-play message, a smaller pile, the rank strip hidden, `.scum-hand` `--card-w` about 44px, sticky controls with the safe-area inset, and the site header hidden via `body:has(.scum-game-shell)`. Verify with browser screenshots at 390x844 for 4 and 20 players: `document.documentElement.scrollHeight <= innerHeight`, and the opponents, message, pile, hand and buttons all visible.
- [x] 3.2 Scroll the active opponent chip into view when the turn changes. Verify at 20 players on a phone that the active chip is visible.
- [x] 3.3 Check 320x568 and the trading and results screens on a phone. Verify there's no sideways page scroll and the controls are reachable, and that desktop at 1280px is unchanged (compared against a screenshot taken before the change).

## 4. Integration

- [x] 4.1 Run `npm test`, including `tests/layout-check.test.mjs`, and verify it passes.
