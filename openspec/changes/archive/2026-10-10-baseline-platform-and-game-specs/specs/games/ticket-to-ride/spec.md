# Spec Delta

## Purpose

Defines Ticket to Ride on the USA map for two to five players with computer opponents.

## ADDED Requirements

### Requirement: Trains and scoring
Each player SHALL start with 45 trains and route length SHALL score 1, 2, 4, 7, 10 and 15 points for lengths 1 through 6.

#### Scenario: Length four
- **WHEN** a player claims a four-train route
- **THEN** they score 7

### Requirement: Final round
When a player is left with two or fewer trains the game SHALL give every player one more turn before final scoring.

#### Scenario: Final turns
- **WHEN** a player ends a turn with two or fewer trains
- **THEN** each player takes one more turn and the game then finishes

### Requirement: Destination tickets
A destination ticket whose cities are connected by the player's routes SHALL add its value at the end, and an unconnected ticket SHALL subtract it.

#### Scenario: Failed ticket
- **WHEN** a ticket is not connected at game end
- **THEN** its value is subtracted

### Requirement: Longest route
The player with the longest continuous route SHALL receive a 10-point bonus, shared by ties, and the highest total SHALL win.

#### Scenario: Tied longest
- **WHEN** two players tie for the longest route
- **THEN** both receive 10 points
