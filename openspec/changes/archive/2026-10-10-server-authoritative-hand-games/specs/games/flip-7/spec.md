# Spec Delta

## ADDED Requirements

### Requirement: Flip 7 hidden draw pile
Flip 7 SHALL be played with its rules on the server, and each seat's view SHALL show the cards on every table, scores and the draw pile count, but not the draw pile's order or contents.

#### Scenario: Draw pile
- **WHEN** a seat reads a started Flip 7 room
- **THEN** the view has a draw pile count and no draw pile cards

### Requirement: Risk estimate from the server
The bust-risk estimate for a seat SHALL be computed on the server from the unseen cards and included in that seat's view.

#### Scenario: Estimate present
- **WHEN** a seat that is still active reads the room
- **THEN** the view includes its bust-risk percentage

### Requirement: Shuffles and flips decided on the server
Every card flip SHALL be drawn on the server, so a client cannot choose or retry a flip.

#### Scenario: Repeat flip
- **WHEN** a seat posts a flip that the engine already resolved
- **THEN** it is rejected as out of turn
