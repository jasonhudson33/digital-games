# Spec Delta

## Purpose

Defines Monopoly property trading, building, debt and bankruptcy for two to eight players in shared rooms.

## ADDED Requirements

### Requirement: Monopoly requires unmortgaged group
Building SHALL be allowed only on a color group the player fully owns with no mortgaged property, and SHALL be even across the group.

#### Scenario: Mortgaged property
- **WHEN** one property of a color group is mortgaged
- **THEN** no houses can be built on that group

### Requirement: Manage stage
After rolling, the active player SHALL be able to trade and build before ending the turn.

#### Scenario: Trade after roll
- **WHEN** the active player has rolled
- **THEN** they may propose a trade before ending the turn

### Requirement: Debt and bankruptcy
A player in debt SHALL raise cash only through legal mortgaging, and if debt remains they SHALL be bankrupt and surrender all transferable value to the creditor.

#### Scenario: Unpayable rent
- **WHEN** a player cannot cover rent after mortgaging everything
- **THEN** they are eliminated and their assets go to the creditor

### Requirement: Building supply
The bank SHALL hold 32 houses and 12 hotels, and a purchase SHALL fail when its pieces are exhausted.

#### Scenario: Houses gone
- **WHEN** all 32 houses are on the board
- **THEN** no further house can be bought
