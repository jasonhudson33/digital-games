# games/spyrium Specification

## Purpose
Defines Spyrium, a six-round worker-placement game for two to five players on a 3×3 card market.

## Requirements

### Requirement: Placement then activation
Each player SHALL switch from Placement to Activation once per round and SHALL NOT switch back that round.

#### Scenario: Switch back
- **WHEN** an activating player tries to place a worker
- **THEN** the action is rejected

### Requirement: Market pricing
Activating a market card SHALL be priced from the card, adjacent workers and any building-space cost.

#### Scenario: Crowded card
- **WHEN** more workers are adjacent to a card
- **THEN** its activation price is higher

### Requirement: Decks by period
Period A SHALL supply three nine-card markets, Period B two and Period C a single final market of all nine cards.

#### Scenario: Final market
- **WHEN** Period C begins
- **THEN** all nine Period C cards form the market
