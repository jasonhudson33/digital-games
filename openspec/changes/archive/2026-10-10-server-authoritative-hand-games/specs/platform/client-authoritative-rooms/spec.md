# Spec Delta

## MODIFIED Requirements

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
