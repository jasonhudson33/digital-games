# platform/server-authoritative-rooms Specification

## Purpose
Defines the room model for games with private information (7-Up, DOS, Flip 7, Hand and Foot, Killer Bunnies, Phase 10, Pinochle, Scum, Secret Hitler, Skull King, UNO), where the server holds the whole game and each seat sees only its own view.

## Requirements

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

### Requirement: Engine-backed action API
A game whose rules run on the server SHALL accept moves as `POST /api/<game>/rooms/<code>` with an action name and arguments plus the seat token, run the game's rules engine on the stored game, and reject an action the engine does not accept.

#### Scenario: Legal move
- **WHEN** the seated player whose turn it is posts a legal action
- **THEN** the server applies it, saves the new game and returns that seat's view

#### Scenario: Rejected move
- **WHEN** the engine returns the game unchanged for an action
- **THEN** the server answers 400 and the stored game is unchanged

### Requirement: Seat views of engine-backed games
A response for an engine-backed game SHALL replace every other seat's hand and the draw pile with counts, and SHALL omit any field that would reveal hidden cards or hidden rule outcomes before the rules reveal them.

#### Scenario: Opponent hand
- **WHEN** seat A reads a started game
- **THEN** other seats' hands are empty lists with a hand count and the draw pile is a count

### Requirement: Host-paced computer turns
Computer players in an engine-backed room SHALL move only when the host's seat posts a `computerStep` action while a computer is due to act, and each step SHALL apply exactly one computer move.

#### Scenario: Host steps a computer
- **WHEN** the host posts `computerStep` and the current player is a computer
- **THEN** one computer move is applied and saved

#### Scenario: Non-host step
- **WHEN** a non-host seat posts `computerStep`
- **THEN** it is rejected

#### Scenario: No computer due
- **WHEN** `computerStep` is posted and no computer is due to act
- **THEN** the room is unchanged

### Requirement: Rooms from the previous format
A room stored in the previous whole-state format for an engine-backed game SHALL NOT be resumed, and a request for it SHALL answer that the room predates an update and a new room must be started.

#### Scenario: Old room
- **WHEN** a client opens a room stored before the change
- **THEN** it receives that message and no game state
