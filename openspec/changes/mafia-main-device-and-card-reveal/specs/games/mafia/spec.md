# Spec Delta

## ADDED Requirements

### Requirement: Hidden card at game start
At the start of a game, a player's role card and role SHALL stay hidden until that player chooses to reveal them, and the acknowledge action SHALL only be offered after the reveal.

#### Scenario: Role screen opens
- **WHEN** the role reveal phase begins for a player
- **THEN** the card and role are not shown and a reveal button is shown instead

#### Scenario: Player reveals
- **WHEN** the player taps the reveal button
- **THEN** the card, role and "I Understand" button are shown

#### Scenario: Player acknowledges
- **WHEN** the player acknowledges their role
- **THEN** the card and role are hidden again and the player waits for the others
