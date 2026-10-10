# games/viticulture Specification

## Purpose
Defines Viticulture for two to six players, a seasonal worker-placement race to 20 victory points.

## Requirements

### Requirement: Seasons
Each year SHALL begin in spring and proceed through summer and winter, which each have their own six action spaces, summer visitors SHALL be yellow and played in summer, and winter visitors SHALL be blue and played in winter.

#### Scenario: Winter visitor
- **WHEN** a player takes the winter visitor action
- **THEN** a winter visitor is played, not a summer one

### Requirement: Cellars
A medium cellar SHALL allow wine up to value 6 including rosé and a large cellar up to 9 including sparkling.

#### Scenario: Value 7 wine
- **WHEN** a player has only a medium cellar
- **THEN** value 7 wine cannot be made

### Requirement: Game end
The game SHALL end when a player has 20 or more victory points at the end of a year, and the highest score SHALL win, sharing on ties.

#### Scenario: Reach 20
- **WHEN** a player reaches 20 VP
- **THEN** the game finishes and final standings are ranked

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
