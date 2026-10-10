# Spec Delta

## ADDED Requirements

### Requirement: Qwirkle hidden information
Qwirkle SHALL be played with its rules on the server, and each seat's view SHALL show its own rack, other seats' rack sizes, the full board and the tile bag size.

#### Scenario: Opponent rack
- **WHEN** a seat reads a started game
- **THEN** other seats' racks are empty with a tile count and the bag is a count

### Requirement: Moves validated against the real rack
A tile move or exchange SHALL be accepted only with tiles the acting seat holds, and a move SHALL be validated and scored on the server.

#### Scenario: Tile not held
- **WHEN** a seat places a tile it does not hold
- **THEN** the move is rejected
