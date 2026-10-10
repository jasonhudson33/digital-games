# games/scum Specification

## Purpose
Defines Scum, a ranked shedding game for three to ten players with class trades between rounds.

## Requirements

### Requirement: Deck and rank
The game SHALL use one deck per four players (rounded up) with jokers, and 2 SHALL be lowest and jokers highest.

#### Scenario: Nine players
- **WHEN** nine players start
- **THEN** three decks are used

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
