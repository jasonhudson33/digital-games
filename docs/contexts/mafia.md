# Mafia

Mafia owns hidden role assignment, narrated phase progression, presence takeover, and elimination.

## Language

**Acting Host**: The present living player responsible for canonical transitions and narration.

**Private Role**: A role readable only with the owning device's room credential.

**Intent**: A player's private night selection or public day action awaiting host aggregation.

**Phase Result**: An elimination result that must be acknowledged before progression.

## Relationships

- The **Acting Host** aggregates **Intents** into canonical room state.
- A **Private Role** never appears in shared state before game over.
- A **Phase Result** controls the next phase after acknowledgment.

## Example dialogue

> **Dev:** "Should every browser subscribe to every **Private Role**?"
> **Domain expert:** "No, each device reads only its own role; the Acting Host uses protected team data for aggregation."
