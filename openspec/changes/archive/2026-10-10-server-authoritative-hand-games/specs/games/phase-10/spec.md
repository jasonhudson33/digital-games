# Spec Delta

## ADDED Requirements

### Requirement: Phase 10 hidden information
Phase 10 SHALL be played with its rules on the server, and each seat's view SHALL show only its own hand, other seats' card counts, laid phases, the top discard and the draw pile count.

#### Scenario: Opponent hand
- **WHEN** seat A reads a started Phase 10 room
- **THEN** every other seat's hand is empty with a card count

### Requirement: Server-validated phases and hits
Laying a phase and hitting a laid group SHALL be validated on the server against the acting seat's real hand.

#### Scenario: Card not held
- **WHEN** a seat lays a phase using a card it does not hold
- **THEN** the action is rejected
