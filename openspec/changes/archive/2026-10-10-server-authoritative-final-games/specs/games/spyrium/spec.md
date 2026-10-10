# Spec Delta

## ADDED Requirements

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
