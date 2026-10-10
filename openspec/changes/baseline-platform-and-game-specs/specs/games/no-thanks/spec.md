# Spec Delta

## Purpose

Defines No Thanks! for three to seven players, a single-round game where the lowest score wins.

## ADDED Requirements

### Requirement: Deck and starting chips
The game SHALL use cards 3–35, remove nine unseen so 24 remain, and give each player 11 chips at 3–5 players, 9 at six and 7 at seven.

#### Scenario: Six players
- **WHEN** six players start
- **THEN** each has 9 chips

### Requirement: Take or pay
On a turn a player SHALL take the card and its chips, keeping the turn, or pay one chip to pass left, and a player with no chips SHALL take.

#### Scenario: Out of chips
- **WHEN** a player has zero chips
- **THEN** passing is not offered

### Requirement: Scoring
Only the lowest card in each consecutive run SHALL score, each chip SHALL subtract one point, and the lowest total SHALL win.

#### Scenario: Run of three
- **WHEN** a player holds 20, 21 and 22
- **THEN** only 20 counts
