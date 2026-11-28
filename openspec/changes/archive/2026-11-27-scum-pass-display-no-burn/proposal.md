# Proposal

## Why

In Scum, any four-card play clears ("burns") the pile and gives the player who played it the lead again. With five decks at large tables, fours come up constantly, so sets of four never stay on the pile to be beaten the way pairs and triples are. Players have also had no way to see who has already passed. The game skips passed players, but the table never shows it.

## What Changes

- **BREAKING** (rules): remove the four-of-a-kind burn. A four-card play stays on the pile like any other set, and the next player in turn order must beat it with a higher set of four or pass.
- The pile clears only when every other active player has passed. The last player's existing choice to continue or move on is unchanged.
- Computer players stop favouring four-card plays just to burn the pile.
- Players who have passed are marked "Passed" on their opponent tile and on the viewer's own seat until the pile clears.
- The rules dialog no longer mentions burning.

Out of scope: out-of-turn play (turn order still applies), and any host option to turn burns back on.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `games/scum`: the pile-clearing rule now makes plays of any size, four included, stay on the pile, which clears only on passes. A new requirement makes passed players visible until the pile clears.

## Impact

- `lib/scum.js`: `playScumCards` burn branch, bot play scoring
- `components/scum-client.js`: opponent tile, own seat, rules dialog
- `app/scum/scum.css`: passed styling
- `tests/scum-rules.test.mjs`: the burn test is replaced
- No API or storage changes. `passed` is already part of the state sent to the browser.
