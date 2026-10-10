# Spec Delta

## ADDED Requirements

### Requirement: Server-chosen spin
The spinner result SHALL be chosen by the server when a seat spins, and a spin request SHALL NOT be able to supply the number.

#### Scenario: Forced result
- **WHEN** a seat sends a spin request that includes a number
- **THEN** the number is ignored and the server's own spin is applied

### Requirement: Life hidden information
Life SHALL be played with its rules on the server, and each seat's view SHALL show its own LIFE tile values, other seats' LIFE tile counts, the LIFE tile pool and millionaire bonus as counts, and career cards on offer only to the seat choosing among them.

#### Scenario: Opponent tiles
- **WHEN** a seat reads a started game
- **THEN** other seats' LIFE tiles are empty with a count and the tile pool is a count

#### Scenario: Another seat's career offer
- **WHEN** a seat is choosing a career and another seat reads the room
- **THEN** the other seat sees that a choice is pending but not the options

### Requirement: Tiles revealed when the game ends
When the game finishes, every seat's LIFE tiles and the millionaire bonus SHALL be visible to every seat so final net worth can be shown.

#### Scenario: Final scoring
- **WHEN** the game is finished
- **THEN** each seat's view lists every player's LIFE tiles
