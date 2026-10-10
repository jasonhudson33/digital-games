# games/dominion Specification

## Purpose
Defines Dominion's deck-building kingdom game for up to six players.

## Requirements

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

### Requirement: Dominion hidden information
Dominion SHALL be played with its rules on the server, and each seat's view SHALL show its own hand, other seats' hand sizes, every player's cards in play and discard pile, the supply, and every draw pile as a count only.

#### Scenario: Opponent hand
- **WHEN** a seat reads a started game
- **THEN** other seats' hands are empty with a card count and no draw pile contents are sent

### Requirement: Own draw pile hidden too
A seat SHALL NOT receive the contents or order of its own draw pile.

#### Scenario: Own deck
- **WHEN** a seat reads a started game
- **THEN** its own draw pile is a count

### Requirement: Plays and buys checked against the real hand
An action play, a buy and every pending choice (Cellar, Remodel, Mine, Militia) SHALL be validated on the server against the acting seat's real hand, coins and buys.

#### Scenario: Card not in hand
- **WHEN** a seat plays an action from a hand index it does not have
- **THEN** the action is rejected
