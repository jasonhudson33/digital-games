# Spec Delta

## ADDED Requirements

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
