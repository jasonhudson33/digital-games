# Spec Delta

## Purpose

Defines Phase 10 for two to six players racing through ten phases with the lowest score.

## ADDED Requirements

### Requirement: Individual phases
Each player SHALL attempt their own current phase, and completing it SHALL advance only that player after the round.

#### Scenario: One player completes
- **WHEN** one player completes phase 3 and others do not
- **THEN** only that player moves to phase 4

### Requirement: Hitting
A player SHALL be able to hit any laid phase only after laying their own phase in the same round.

#### Scenario: Hit before laying
- **WHEN** a player who has not laid down tries to hit
- **THEN** the action is rejected

### Requirement: Hand scoring
Only cards left in hand SHALL score: 1–9 are 5, 10–12 are 10, Skip is 15 and Wild is 25.

#### Scenario: Leftover Wild
- **WHEN** a player holds a Wild at round end
- **THEN** it adds 25 points
