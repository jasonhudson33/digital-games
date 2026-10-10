# Spec Delta

## ADDED Requirements

### Requirement: Viticulture hidden information
Viticulture SHALL be played with its rules on the server, and each seat's view SHALL show its own vine, order, summer visitor and winter visitor cards, other seats' card counts per kind, every player's fields, structures, grapes and wine, the board placements, and the four decks and discard piles as counts only.

#### Scenario: Opponent cards
- **WHEN** a seat reads a started game
- **THEN** other seats' cards are empty with counts and every deck is a count

### Requirement: Actions checked on the server
Taking an action, planting, making wine, filling an order and passing the season SHALL be validated on the server against the acting seat's real cards, coins and workers, and drawn cards SHALL come from the server's decks.

#### Scenario: Order not held
- **WHEN** a seat fills an order it does not hold
- **THEN** the action is rejected
