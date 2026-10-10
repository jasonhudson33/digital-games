# Spec Delta

## Purpose

Defines Secret Hitler for five to ten players with private roles on the server.

## ADDED Requirements

### Requirement: Role distribution
Roles SHALL be one Hitler plus Fascists and Liberals by table size: 5 = 1 Fascist, 3 Liberals; 6 = 1/4; 7 = 2/4; 8 = 2/5; 9 = 3/5; 10 = 3/6.

#### Scenario: Seven players
- **WHEN** seven players start
- **THEN** there are 4 Liberals, 2 Fascists and Hitler

### Requirement: Policy deck
The deck SHALL hold 6 Liberal and 11 Fascist policies.

#### Scenario: New game
- **WHEN** a game starts
- **THEN** the policy deck has 17 cards

### Requirement: Role privacy
A player's role SHALL be returned only to that player's seat, except as the rules reveal teammates.

#### Scenario: Liberal view
- **WHEN** a Liberal loads the room
- **THEN** other players' roles are absent
