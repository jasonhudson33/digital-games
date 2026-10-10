# Spec Delta

## Purpose

Defines Viticulture for two to six players, a seasonal worker-placement race to 20 victory points.

## ADDED Requirements

### Requirement: Seasons
Each year SHALL begin in spring and proceed through summer and winter, which each have their own six action spaces, summer visitors SHALL be yellow and played in summer, and winter visitors SHALL be blue and played in winter.

#### Scenario: Winter visitor
- **WHEN** a player takes the winter visitor action
- **THEN** a winter visitor is played, not a summer one

### Requirement: Cellars
A medium cellar SHALL allow wine up to value 6 including rosé and a large cellar up to 9 including sparkling.

#### Scenario: Value 7 wine
- **WHEN** a player has only a medium cellar
- **THEN** value 7 wine cannot be made

### Requirement: Game end
The game SHALL end when a player has 20 or more victory points at the end of a year, and the highest score SHALL win, sharing on ties.

#### Scenario: Reach 20
- **WHEN** a player reaches 20 VP
- **THEN** the game finishes and final standings are ranked
