# Spec Delta

## Purpose

Defines Mafia's separate token-validated room model, where each device reads only its own role and an acting host aggregates private intents.

## ADDED Requirements

### Requirement: Device credentials
Mafia SHALL identify players by persistent device credentials stored with the room, not Supabase Authentication, and Anonymous Sign-Ins SHALL stay disabled.

#### Scenario: Returning device
- **WHEN** a device rejoins with its stored credential
- **THEN** it resumes its seat

### Requirement: Private roles
A player's role SHALL be readable only with that device's credential until the game is over.

#### Scenario: Another player's role
- **WHEN** device A requests device B's role during play
- **THEN** the request is denied

### Requirement: Acting host
A present living player SHALL act as host to aggregate intents into room state, and host duty SHALL transfer if that player leaves or goes absent.

#### Scenario: Host leaves
- **WHEN** the acting host permanently leaves
- **THEN** another present living player becomes acting host

### Requirement: Acknowledged results
After an elimination, the game SHALL wait for the phase result to be acknowledged before moving to the next phase.

#### Scenario: Unacknowledged night result
- **WHEN** a night elimination has not been acknowledged
- **THEN** the day phase does not begin
