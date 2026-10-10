# Spec Delta

## Purpose

Defines Catan's selectable rulesets, turn structure and victory target for two to six players in online rooms with computer players.

## ADDED Requirements

### Requirement: Rulesets and victory target
The host SHALL choose Original (10 victory points), Seafarers (14), Cities & Knights (13) or both expansions (16), and the game SHALL end when a player reaches that target.

#### Scenario: Seafarers target
- **WHEN** a Seafarers game is created
- **THEN** victory requires 14 points

### Requirement: Pending choices block progression
A turn SHALL NOT end while a required discard, robber placement, progress-card or expansion decision is pending.

#### Scenario: Robber unresolved
- **WHEN** a 7 is rolled and the robber has not been placed
- **THEN** the player cannot end the turn

### Requirement: Paired turn
With five or six players (rooms admit two to six) the game SHALL give a paired turn limited to building and bank trading, and a paired turn SHALL NOT roll dice or play development cards.

#### Scenario: Development card on paired turn
- **WHEN** a player attempts to play a development card on their paired turn
- **THEN** the action is rejected
