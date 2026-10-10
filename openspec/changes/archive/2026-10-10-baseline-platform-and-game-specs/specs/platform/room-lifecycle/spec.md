# Spec Delta

## Purpose

Defines how shared rooms are created, joined, populated with computer players, stored and expired, independent of any one game's rules.

## ADDED Requirements

### Requirement: Room codes
Each room SHALL be identified by a five-character code, and lookups SHALL be case-insensitive and ignore surrounding whitespace.

#### Scenario: Lowercase code
- **WHEN** a player enters `ab3xk` for a room created as `AB3XK`
- **THEN** the room is found

#### Scenario: Unknown code
- **WHEN** a player enters a code with no room
- **THEN** the player sees a not-found message and no room is created

### Requirement: Room expiry
A room SHALL expire 24 hours after its last update, and expired rooms SHALL NOT be returned.

#### Scenario: Stale room
- **WHEN** a room has not been updated for more than 24 hours
- **THEN** loading it reports that it does not exist

### Requirement: Storage fallback
Deployed rooms SHALL persist in Supabase using server-only credentials, and local development without those credentials SHALL fall back to in-memory storage only.

#### Scenario: Missing credentials in production
- **WHEN** a deployed server-authoritative room is requested and the server credentials are absent
- **THEN** the request fails with a message naming the missing configuration instead of silently using memory

### Requirement: Computer seats
The host SHALL be able to add and remove computer players in the lobby within the game's player range, and the game SHALL NOT start outside that range.

#### Scenario: Below minimum
- **WHEN** the host starts a 7-Up room with two seats
- **THEN** the start is rejected because 7-Up needs at least three players

### Requirement: Host drives computers
Only the room host's client SHALL advance computer players' turns, so two clients never race the same computer move.

#### Scenario: Non-host client
- **WHEN** a non-host client observes a computer's turn
- **THEN** it does not submit a move for that computer

### Requirement: Stale-write rejection
A write made against an out-of-date room version SHALL be rejected with a conflict response, and the client SHALL reload and retry.

#### Scenario: Racing moves
- **WHEN** two players submit moves from the same room version
- **THEN** the first is saved and the second receives a 409 conflict
