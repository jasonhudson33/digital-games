# Design

## Context

`resolveNight` in `NightRules.ts` returns result strings that the host stores in room state and `DayPhase.tsx` prints for every player. When the killer target equals the angel save it returns the fixed text "A life was spared in the night." See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Name the spared player in the existing result text.

**Non-Goals:**
- Revealing the spared player's role or card.
- New UI, new state fields, or changes to who sees the results screen.

## Decisions

- **Change only the message in `resolveNight`.** The player is looked up from the players list by the target id, and the text becomes "{name} was attacked in the night but was spared." Alternative: add a `sparedPlayerId` to `PhaseResult` and render separately. Rejected because nothing else needs the id and the text already reaches everyone.
- **Fall back to the old wording if the player can't be found**, so a stale id never produces "undefined".

## Risks / Trade-offs

- Naming the spared player tells the table the angel guessed right and the killers targeted that player → this is the requested behavior; accepted.
