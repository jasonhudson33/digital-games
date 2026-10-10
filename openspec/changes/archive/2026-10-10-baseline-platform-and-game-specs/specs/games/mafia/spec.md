# Spec Delta

## Purpose

Defines Mafia's hidden-role night and day game for five or more players, with no upper limit.

## ADDED Requirements

### Requirement: Player range
A room SHALL require at least five players and SHALL NOT impose a maximum, including for computer seats.

#### Scenario: Four players
- **WHEN** the host starts with four players
- **THEN** the start is rejected

#### Scenario: Large table
- **WHEN** more than twenty players are in the lobby
- **THEN** more players and computers can still be added

### Requirement: Narrated phases
Play SHALL alternate night and day phases, with narration and canonical transitions driven by the acting host. Room and privacy rules are in `platform/mafia-rooms`.

#### Scenario: Night to day
- **WHEN** all night intents are in and the result is acknowledged
- **THEN** the day phase begins

### Requirement: Replay
Players SHALL be able to start a new game in the same room after one ends.

#### Scenario: Replay
- **WHEN** a game is over and the host chooses replay
- **THEN** roles are reassigned privately for a new game
