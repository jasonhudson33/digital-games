# Spec Delta

## ADDED Requirements

### Requirement: Spared player named
When the angel's save prevents a night attack, the morning result SHALL name the spared player to all players and SHALL NOT reveal that player's card or role.

#### Scenario: Attack prevented
- **WHEN** the killers' target is the same player the angel saved
- **THEN** every player sees a result naming that player as attacked and spared, and no one is eliminated

#### Scenario: Role stays hidden
- **WHEN** a spared player is named
- **THEN** their card and role are not shown
