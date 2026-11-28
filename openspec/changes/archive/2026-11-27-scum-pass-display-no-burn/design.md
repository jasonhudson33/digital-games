# Design

## Context

Turn rules in `lib/scum.js` already require a play to match the pile's size and beat its rank, and `passed[]` already skips players until `clearScumPile` resets it. The only exception is a `selected.length === 4` branch in `playScumCards` that clears the pile. The bot scorer adds +600 for any play that would burn. The room sends `passed` to every browser (`serializeRoom` spreads the game state), but `components/scum-client.js` never reads it.

## Goals / Non-Goals

**Goals:**
- Remove the special case so fours follow the normal path.
- Show pass state using data the browser already has.

**Non-Goals:**
- No changes to the continuation or move-on flow, turn order, or the trade phase.

## Decisions

- **Delete the burn branch, don't put it behind an option.** Nobody asked for a house-rule setting, and an option would mean a lobby control, stored room state and a second code path. If it's wanted later it can come back as an option.
- **Bot scoring.** Drop the `burnsPile` bonus. The size value (`cards.length * 35/70`) still makes the bot prefer shedding big sets, which is reasonable.
- **The pass badge comes from `game.passed`.** The opponent tile takes a `passed` prop (`game.passed.includes(playerIndex)`). The tile gets a `passed` class that dims it, and the card count is replaced with "Passed". The viewer's seat chip shows "Passed" when the viewer is in `passed` and it isn't their continuation. Because `clearScumPile` empties `passed`, badges disappear at the next lead with no extra state.
- **`passed` can be missing.** Use `game.passed ?? []` in the client so older saved rooms still render.

## Risks / Trade-offs

- [Games in progress change rules mid-round] → Harmless. The next four-card play just stays on the pile.
- [The pass badge competes with the "thinking" dots on a narrow tile] → A passed player is never the active player, so the two never show at once.
