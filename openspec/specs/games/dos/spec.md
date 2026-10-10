# games/dos Specification

## Purpose
Defines DOS, the 2018 center-row matching game, for two to four players first to 200 points.

## Requirements

### Requirement: Deck
The deck SHALL contain 108 cards: 88 numbers, 8 colored Wild # cards and 12 Wild DOS cards.

#### Scenario: New round
- **WHEN** a round is dealt
- **THEN** the full 108-card deck is in play

### Requirement: Matching
A player SHALL match a center card with one card of the same number or two cards whose values add to it, each center card at most once per turn.

#### Scenario: Double match
- **WHEN** a player plays a 3 and a 4 on a center 7
- **THEN** the match is accepted

### Requirement: Color bonuses
A single color match SHALL earn one center-row placement, and a double color match SHALL also make every opponent draw one.

#### Scenario: Double color
- **WHEN** a double match shares the center card's color
- **THEN** each opponent draws a card

### Requirement: DOS call
A player left with exactly two cards SHALL call DOS, and a caught missed call SHALL cost two cards.

#### Scenario: Missed call
- **WHEN** a player has two cards and is caught without calling
- **THEN** they draw two cards

### Requirement: Scoring
The round winner SHALL score opponents' cards at face value, 20 for Wild DOS and 40 for Wild #, and the first to 200 SHALL win.

#### Scenario: Wild # left in hand
- **WHEN** an opponent holds a Wild # at round end
- **THEN** it adds 40 to the winner's score

### Requirement: DOS hidden information
DOS SHALL be played with its rules on the server, and each seat's view SHALL show only its own hand, other seats' card counts, the center row, the top discard and the draw pile count.

#### Scenario: Opponent hand
- **WHEN** seat A reads a started DOS room
- **THEN** every other seat's hand is empty with a card count

### Requirement: DOS call enforcement
DOS call, catch and missed-call penalties SHALL be decided on the server from the real hands.

#### Scenario: Catch without two cards
- **WHEN** a seat posts a catch for a player who does not hold exactly two cards
- **THEN** the catch is rejected
