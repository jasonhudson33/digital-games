# Spec Delta

## Purpose

Defines Splendor for two to four players with a shared gem bank and development markets.

## ADDED Requirements

### Requirement: Token limit
A player SHALL hold at most ten tokens and SHALL return the excess at turn end.

#### Scenario: Eleventh token
- **WHEN** a player ends with eleven tokens
- **THEN** they must return one

### Requirement: Setup
Each colored gem pile SHALL hold 4 tokens at two players, 5 at three and 7 at four, with 5 gold in every game.

#### Scenario: Two players
- **WHEN** a two-player game starts
- **THEN** each colored gem has 4 tokens

### Requirement: Reservations
A player SHALL hold at most three reserved developments, reserved cards SHALL be private, and gold SHALL stand in for any missing gem when buying.

#### Scenario: Fourth reservation
- **WHEN** a player with three reserved cards tries to reserve another
- **THEN** the action is rejected

### Requirement: Nobles and end
A noble SHALL visit a player who meets its bonus requirement, and when a player reaches 15 points the round SHALL finish so all players have equal turns before the winner is decided.

#### Scenario: Final round
- **WHEN** a player reaches 15 points
- **THEN** the remaining players in that round still take a turn
