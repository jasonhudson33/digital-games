# games/scum Specification

## Purpose
Defines Scum, a ranked shedding game for three to twenty players with class trades between rounds.

## Requirements

### Requirement: Deck and rank
The game SHALL use one deck per four players (rounded up) with jokers, and 2 SHALL be lowest and jokers highest.

#### Scenario: Nine players
- **WHEN** nine players start
- **THEN** three decks are used

#### Scenario: Twenty players
- **WHEN** twenty players start
- **THEN** five decks are used

### Requirement: Classes
Finishing order SHALL assign classes: first is President, last is Scum, and with four or more players second is Vice President and second-to-last is Vice Scum; the rest are Citizens.

#### Scenario: First out
- **WHEN** a player empties their hand first
- **THEN** they become President next round

### Requirement: Pile control
A play SHALL match the pile's card count and beat its rank, otherwise the player passes.

#### Scenario: Weaker pair
- **WHEN** the pile is a pair of Kings and a player plays a pair of Fives
- **THEN** the play is illegal

### Requirement: Class trades
The next round SHALL NOT start until every required trade between paired upper and lower classes is submitted, and trades SHALL resolve together.

#### Scenario: Pending trade
- **WHEN** one trade is outstanding
- **THEN** the round does not begin

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
