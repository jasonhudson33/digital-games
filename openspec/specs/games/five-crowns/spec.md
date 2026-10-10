# games/five-crowns Specification

## Purpose
Defines Five Crowns for two to seven players across eleven rounds, lowest total winning.

## Requirements

### Requirement: Deck and rounds
The game SHALL use two decks of five suits (stars, hearts, clubs, spades, diamonds) with ranks 3 through 13, plus six jokers, and SHALL run eleven rounds in which round one deals three cards and round eleven deals thirteen.

#### Scenario: Last round
- **WHEN** round 11 ends
- **THEN** the game finishes

### Requirement: Wild cards
Jokers SHALL always be wild, and the rank equal to the round's hand size (Jacks in round 9, Queens in 10, Kings in 11) SHALL also be wild.

#### Scenario: Round five
- **WHEN** round 5 is dealt with five-card hands
- **THEN** jokers and fives are wild

### Requirement: Turn structure
A player SHALL draw from the deck or take the top discard before discarding, and SHALL NOT discard before drawing.

#### Scenario: Discard without draw
- **WHEN** a player discards before drawing
- **THEN** the action is rejected

### Requirement: Going out
A player SHALL go out only when every card in their hand forms valid melds, after which every other player SHALL take exactly one final turn before the round is scored.

#### Scenario: Final turns
- **WHEN** a player goes out
- **THEN** each other player gets one more turn and the goer scores zero

### Requirement: Scoring
Cards left unmelded SHALL score their rank, 20 for the wild rank and 50 for a joker, and the lowest total after round 11 SHALL win.

#### Scenario: Joker left in hand
- **WHEN** a player holds an unmelded joker at round end
- **THEN** it adds 50 points

### Requirement: Five Crowns hidden information
Five Crowns SHALL be played with its rules on the server, and each seat's view SHALL show its own hand, other seats' hand sizes, the top discard, laid-down melds and the draw pile size.

#### Scenario: Opponent hand
- **WHEN** a seat reads a started game
- **THEN** other seats' hands are empty with a card count

### Requirement: Going out checked on the real hand
Going out SHALL be accepted only if the acting seat's real hand is fully meldable.

#### Scenario: Unmeldable hand
- **WHEN** a seat asks to go out with a hand that cannot be fully melded
- **THEN** the action is rejected
