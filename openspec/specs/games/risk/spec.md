# games/risk Specification

## Purpose
Defines Risk for two to six human or computer commanders in shared rooms on a 42-territory world map.

## Requirements

### Requirement: Commanders
A game SHALL require two to six commanders, human or computer, in a shared room.

#### Scenario: One commander
- **WHEN** the host starts with one commander
- **THEN** the start is rejected ("Risk requires 2–6 commanders")

### Requirement: Mandatory card trade
A player holding a forced hand of cards SHALL trade a set before reinforcing.

#### Scenario: Forced trade
- **WHEN** a player must trade cards
- **THEN** reinforcement placement is blocked until they do

### Requirement: Conquest
A player SHALL win by owning every territory.

#### Scenario: Last territory
- **WHEN** the last enemy territory is captured
- **THEN** the game records that player as winner
