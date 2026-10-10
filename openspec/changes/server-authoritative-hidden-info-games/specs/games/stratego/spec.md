# Spec Delta

## ADDED Requirements

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
