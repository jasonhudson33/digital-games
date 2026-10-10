# Spec Delta

## ADDED Requirements

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
