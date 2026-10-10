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

### Requirement: Spyrium hidden information
Spyrium SHALL be played with its rules on the server, and each seat's view SHALL show the market, workers, tableaux, the current event and the next event, and the three period decks and events beyond the next one as counts only.

#### Scenario: Future decks and events
- **WHEN** a seat reads a started game
- **THEN** the period decks are empty with counts and no event beyond the next is listed

### Requirement: Moves checked on the server
Placing a worker, switching to activation, activating a card, using a building or event, withdrawing money, choosing a bonus and passing SHALL be validated on the server against the acting seat's workers, money and turn.

#### Scenario: Out of turn
- **WHEN** a seat places a worker on another seat's turn
- **THEN** the action is rejected
