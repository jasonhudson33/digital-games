# games/life Specification

## Purpose
Defines Life, a board game of careers, houses and family spaces for two to six players, ending with the richest player winning.

## Requirements

### Requirement: Stop spaces
The game SHALL force a stop on job, marriage, house, career-change and retire spaces.

#### Scenario: Passing a marriage space
- **WHEN** a player's move would pass an unvisited marriage space
- **THEN** the piece stops there

### Requirement: Family spaces
A baby space SHALL add one child and a twins space SHALL add two, each awarding a life tile.

#### Scenario: Twins
- **WHEN** a player lands on twins
- **THEN** they gain two children and a life tile

### Requirement: Player range
A game SHALL require two to six players.

#### Scenario: One player
- **WHEN** the host starts with one player
- **THEN** the start is rejected

### Requirement: Retirement
A player reaching retirement SHALL retire to Millionaire Estates or Countryside Acres, and the game SHALL end when every player has retired.

#### Scenario: Last retiree
- **WHEN** the final player retires
- **THEN** the game finishes and final totals are computed

### Requirement: Millionaire bonus
The richest Millionaire Estates retiree (cash plus house value) SHALL receive the millionaire bonus tiles, split among tied richest retirees.

#### Scenario: Two tied millionaires
- **WHEN** two Millionaire Estates retirees tie for richest
- **THEN** the bonus tiles are shared between them

### Requirement: Winner
The winner SHALL be the player with the highest net worth, and tied players SHALL share the win.

#### Scenario: Tie
- **WHEN** two players have equal net worth
- **THEN** both are declared winners
