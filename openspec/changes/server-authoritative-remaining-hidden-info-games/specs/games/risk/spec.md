# Spec Delta

## ADDED Requirements

### Requirement: Risk hidden information
Risk SHALL be played with its rules on the server, and each seat's view SHALL show its own territory cards, other seats' card counts, the full map and the card deck as a count.

#### Scenario: Opponent cards
- **WHEN** a seat reads a started game
- **THEN** other seats' cards are empty with a count and the deck is a count

### Requirement: Moves only from the seat to act
Reinforcing, attacking, moving in after a conquest, fortifying, trading cards and ending a phase SHALL be accepted only from the seat whose turn it is, and trading cards only for cards that seat holds.

#### Scenario: Another seat's move
- **WHEN** a seat that does not hold the turn attacks
- **THEN** the action is rejected and the board is unchanged

### Requirement: Server-side lobby
Creating a Risk room, joining it, adding or removing computer commanders and starting the game SHALL happen on the server, and the game SHALL start only with two to six commanders.

#### Scenario: One commander
- **WHEN** the host starts with one commander
- **THEN** the start is rejected

### Requirement: Dice rolled on the server
Battle dice SHALL be rolled on the server.

#### Scenario: Battle
- **WHEN** a seat attacks
- **THEN** the dice results come from the server's roll and cannot be supplied by the client
