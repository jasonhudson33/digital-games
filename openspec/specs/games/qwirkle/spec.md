# games/qwirkle Specification

## Purpose
Defines Qwirkle for two to four players on a shared unbounded grid with private racks.

## Requirements

### Requirement: Lines
A line SHALL contain either one color with distinct shapes or one shape with distinct colors, and SHALL NOT exceed six tiles.

#### Scenario: Seventh tile
- **WHEN** a placement makes a seven-tile line
- **THEN** it is rejected

### Requirement: Revalidation
The complete staged move SHALL be validated again before entering shared room state.

#### Scenario: Illegal staged move
- **WHEN** a client submits an illegal multi-tile move
- **THEN** it is rejected and the board is unchanged

### Requirement: Scoring bonuses
Completing a six-tile line (a Qwirkle) SHALL award a 6-point bonus on top of the line's points.

#### Scenario: One Qwirkle
- **WHEN** a move completes one six-tile line
- **THEN** 6 bonus points are added

### Requirement: Racks and end
Each rack SHALL hold six tiles, and the game SHALL end when the bag is empty and a player empties their rack, who SHALL receive a 6-point bonus.

#### Scenario: Empty rack
- **WHEN** the bag is empty and a player plays their last tile
- **THEN** that player receives 6 points and the game ends

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
