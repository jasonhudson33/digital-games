# Spec Delta

## ADDED Requirements

### Requirement: Joining a game in progress
A person SHALL be able to join a Scum room whose game has started, as long as seated and waiting players together stay within twenty. They SHALL wait until the next round is dealt. Computer players SHALL NOT be added once the game has started.

#### Scenario: Late arrival
- **WHEN** someone joins with the room code during round 3
- **THEN** they are accepted as a waiting player and are not dealt into round 3

#### Scenario: Table full
- **WHEN** nineteen players are seated, one is waiting, and someone else tries to join
- **THEN** the join is rejected because the room is full

#### Scenario: Computer mid-game
- **WHEN** the host tries to add a computer after the game has started
- **THEN** the request is rejected

### Requirement: Waiting view
A waiting player SHALL see the room code, the round in progress, the seated players, and that they will be dealt in next round as Scum, but no cards. They SHALL be able to leave the waiting list. Seated players SHALL see who will join next round.

#### Scenario: Waiting screen
- **WHEN** a waiting player opens the room
- **THEN** they see the waiting screen and no player's hand

#### Scenario: Leaving the waiting list
- **WHEN** a waiting player leaves before the next deal
- **THEN** they are removed and are not dealt in

#### Scenario: Seated players are told
- **WHEN** a player is waiting
- **THEN** seated players see that player listed as joining next round

### Requirement: Newcomers start as Scum
When the next round is dealt, waiting players SHALL be added below every seated player in the previous finish order, with the latest joiner lowest. The deck count SHALL be recalculated for the new table size, and titles, turn order and class trades SHALL follow the extended order.

#### Scenario: One newcomer
- **WHEN** four players finish a round and one player is waiting
- **THEN** the next round deals five hands with two decks, the newcomer is Scum and plays last, and the previous Scum becomes Vice Scum

#### Scenario: Newcomer trades with the President
- **WHEN** the next round has at least one trade group and a newcomer
- **THEN** the newcomer is the lower side of the President's trade
