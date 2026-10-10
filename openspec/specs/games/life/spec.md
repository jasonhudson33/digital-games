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

### Requirement: Server-chosen spin
The spinner result SHALL be chosen by the server when a seat spins, and a spin request SHALL NOT be able to supply the number.

#### Scenario: Forced result
- **WHEN** a seat sends a spin request that includes a number
- **THEN** the number is ignored and the server's own spin is applied

### Requirement: Life hidden information
Life SHALL be played with its rules on the server, and each seat's view SHALL show its own LIFE tile values, other seats' LIFE tile counts, the LIFE tile pool and millionaire bonus as counts, and career cards on offer only to the seat choosing among them.

#### Scenario: Opponent tiles
- **WHEN** a seat reads a started game
- **THEN** other seats' LIFE tiles are empty with a count and the tile pool is a count

#### Scenario: Another seat's career offer
- **WHEN** a seat is choosing a career and another seat reads the room
- **THEN** the other seat sees that a choice is pending but not the options

### Requirement: Tiles revealed when the game ends
When the game finishes, every seat's LIFE tiles and the millionaire bonus SHALL be visible to every seat so final net worth can be shown.

#### Scenario: Final scoring
- **WHEN** the game is finished
- **THEN** each seat's view lists every player's LIFE tiles
