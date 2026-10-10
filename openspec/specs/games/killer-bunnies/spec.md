# games/killer-bunnies Specification

## Purpose
Defines Killer Bunnies for two to eight players, where each player protects a Bunny Circle and races for the Magic Carrot.

## Requirements

### Requirement: Server-held hidden state
Hands and the unrevealed Magic Carrot SHALL be held on the server and shown to a seat only through its token.

#### Scenario: Magic Carrot hidden
- **WHEN** a player views the table before the carrot is revealed
- **THEN** the winning carrot's identity is not in the payload

### Requirement: Card catalog
The base game SHALL combine the Blue starter and Yellow booster main decks, carrot market and Magic Carrots.

#### Scenario: Base deck
- **WHEN** a base game starts
- **THEN** the main deck contains the Blue and Yellow starter content

### Requirement: Player range
A room SHALL require two to eight players.

#### Scenario: Nine players
- **WHEN** a ninth player tries to join
- **THEN** the join is rejected
