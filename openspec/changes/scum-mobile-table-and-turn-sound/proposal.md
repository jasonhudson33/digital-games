# Proposal

## Why

On a phone, Scum's table is taller than the screen (about 980px at 4 players and 1,200px at 10, on an 844px-tall iPhone). On your turn the page sits on your hand, so the opponents, who passed, and what was just played are all off screen. Large tables (up to 20 seats, 5 decks) make it worse. Players also miss their turn when they look away, because nothing tells them it's their turn except the screen.

## What Changes

- On phone-width screens, the Scum table fits one screen without page scrolling:
  - Opponents become a compact strip of chips (initial, card count, Passed or finished) that scrolls sideways at large tables.
  - The last-play message stays visible above a smaller pile.
  - The rank-order strip is hidden (it's in the rules).
  - The hand uses smaller cards.
  - Pass and Play stay pinned to the bottom.
  - The site header is hidden while a Scum game is on screen.
- A short chime plays when it becomes your turn, or when you must choose cards to trade. Phones that support vibration also buzz.
- A sound on/off control in the game bar is remembered per browser.
- Desktop layout is unchanged.

Out of scope: alerts while the phone is locked or the tab is in the background (that needs push notifications), and the same treatment for other games.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `games/scum`: new requirements that the phone table fits one screen and that the player is alerted on their turn, with a mute control.

## Impact

- `app/scum/scum.css`: phone-width layout
- `components/scum-client.js`: opponent strip markup, last-play line, turn-alert hook, and a sound toggle in the game bar's `actions`
- New `lib/turn-alert.js`: Web Audio chime, vibration, unlocking audio on first tap, and the mute preference, with tests
- No server changes
