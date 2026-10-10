# Spec Delta

## ADDED Requirements

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
