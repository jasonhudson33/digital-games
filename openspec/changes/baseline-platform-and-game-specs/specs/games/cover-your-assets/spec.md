# Spec Delta

## Purpose

Defines Cover Your Assets for two to six players, scored in rounds up to $1,000,000.

## ADDED Requirements

### Requirement: Covering and the nest egg
A new set SHALL cover older sets, a player's first set SHALL be protected, and only a later top set SHALL be challengeable.

#### Scenario: Challenge the nest egg
- **WHEN** a player tries to challenge another player's first set
- **THEN** the challenge is rejected

### Requirement: Challenge resolution
A challenge SHALL alternate matching asset or Wild cards until one player yields, and the last player to reveal a card SHALL take the original set and all challenge cards.

#### Scenario: Yield
- **WHEN** the defender cannot or will not match
- **THEN** the challenger takes the set and challenge cards

### Requirement: Refill and scoring
After each turn players SHALL refill in table order starting with the active player, and once the draw pile and all hands are empty banked values SHALL be added to match scores until someone passes $1,000,000.

#### Scenario: Match end
- **WHEN** a round ends and a player exceeds $1,000,000
- **THEN** the match finishes with the highest total winning
