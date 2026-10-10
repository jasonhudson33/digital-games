# Spec Delta

## Purpose

Defines UNO for two to ten players, Classic or UNO Flip, first to 500 points.

## ADDED Requirements

### Requirement: Classic deck
Classic UNO SHALL use 108 cards: 76 numbers, 24 colored actions, 4 Wilds and 4 Wild Draw Fours.

#### Scenario: New round
- **WHEN** a Classic round is dealt
- **THEN** the deck has 108 cards

### Requirement: Draw voluntarily
A player who draws SHALL be restricted to playing the drawn card for the rest of that turn.

#### Scenario: Play another card
- **WHEN** a player draws and then tries to play a different card
- **THEN** the play is rejected

### Requirement: Wild Draw Four challenge
The victim of a Wild Draw Four SHALL be able to challenge, and a successful or failed challenge SHALL apply the official card outcome.

#### Scenario: Successful challenge
- **WHEN** the player had a matching-color card
- **THEN** the player who played it draws four

### Requirement: UNO call
A missed UNO call SHALL be catchable until the next player acts and SHALL cost two cards.

#### Scenario: Caught
- **WHEN** a player has one card without calling and is caught in time
- **THEN** they draw two

### Requirement: UNO Flip
Playing FLIP SHALL reverse the draw and discard piles and expose the opposite side of every card, and scoring SHALL use the side showing at round end.

#### Scenario: Flip
- **WHEN** FLIP is played
- **THEN** the newly exposed discard controls the next match

### Requirement: Scoring
Round winners SHALL score opponents' cards and the first to 500 SHALL win.

#### Scenario: Reach 500
- **WHEN** a winner's total reaches 500
- **THEN** the match ends
