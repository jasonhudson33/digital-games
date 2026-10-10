# Spec Delta

## ADDED Requirements

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
