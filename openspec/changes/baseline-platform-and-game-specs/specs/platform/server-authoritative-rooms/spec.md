# Spec Delta

## Purpose

Defines the room model for games with private information (7-Up, Hand and Foot, Killer Bunnies, Pinochle, Scum, Secret Hitler, Skull King), where the server holds the whole game and each seat sees only its own view.

## ADDED Requirements

### Requirement: Seat tokens
Joining or creating a room SHALL issue the player a secret seat token, and every later request for that seat SHALL present it.

#### Scenario: Missing token
- **WHEN** a request for a room action carries no valid seat token
- **THEN** it is rejected and no game state is returned

### Requirement: Per-viewer state
A response SHALL contain only what the requesting seat is allowed to see, so other players' hands and hidden roles are never sent.

#### Scenario: Opponent hand
- **WHEN** seat A loads a Scum room
- **THEN** the payload contains A's cards and only card counts for other seats

### Requirement: Validated actions
The server SHALL validate every action against the rules and the acting seat, and SHALL reject illegal or out-of-turn actions without changing state.

#### Scenario: Out of turn
- **WHEN** a seat plays a card on another seat's turn
- **THEN** the server rejects it and the room is unchanged

### Requirement: Optimistic concurrency
Actions SHALL be saved only if the room is unchanged since it was loaded, and two players claiming the last free seat SHALL NOT both succeed.

#### Scenario: Last seat
- **WHEN** two players join the final open seat simultaneously
- **THEN** one succeeds and the other is told the room changed
