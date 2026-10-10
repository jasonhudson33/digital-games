# Spec Delta

## ADDED Requirements

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
