# Spec Delta

## ADDED Requirements

### Requirement: Pile clears only on passes
A play of any size, four of a kind included, SHALL stay on the pile, and the next player in turn order who has not passed SHALL either beat it with a higher set of the same size or pass. The pile SHALL clear only when every other active player has passed.

#### Scenario: Four of a kind stays
- **WHEN** a player plays four 9s
- **THEN** the pile holds the four 9s and the turn moves to the next player who has not passed

#### Scenario: Beating four of a kind
- **WHEN** the pile is four 9s and the next player plays four 10s
- **THEN** the play is legal and replaces the pile

#### Scenario: Lower four
- **WHEN** the pile is four 9s and a player plays four 7s
- **THEN** the play is illegal

#### Scenario: Everyone else passes
- **WHEN** every other active player has passed on the pile
- **THEN** the pile clears and the last player to play leads

### Requirement: Passed players shown
Every player's view SHALL mark each player who has passed on the current pile, including the viewer, as passed until the pile clears.

#### Scenario: Opponent passes
- **WHEN** an opponent passes
- **THEN** their seat shows as passed

#### Scenario: Pile clears
- **WHEN** the pile clears
- **THEN** no player shows as passed
