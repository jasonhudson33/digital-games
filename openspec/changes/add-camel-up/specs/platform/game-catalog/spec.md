# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog covers every shipped game
The catalog SHALL list each of the 30 playable games exactly once, and SHALL NOT list tools or admin routes as games.

#### Scenario: Game count
- **WHEN** the catalog is loaded
- **THEN** it contains 30 distinct slugs and none of them is an admin or tool route

### Requirement: Metadata matches game rules
A game's catalog player range SHALL equal the range its rules engine accepts, and its listed modes SHALL be modes the game actually offers.

#### Scenario: Hearts range
- **WHEN** the Hearts catalog entry is read
- **THEN** its range covers 3–8 players (3–4 Classic, 5–8 Killer)

#### Scenario: Catan range
- **WHEN** the Catan catalog entry is read
- **THEN** its range is 2–6 players, with five and six played through paired turns

#### Scenario: Open-ended range
- **WHEN** a game has no maximum (Mafia)
- **THEN** its catalog range is open-ended and it matches any player count from its minimum up

#### Scenario: Hearts modes
- **WHEN** Hearts offers no shared room
- **THEN** its catalog modes do not include `online`

#### Scenario: Camel Up metadata
- **WHEN** the Camel Up catalog entry is read
- **THEN** its range is 3–8 players and its modes include online rooms and computer players
