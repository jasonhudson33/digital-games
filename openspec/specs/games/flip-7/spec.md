# games/flip-7 Specification

## Purpose
Defines Flip 7, a push-your-luck card game for two to ten players first to 200 points.

## Requirements

### Requirement: Player range
A room SHALL require two to ten players to start.

#### Scenario: One player
- **WHEN** the host starts with one player
- **THEN** the start is rejected

### Requirement: Duplicate bust
A player who flips a number they already hold SHALL bust and score nothing for the round, unless they hold a Second Chance, which SHALL be discarded along with the duplicate instead.

#### Scenario: Duplicate
- **WHEN** a player holding a 5 and no Second Chance flips another 5
- **THEN** the player is busted

#### Scenario: Second Chance
- **WHEN** a player holding a 5 and a Second Chance flips another 5
- **THEN** both the Second Chance and the duplicate are discarded and the player stays in

### Requirement: Round score
A player's round score SHALL be their number total (doubled by a x2 modifier) plus plus-modifiers, and the round ends when every player has stayed or busted or a player holds seven unique numbers.

#### Scenario: Double
- **WHEN** a player with numbers totalling 20 holds x2 and a +4
- **THEN** their round score is 44

### Requirement: Flip 7 bonus
A player who collects seven unique number cards SHALL end the round immediately and receive a 15-point bonus.

#### Scenario: Seventh unique
- **WHEN** a player's seventh unique number is flipped
- **THEN** the round ends at once and that player scores 15 extra

### Requirement: Winning
The game SHALL end when the highest score is at least 200 and held by exactly one player; a tie at the top SHALL force another round.

#### Scenario: Tie above target
- **WHEN** two players tie at 210
- **THEN** another round is played

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
