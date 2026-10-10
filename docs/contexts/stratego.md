# Stratego

Stratego owns the 10×10 board, hidden armies, combat and no-legal-move loss for two players.

## Language

**Army**: 40 pieces from Marshal (1) to Scout (9), Spy, six Bombs and the Flag.

**Lake**: Eight impassable squares.

## Relationships

- Bombs and the Flag never move; a Scout moves any distance in a straight open line.
- A lower rank wins, equal ranks both fall, only a Miner defuses a Bomb, and a Spy beats the Marshal only when attacking.
- Capturing the Flag wins; a player with no legal move loses.
- Opposing ranks stay hidden until combat reveals them.

## Example dialogue

> **Dev:** "The Marshal attacks the Spy?"
> **Domain expert:** "The Marshal wins; the Spy only wins by attacking."
