# Spec Delta

## ADDED Requirements

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
