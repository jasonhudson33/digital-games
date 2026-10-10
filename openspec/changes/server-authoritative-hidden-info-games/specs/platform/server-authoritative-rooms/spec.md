# Spec Delta

## ADDED Requirements

### Requirement: Hidden roles and pieces until revealed
A view of an engine-backed game SHALL withhold a hidden role or an unrevealed piece's identity from every seat except its owner, and SHALL disclose it only when a rule reveals it, such as an elimination, a battle or the end of the game.

#### Scenario: Another seat's role
- **WHEN** a seat reads a started BANG! room
- **THEN** other living seats' roles are absent unless the role is the Sheriff

#### Scenario: Role revealed on elimination
- **WHEN** a player is eliminated
- **THEN** their role appears in every seat's view
