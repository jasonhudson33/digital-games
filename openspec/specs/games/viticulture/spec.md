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

### Requirement: Explicit phases
A started game SHALL always be in exactly one phase: spring, summer, autumn, winter or finished. Year end SHALL be a single transition from winter back to spring, or to finished, that never rests on its own.

#### Scenario: Season order
- **WHEN** every player has passed in summer
- **THEN** the game enters autumn, and after autumn it enters winter

#### Scenario: Year end
- **WHEN** every player has passed in winter and nobody has 20 VP
- **THEN** the game moves directly to the next year's spring with workers returned

### Requirement: Pending decisions
When a rule needs a player's choice, the game SHALL wait for that player's decision and SHALL NOT make it for them. Computer players SHALL decide immediately.

#### Scenario: Waiting on a player
- **WHEN** a human player has an undecided choice
- **THEN** the game does not advance past that choice until they decide

#### Scenario: Not that player's choice
- **WHEN** a seat that does not hold the pending choice tries to decide it
- **THEN** the decision is rejected

### Requirement: Autumn visitors
In autumn, each player SHALL choose summer or winter and draw one visitor of that colour, and a player with a Cottage SHALL instead draw one of each colour and keep one. Players SHALL decide in any order, and winter SHALL begin once all have decided.

#### Scenario: Choosing a colour
- **WHEN** a player without a Cottage chooses winter in autumn
- **THEN** they draw one winter visitor and no summer visitor

#### Scenario: Cottage
- **WHEN** a player with a Cottage reaches autumn
- **THEN** they draw one summer and one winter visitor, keep one and discard the other

### Requirement: Structured events
Every change a player's action makes SHALL be recorded as events with increasing sequence numbers, naming what happened and to whom, and the log SHALL be written from those events.

#### Scenario: Placing a worker
- **WHEN** a player places a worker on Give tour
- **THEN** events record the worker placement and the coins gained, in order

#### Scenario: Log matches events
- **WHEN** an action is taken
- **THEN** the new log line describes the same events that were recorded

### Requirement: Events hide private cards
An event SHALL NOT reveal the identity of a card the viewing seat does not hold, and SHALL show only that cards of a kind were drawn or discarded.

#### Scenario: Opponent draws
- **WHEN** another seat draws two vine cards
- **THEN** this seat's events show two vine cards drawn and no card names

### Requirement: Year-end recap
Year end SHALL produce a recap of the income each player was paid, the ageing of grapes and wine, and the score changes, available to every player without anyone having to dismiss it first.

#### Scenario: Recap shown
- **WHEN** a year ends
- **THEN** each player can see what they were paid and what aged, and the next spring can already be played

### Requirement: Server-computed first-worker bonus
For each action space the server SHALL state whether the next regular worker placed there earns the first-worker bonus, and the client SHALL show that and nothing else.

#### Scenario: Bonus shown matches bonus given
- **WHEN** a player sees a space marked with the bonus and places a regular worker there
- **THEN** they receive exactly that bonus

### Requirement: One-screen table
During play, the shared board, the opponents' scores, workers and coins, and the player's own hand and estate SHALL be reachable on one screen without scrolling the page away from the board, on a phone and on a desktop.

#### Scenario: Phone
- **WHEN** a player is in summer on a 390px-wide screen
- **THEN** the board and the player's hand are both within the screen, with the estate opening as a sheet over it

#### Scenario: Choosing a plant action
- **WHEN** a player selects a vine card from their hand
- **THEN** the spaces and fields where it can be used are highlighted

### Requirement: Inline actions
A player SHALL take an action from the board with only the choices that action needs, and an action that needs no choice SHALL be taken with one tap.

#### Scenario: Give tour
- **WHEN** a player taps Give tour with a worker available
- **THEN** the worker is placed and the coins are gained with no further confirmation

#### Scenario: Plant
- **WHEN** a player taps Plant vine
- **THEN** they are asked for a vine and a field, and nothing else

### Requirement: Event-driven motion
New events SHALL be shown in order as motion on the board and estate: a worker travels to its space, gains and losses of coins and VP float up, drawn cards deal into the hand, and a season banner marks each change of season.

#### Scenario: Opponent's move
- **WHEN** another player places a worker and gains coins
- **THEN** their worker is shown arriving at the space and the coin gain is shown

#### Scenario: Several moves at once
- **WHEN** several events arrive together
- **THEN** they play in order, and the board is correct as soon as they finish

### Requirement: No replay on arrival
A player who loads or rejoins a game SHALL see its current state at once, without events already played being replayed.

#### Scenario: Rejoining
- **WHEN** a player reopens a game in progress
- **THEN** the board shows the present state and no earlier movement is played

### Requirement: Reduced motion
When the player prefers reduced motion, the game SHALL show every change without movement and SHALL keep the board correct.

#### Scenario: Reduced motion on
- **WHEN** reduced motion is preferred and an opponent places a worker
- **THEN** the worker simply appears on its space
