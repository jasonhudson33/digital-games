# platform/client-authoritative-rooms Specification

## Purpose
Records the current behavior of the games whose browser computes game state and stores it whole in a shared room (Catan), so later changes can modify it deliberately.

## Requirements

### Requirement: Whole-state room API
Each client-authoritative game SHALL expose `GET` and `PUT` on `/api/<game>/rooms/<code>` that read and replace the complete game object. Every other game, including UNO, DOS, Flip 7, Phase 10, BANG!, Cover Your Assets, Five Crowns, Sequence, Qwirkle, Stratego, Dominion, Risk, Splendor, Ticket to Ride, Viticulture, Life, No Thanks! and Spyrium, is not client-authoritative and SHALL NOT expose whole-state `GET` or `PUT`.

#### Scenario: Read
- **WHEN** a client sends GET for an existing room
- **THEN** the response is `{ state }` with `Cache-Control: no-store`

#### Scenario: Replace
- **WHEN** a client sends PUT with a state whose `roomCode` matches the URL
- **THEN** the state is saved and returned

#### Scenario: Engine-backed game
- **WHEN** a client sends PUT with a whole state to the UNO room API
- **THEN** the request is rejected and no state is replaced

#### Scenario: Engine-backed hidden-information game
- **WHEN** a client sends PUT with a whole state to the Stratego room API
- **THEN** the request is rejected and no state is replaced

#### Scenario: Engine-backed card and ticket game
- **WHEN** a client sends PUT with a whole state to the Ticket to Ride room API
- **THEN** the request is rejected and no state is replaced

#### Scenario: Engine-backed board game
- **WHEN** a client sends PUT with a whole state to the Life room API
- **THEN** the request is rejected and no state is replaced

### Requirement: Write validation
A PUT SHALL be rejected with 400 when the body is unreadable, has no state, or its `roomCode` differs from the URL code.

#### Scenario: Mismatched code
- **WHEN** the body state's `roomCode` is `AAAAA` and the URL code is `BBBBB`
- **THEN** the response is 400 "Invalid room state"

### Requirement: Version conflict
A PUT made against a stale `expectedUpdatedAt` SHALL return 409 and leave the stored room unchanged.

#### Scenario: Stale write
- **WHEN** a client PUTs with an `expectedUpdatedAt` older than the stored room
- **THEN** the response is 409 and the stored state is unchanged

### Requirement: Rooms reach the database only through the server
A client-authoritative game's browser SHALL read and write its room only through that game's `/api/<game>/rooms/<code>` route, and the database tables that hold room state SHALL grant nothing to browser roles.

#### Scenario: Browser without a database client
- **WHEN** a Catan or Monopoly browser loads, saves or updates a room
- **THEN** every request goes to the game's room route and none to the database

#### Scenario: Public key cannot list rooms
- **WHEN** someone uses the site's public database key to select from a room table
- **THEN** no room table is readable or writable with that key

### Requirement: Changes arrive by polling
A client-authoritative game SHALL learn about other players' changes by polling its room route, with updates between tabs of one browser also shared through a broadcast, and SHALL ignore a state older than the one it already has.

#### Scenario: Another player moves
- **WHEN** another browser saves a newer state
- **THEN** the next poll delivers it

#### Scenario: Older state
- **WHEN** a poll returns a state with an older `updatedAt`
- **THEN** it is not delivered
