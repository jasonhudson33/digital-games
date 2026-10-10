# games/stratego Specification

## Purpose
Defines Stratego for two players, with hidden armies on a 10×10 board.

## Requirements

### Requirement: Army and board
Each army SHALL have 40 pieces by the standard distribution, and eight lake squares SHALL be impassable.

#### Scenario: Lake move
- **WHEN** a piece is moved onto a lake square
- **THEN** the move is rejected

### Requirement: Immobile pieces
Bombs and the Flag SHALL NOT move.

#### Scenario: Move a bomb
- **WHEN** a player selects a bomb to move
- **THEN** no moves are offered

### Requirement: Flag capture
Capturing the opposing Flag SHALL win the game.

#### Scenario: Flag taken
- **WHEN** a piece attacks and captures the Flag
- **THEN** that player wins

### Requirement: Combat
A lower rank number SHALL defeat a higher one, equal ranks SHALL both be removed, only a Miner SHALL defuse a Bomb, and a Spy SHALL defeat the Marshal only when the Spy attacks.

#### Scenario: Spy defends
- **WHEN** the Marshal attacks the Spy
- **THEN** the Spy is removed

### Requirement: Movement
A piece SHALL move one square orthogonally, a Scout SHALL move any distance in a straight open line, and no piece SHALL cross a lake or land on its own piece.

#### Scenario: Scout run
- **WHEN** a Scout has an open row ahead
- **THEN** it may move any number of squares along it

### Requirement: No legal move
A player with no legal move on their turn SHALL lose.

#### Scenario: Boxed in
- **WHEN** a player has only bombs and the Flag left to move
- **THEN** the opponent wins

### Requirement: Hidden pieces
An opponent's piece rank SHALL be hidden from a player until combat reveals it.

#### Scenario: Unrevealed piece
- **WHEN** a player views the board
- **THEN** opposing pieces show no rank

### Requirement: Stratego hidden army
Stratego SHALL be played with its rules on the server, and each seat's view SHALL show its own pieces in full and the opponent's pieces only as unknown pieces, except for pieces a battle has revealed.

#### Scenario: Opposing piece
- **WHEN** a seat reads a started game
- **THEN** each opposing piece appears with an owner and position but no rank

### Requirement: Secret deployment
During setup a seat's view SHALL NOT include where the opponent placed pieces, only whether the opponent is ready.

#### Scenario: Opponent still deploying
- **WHEN** one player has placed pieces and the other reads the room before play starts
- **THEN** the other view shows no positions for those pieces

### Requirement: Moves and battles decided on the server
Every move and battle result SHALL be computed on the server from the real board.

#### Scenario: Battle
- **WHEN** a piece attacks an opposing piece
- **THEN** the result follows the combat rules and reveals only what the battle reveals
