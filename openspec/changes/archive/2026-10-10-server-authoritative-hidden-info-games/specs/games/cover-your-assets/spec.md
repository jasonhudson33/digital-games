# Spec Delta

## ADDED Requirements

### Requirement: Cover Your Assets hidden information
Cover Your Assets SHALL be played with its rules on the server, and each seat's view SHALL show its own hand, other seats' hand sizes, every player's visible stack, the top of the discard pile and the draw pile size.

#### Scenario: Opponent hand
- **WHEN** a seat reads a started game
- **THEN** other seats' hands are empty with a card count

### Requirement: Challenges decided from real hands
A challenge card SHALL be accepted only if the challenged and challenging players actually hold it.

#### Scenario: Card not held
- **WHEN** a seat plays a challenge card it does not hold
- **THEN** the action is rejected
