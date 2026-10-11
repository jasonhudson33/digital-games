# Spec Delta

## ADDED Requirements

### Requirement: Spectator tile placement on the track
A player placing a spectator tile SHALL choose cheering or booing and then a space directly on the track, and the table SHALL show which spaces are legal and refuse the others.

#### Scenario: Legal spaces are shown
- **WHEN** the current player begins placing a spectator tile
- **THEN** the track marks every space where the tile may legally go and gives no other space a way to be chosen

#### Scenario: Place on a chosen space
- **WHEN** the player chooses a marked space and confirms
- **THEN** the tile is placed on that space with the chosen side and the turn advances

#### Scenario: Keyboard and touch
- **WHEN** a player places a tile using only a keyboard or a touch screen
- **THEN** every marked space can be focused or tapped and carries a label naming its space number and the tile side

#### Scenario: Cancel before confirming
- **WHEN** a player stops placing a tile before confirming
- **THEN** no tile moves and the turn does not advance

### Requirement: Turn actions presentation
The table SHALL present the current player's turn as a single choice among the available actions, SHALL show an unavailable action as disabled with its reason, and SHALL make clear to every seat whose turn it is.

#### Scenario: One action at a time
- **WHEN** it is a player's turn
- **THEN** the table offers leg bet, roll pyramid, spectator tile, and secret finish bet, plus partnership in games with six or more players, and shows the controls of only the chosen action

#### Scenario: Unavailable action
- **WHEN** an action cannot be taken, such as a leg bet on a camel whose tickets are gone or a finish bet when all five cards are placed
- **THEN** it is shown disabled with a short reason and cannot be submitted

#### Scenario: Waiting seats
- **WHEN** it is not a seat's turn
- **THEN** that seat sees whose turn it is and cannot submit a turn action

### Requirement: Public bets at a glance
The table SHALL show, from public information only, each camel's remaining leg tickets, every player's held leg tickets, pyramid tickets, spectator tile and partner, and the number of overall bets placed in each deck.

#### Scenario: Leg ticket stacks
- **WHEN** a leg ticket is taken
- **THEN** the camel's ticket stack shows its remaining values with the next payout on top, and the holder's card lists that ticket

#### Scenario: Hidden finish bets
- **WHEN** a seat looks at the overall betting decks before the race ends
- **THEN** it sees the type, order and owner of each placed card but the camel only on its own cards

### Requirement: Race movement feedback
The table SHALL show the racing and crazy camels, their stack order and any spectator tiles, SHALL mark the camel unit that moved last, and SHALL animate a camel's change of space unless the viewer prefers reduced motion.

#### Scenario: Last move is marked
- **WHEN** a pyramid roll moves a camel unit
- **THEN** every seat sees that unit marked until the next roll

#### Scenario: Reduced motion
- **WHEN** the viewer's system requests reduced motion
- **THEN** camels appear on their new spaces without movement animation and no information is lost

### Requirement: Phone-sized table
The Camel Up table SHALL fit a viewport from 320px wide without sideways page scroll, SHALL keep its primary turn actions at least 44px tall, and SHALL keep the turn actions reachable while the track is in view.

#### Scenario: Narrow phone
- **WHEN** the table is shown at 320px width during a player's turn
- **THEN** the page does not scroll sideways, the track and the turn actions can be used, and the primary action is at least 44px tall
