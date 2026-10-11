# games/seven-up Specification

## Purpose
Defines 7-Up's sequential suit-card play for three to seven players with private hands, a room whose host adds computer players in the lobby, and people joining by code.

## Requirements

### Requirement: Player range and names
A 7-Up game SHALL require three to seven players, each with a distinct name.

#### Scenario: Two players
- **WHEN** a game is started with two players
- **THEN** it is rejected

#### Scenario: Duplicate names
- **WHEN** two players share a name
- **THEN** the game is not dealt

### Requirement: Dealing
The whole 52-card deck SHALL be dealt one card at a time, starting with the dealer's left-hand neighbor, who also takes the first turn.

#### Scenario: First card
- **WHEN** a hand is dealt
- **THEN** the first card goes to the dealer's left-hand neighbor

### Requirement: Legal plays
The first card in a suit SHALL be its 7, and every later card SHALL be the rank one below the lowest or one above the highest card already played in that suit.

#### Scenario: Opening a suit
- **WHEN** no heart has been played
- **THEN** only the 7 of hearts is a legal heart

### Requirement: Passing and winning
A player with no legal card SHALL pass, a player with a legal card MUST play one, and the first player to empty their hand SHALL win.

#### Scenario: Forced play
- **WHEN** a player holds a legal card and tries to pass
- **THEN** the pass is rejected

### Requirement: Private hands
A player's hand SHALL be visible only to that player, and a card SHALL become public only when played.

#### Scenario: Opponent view
- **WHEN** a player views the table
- **THEN** other players' hands show only card counts

### Requirement: Host-managed seats
A 7-Up room SHALL be created by a host who takes the first seat, other players SHALL join by room code into the next open seat, and the host SHALL add and remove computer players in the lobby until the room has three to seven seats.

#### Scenario: Computers added in the lobby
- **WHEN** the host adds two computers to a room holding the host and one guest
- **THEN** the room has four seats and can be started

#### Scenario: No pre-configured seats
- **WHEN** a player creates a 7-Up room
- **THEN** the room has one seat, the host's, and no seat types are chosen at creation

### Requirement: Room start
The host SHALL start a 7-Up room only when it has three to seven seats, and the first hand SHALL be dealt at that moment.

#### Scenario: Two seats
- **WHEN** the host tries to start with two seats
- **THEN** the start is rejected and the lobby says 7-Up needs at least three players
