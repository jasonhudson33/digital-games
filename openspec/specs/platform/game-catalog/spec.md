# platform/game-catalog Specification

## Purpose
Defines the game hub catalog so players can find a game that fits their group size and time, and so every surface reads the same game metadata.

## Requirements

### Requirement: Single catalog source
The hub grid, command palette, site header and per-route metadata SHALL all derive from one catalog of games, each with slug, name, player range, play time, kind, modes and blurb.

#### Scenario: Name change propagates
- **WHEN** a game's name changes in the catalog
- **THEN** the hub tile, the command palette entry and the route metadata all show the new name

### Requirement: Catalog covers every shipped game
The catalog SHALL list each of the 30 playable games exactly once, and SHALL NOT list tools or admin routes as games.

#### Scenario: Game count
- **WHEN** the catalog is loaded
- **THEN** it contains 30 distinct slugs and none of them is an admin or tool route

### Requirement: Filter by player count
The hub SHALL let a visitor choose a player count and SHALL show only games whose player range includes that count.

#### Scenario: Seven players
- **WHEN** the visitor selects 7 players
- **THEN** 7-Up (3–7) is shown and Qwirkle (2–4) is hidden

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

### Requirement: Estimated fields are flagged
A catalog value that is a guess rather than a recorded rule SHALL be listed in that game's `estimated` set, and SHALL be removed from it once verified.

#### Scenario: Verified value
- **WHEN** a game's player range is confirmed against its engine
- **THEN** `players` is not in its `estimated` set
