# games/sequence Specification

## Purpose
Defines Sequence for tables of 2, 3, 4, 6, 8, 9, 10 or 12 players, individually or in two or three teams.

## Requirements

### Requirement: Table sizes
A game SHALL start only with 2, 3, 4, 6, 8, 9, 10 or 12 players, with teams dividing evenly and teammates seated alternately, and starting hands SHALL be 7, 6, 6, 5, 4, 4, 3 and 3 cards respectively.

#### Scenario: Five players
- **WHEN** the host starts with five players
- **THEN** the start is rejected

### Requirement: Jacks
A two-eyed Jack SHALL place a chip on any open non-corner space and a one-eyed Jack SHALL remove an opponent chip not in a completed sequence.

#### Scenario: Protected chip
- **WHEN** a one-eyed Jack targets a chip in a completed sequence
- **THEN** the play is illegal

### Requirement: Dead cards
A dead card SHALL be exchangeable once at the start of a turn when both matching board spaces are occupied.

#### Scenario: Second exchange
- **WHEN** a player already exchanged this turn
- **THEN** a second exchange is rejected

### Requirement: Winning
With two players or teams two sequences SHALL win, with three one sequence SHALL win, and a second sequence MAY share one space with the first.

#### Scenario: Overlap
- **WHEN** a second line shares exactly one space with the first
- **THEN** both count

### Requirement: Sequence hidden information
Sequence SHALL be played with its rules on the server, and each seat's view SHALL show its own hand, other seats' hand sizes, the board with every chip and the draw pile size.

#### Scenario: Opponent hand
- **WHEN** a seat reads a started game
- **THEN** other seats' hands are empty with a card count

### Requirement: Plays checked against the real hand
A card play or dead-card exchange SHALL be accepted only for a card the acting seat holds.

#### Scenario: Card not held
- **WHEN** a seat plays a card it does not hold
- **THEN** the action is rejected
