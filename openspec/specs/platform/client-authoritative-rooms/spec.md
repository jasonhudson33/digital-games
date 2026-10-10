# platform/client-authoritative-rooms Specification

## Purpose
Records the current behavior of the games whose browser computes game state and stores it whole in a shared room (BANG!, Catan, Cover Your Assets, Dominion, Five Crowns, Life, Monopoly, No Thanks!, Qwirkle, Risk, Sequence, Splendor, Spyrium, Stratego, Ticket to Ride, Viticulture), so later changes can modify it deliberately.

## Requirements

### Requirement: Whole-state room API
Each client-authoritative game SHALL expose `GET` and `PUT` on `/api/<game>/rooms/<code>` that read and replace the complete game object. UNO, DOS, Flip 7 and Phase 10 are not client-authoritative and SHALL NOT expose whole-state `GET` or `PUT`.

#### Scenario: Read
- **WHEN** a client sends GET for an existing room
- **THEN** the response is `{ state }` with `Cache-Control: no-store`

#### Scenario: Replace
- **WHEN** a client sends PUT with a state whose `roomCode` matches the URL
- **THEN** the state is saved and returned

#### Scenario: Engine-backed game
- **WHEN** a client sends PUT with a whole state to the UNO room API
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
