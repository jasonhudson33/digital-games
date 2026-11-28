# Spec Delta

## ADDED Requirements

### Requirement: Player range
A Scum room SHALL seat from three to twenty players, counting both people and computer seats, and SHALL reject joins or added computers beyond twenty.

#### Scenario: Twenty-first seat
- **WHEN** a room already has twenty players and someone tries to join or the host adds a computer
- **THEN** the request is rejected because the room is full

#### Scenario: Two players
- **WHEN** the host tries to start with two players
- **THEN** the start is rejected

### Requirement: Trade group limit
The host SHALL be able to choose from zero to four trade groups, and never more than half the table rounded down. Players outside the trade groups SHALL NOT trade and SHALL play the next round as Citizens.

#### Scenario: Large table
- **WHEN** twenty players finish a round with four trade groups
- **THEN** places 1-4 trade 4, 3, 2 and 1 cards with places 20, 19, 18 and 17 respectively, and places 5-16 do not trade

#### Scenario: Request above the limit
- **WHEN** the host of a ten-player room asks for five trade groups
- **THEN** the room uses four trade groups

#### Scenario: Small table
- **WHEN** a six-player room is configured
- **THEN** at most three trade groups are offered

## MODIFIED Requirements

### Requirement: Deck and rank
The game SHALL use one deck per four players (rounded up) with jokers, and 2 SHALL be lowest and jokers highest.

#### Scenario: Nine players
- **WHEN** nine players start
- **THEN** three decks are used

#### Scenario: Twenty players
- **WHEN** twenty players start
- **THEN** five decks are used
