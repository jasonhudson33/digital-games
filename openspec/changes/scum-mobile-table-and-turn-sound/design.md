# Design

## Context

Scum already has phone rules in `app/scum/scum.css` (`@media (max-width: 560px)`), but `.scum-board` is given `min-height: calc(100dvh - 129px)` and a pile with a 235px minimum, opponents are a grid of full tiles, and the rank strip stays. The site header (`components/site-header.js`, rendered in `app/layout.js`) adds about 90px above the game bar. The hand uses the shared `CardFan` (`.tbl-fan` in `app/table.css`).

`platform/card-hands` requires every card to keep at least 24px of tappable width, and says a hand that can't meet that in one row continues on a second row. At 390px wide that limit is about 13–14 cards per row, so a 17-card hand can't fit in one row without breaking the platform spec. No game plays sound today. Room polling stops while the page is hidden (`lib/room-poll.js`).

## Goals / Non-Goals

**Goals:**
- Use CSS for the phone layout wherever possible, and change Scum's own markup only where CSS can't do the job.
- Build the turn alert as a reusable helper so other games can adopt it later.

**Non-Goals:**
- Background or locked-phone alerts.
- Changing the shared game bar, dialogs or `CardFan` rules.

## Decisions

- **The hand follows `platform/card-hands` instead of forcing one row.** On phones `.scum-hand` gets a smaller `--card-w` (about 44px), so a second row costs about 60px instead of about 270px. The "fits one screen" requirement is checked with that height in mind. Forcing one row would break the 24px touch-target rule.
- **Height budget at 390x844**, using a flex column sized to `100dvh`: game bar about 56px, opponent strip about 44px, last-play line about 22px, pile flexes from a 90px minimum, hand 2 × about 64px, controls about 52px sticky with `env(safe-area-inset-bottom)`. The pile takes whatever is left.
- **Opponent strip.** Under 560px, `.scum-opponents` becomes a single nowrap row with `overflow-x: auto`, and each `.scum-opponent` becomes a chip: avatar initial, card count, and the existing `passed`/`finished`/`active` classes for state. The name is shortened with an ellipsis. Only the CSS changes, because the markup already carries every class needed. The active chip scrolls into view on turn change (`scrollIntoView({ inline: "nearest" })`).
- **Last-play line.** `.scum-turn-message` already holds `game.message`. On phones it sits above the pile, one line, ellipsised. The "joins next round" note shrinks to the same line style.
- **Rank strip and site header.** `.scum-table-order` is hidden under 560px. The site header is hidden with `body:has(.scum-game-shell) .site-header { display: none }` inside the phone media query. That's CSS only, and the game bar's Leave and room code remain, so the `platform/game-layout` game-bar requirements still hold.
- **`lib/turn-alert.js`.**
  - `createTurnAlert({ storage, audio, vibrate })` returns `{ alert(key), isMuted(), setMuted(bool), unlock() }`.
  - `alert(key)` does nothing if `key` equals the last alerted key, if the alert is muted, or if `document.hidden`. Otherwise it plays two short sine tones (660Hz then 880Hz, about 90ms each, gain envelope) through one shared `AudioContext`, and calls `navigator.vibrate?.(60)`.
  - `unlock()` resumes the context on the first `pointerdown` or `keydown` (an iOS requirement).
  - The muted flag lives in `localStorage` under `digital-games:turn-sound`, so it's shared across games.
  - The dependencies are injectable for tests.
- **Alert key in Scum.**
  - Playing: `` `${roomCode}:${roundNumber}:${turnNumber}` `` when `humanTurn`.
  - Trading: `` `${roomCode}:${roundNumber}:trade` `` when the viewer is an upper trader who hasn't submitted.
  - A `useEffect` on that key calls `alert(key)`. Because the key only changes when a new turn arrives, refreshes don't repeat the chime.
- **Sound toggle.** A `Volume2`/`VolumeX` icon button is passed through `GameHeader`'s existing `actions` prop, with `aria-pressed` and the label "Turn sound".

## Risks / Trade-offs

- [`:has()` isn't supported in very old browsers] → The header simply stays visible there; the layout still works with scrolling.
- [Autoplay rules block the first chime if the player never tapped] → In practice everyone taps before their first turn (Create, Join, Start). The unlock runs on the first gesture.
- [Two-row hand plus 20 opponents is tight on 320px-wide phones] → The pile minimum shrinks first. 320px is checked in the browser verification task.
