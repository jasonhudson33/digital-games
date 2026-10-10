# Spec Delta

## ADDED Requirements

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
