# Spec Delta

## Purpose

Defines What If, a party game for three to twenty people in which each player writes a "What if" and a "Then", and the table reveals the IFs matched with other players' THENs.

## ADDED Requirements

### Requirement: Players
A What If room SHALL seat three to twenty people and SHALL NOT offer computer players. The host SHALL NOT be able to start with fewer than three.

#### Scenario: Too few
- **WHEN** the host tries to start with two players
- **THEN** the start is rejected

### Requirement: Writing
During the writing phase each player SHALL have a "What if" text area and a "Then" text area, each limited to 200 characters. A player SHALL be able to submit only when both are non-blank, and SHALL be able to edit and resubmit until the mix.

#### Scenario: Blank half
- **WHEN** a player has filled in "What if" but left "Then" blank
- **THEN** they cannot submit

#### Scenario: Editing after submitting
- **WHEN** a player changes their "Then" and submits again before the mix
- **THEN** the new text replaces the old

### Requirement: Private until the reveal
Before the reveal, a player's view SHALL include only their own text and which players have submitted. It SHALL never include another player's text.

#### Scenario: Another player's view
- **WHEN** Ana has submitted and Ben views the room during writing
- **THEN** Ben sees that Ana has submitted and none of Ana's text

### Requirement: Mixing
The mix SHALL happen automatically once every seated player has submitted, or when the host chooses to mix with at least three submissions. It SHALL pair each submitted IF with exactly one submitted THEN written by a different player, use every THEN exactly once, and present the pairs in random order. Players who did not submit SHALL sit out the round.

#### Scenario: Everyone submits
- **WHEN** the last of four players submits
- **THEN** four pairs are made and no pair's IF and THEN share a writer

#### Scenario: Host mixes early
- **WHEN** five of six players have submitted and the host chooses Mix now
- **THEN** five pairs are made from those five players

#### Scenario: Not enough to mix
- **WHEN** only two players have submitted and the host chooses Mix now
- **THEN** the mix is rejected

### Requirement: Host-paced reveal
After the mix, every player SHALL see the same current pair, showing the IF, then the THEN, then who wrote each. Only the host SHALL be able to advance to the next pair. Pairs not yet reached SHALL NOT be sent to any player.

#### Scenario: Next pair
- **WHEN** the host chooses Next on pair 2 of 5
- **THEN** every player sees pair 3 of 5

#### Scenario: Unrevealed pairs stay hidden
- **WHEN** pair 2 of 5 is showing
- **THEN** no player's view contains the text of pairs 3 to 5

### Requirement: Play again
After the last pair, the host SHALL be able to start a new writing round in the same room with every seated player and empty text areas, and every pair from the round SHALL remain visible until then.

#### Scenario: New round
- **WHEN** the host chooses Play again after the last pair
- **THEN** everyone returns to writing with empty text areas
