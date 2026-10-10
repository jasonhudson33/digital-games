# Spec Delta

## Purpose

Closes the gap that lets anyone holding a room code read hidden information and overwrite the board in client-authoritative rooms, without redesigning those games' rules.

## ADDED Requirements

### Requirement: Lobby open, started game gated
A client-authoritative room SHALL be readable by anyone holding the code while in the lobby, and once the game has left the lobby GET and PUT SHALL be rejected with 401 or 403 unless the request carries the token of a seat in that room.

#### Scenario: Code only, game started
- **WHEN** a request presents a valid room code but no seat token for a started game
- **THEN** it is rejected and no state is returned

#### Scenario: Seat token
- **WHEN** a seated player's request carries their token
- **THEN** the request is accepted

### Requirement: Tokens issued at create and join
Creating a room and joining a lobby SHALL each return a secret token for that seat, only a hash of which is stored, and no response SHALL include the stored hashes.

#### Scenario: Join
- **WHEN** a visitor adds one human player to a lobby
- **THEN** the response includes a token for that player and the join is saved

#### Scenario: Computer added without a token
- **WHEN** a tokenless request adds a computer player to a lobby
- **THEN** it is rejected

### Requirement: Roster protected
A seated player's write SHALL NOT remove another human player from the room.

#### Scenario: Removing another player
- **WHEN** a seated guest sends a state without the host
- **THEN** the write is rejected with 403

### Requirement: Legacy rooms
Rooms created before this requirement SHALL continue to load and accept writes without a token until they expire, and SHALL NOT be upgraded in place.

#### Scenario: Pre-existing room
- **WHEN** a room created before the change is requested within its 24-hour life
- **THEN** it loads without a seat token

### Requirement: Rooms outside the gate
Catan and Monopoly rooms, which use their own browser-side Supabase storage, SHALL remain outside seat-token gating until a separate change covers them.

#### Scenario: Catan room
- **WHEN** a Catan room is read without a token
- **THEN** it is returned as before
