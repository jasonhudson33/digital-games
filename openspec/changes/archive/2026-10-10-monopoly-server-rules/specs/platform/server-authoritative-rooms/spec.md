# Spec Delta

## ADDED Requirements

### Requirement: Host-driven local seats
A game that lets the host add local seats on the host's own device SHALL let the host's seat act as a local seat, and SHALL refuse an action as a local seat from any other seat.

#### Scenario: Host acts for a local seat
- **WHEN** the host sends an action naming a local seat
- **THEN** the server applies it as that seat

#### Scenario: Guest names a local seat
- **WHEN** a non-host seat sends an action naming a local seat
- **THEN** the action is rejected

#### Scenario: Host names a real seat
- **WHEN** the host sends an action naming another human's seat
- **THEN** the action is rejected
