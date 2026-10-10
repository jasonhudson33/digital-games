# Spec Delta

## Purpose

Defines Dominion's deck-building kingdom game for up to six players.

## ADDED Requirements

### Requirement: Player range
A game SHALL require two to six players.

#### Scenario: Seven players
- **WHEN** a seventh player tries to join
- **THEN** the join is rejected

### Requirement: Supply sizing
Estates and Duchies SHALL number 8 each at two players and 12 each at three or more, and Provinces SHALL number 8 at two players, 12 at three or four, 15 at five and 18 at six.

#### Scenario: Four players
- **WHEN** a four-player game starts
- **THEN** the Province pile holds 12

### Requirement: Game end
The game SHALL end at the end of a turn when the Province pile is empty or when three supply piles are empty (four piles with five or six players).

#### Scenario: Three empty piles
- **WHEN** a three-player game has three empty supply piles at turn end
- **THEN** the game finishes and scores are computed

### Requirement: Turn cleanup
At the end of a turn the player SHALL discard their hand and cards in play and draw five.

#### Scenario: Cleanup
- **WHEN** a player ends their turn
- **THEN** their hand and in-play cards go to the discard pile and they draw five

### Requirement: Victory and ties
Each player's score SHALL be the sum of victory values (Estate 1, Duchy 3, Province 6, Curse −1) and ties SHALL be broken by fewer turns taken, with remaining ties sharing the win.

#### Scenario: Tie on turns
- **WHEN** two players tie on points and turns
- **THEN** both are declared winners
