# games/camel-up Specification

## Purpose

Defines Camel Up (Second Edition), a three-to-eight-player race and betting game with stacked camels, hidden predictions, leg scoring, and optional computer seats.

## Requirements

### Requirement: Camel Up room
Camel Up SHALL be played by three to eight human or computer players in a shared room, with each player starting the race with three Egyptian Pounds.

#### Scenario: Host starts a race
- **WHEN** the room contains between three and eight seats and the host starts the game
- **THEN** every seat enters the race with three Egyptian Pounds and a complete set of five finish cards

#### Scenario: Too few seats
- **WHEN** the host tries to start with fewer than three players
- **THEN** the room rejects the start and remains in the lobby

### Requirement: Random race setup
The server SHALL determine the starting player, racing-camel positions and stack order, crazy-camel positions and stack order, and all later die outcomes without accepting a result from a client.

#### Scenario: Racing camel setup
- **WHEN** a race starts
- **THEN** each racing camel begins on space one, two, or three according to its server-rolled die and camels sharing a space form a server-randomized stack

#### Scenario: Crazy camel setup
- **WHEN** a race starts
- **THEN** the black and white crazy camels begin facing counterclockwise on spaces fourteen, fifteen, or sixteen according to two server rolls of the grey die

### Requirement: Camel stack movement
Camels on one space SHALL form a bottom-to-top stack, and moving a camel SHALL carry that camel and every camel above it while leaving lower camels behind.

#### Scenario: Racing camel carries a stack
- **WHEN** a racing camel moves clockwise while another camel is above it
- **THEN** both camels move as one unit and land on top of any unit already at the destination

#### Scenario: Crazy camel carries racing camels
- **WHEN** a crazy camel moves counterclockwise with racing camels above it
- **THEN** the crazy camel carries those racing camels with it

#### Scenario: Racing rank in a stack
- **WHEN** two racing camels occupy the same space
- **THEN** the racing camel higher in the stack ranks ahead of the one below it

### Requirement: Player turn actions
On a normal turn, a player SHALL perform exactly one available action: take a leg betting ticket, place or move their spectator tile, take a pyramid ticket and reveal a die, or place a hidden finish card on the overall winner or loser bet.

#### Scenario: One action advances the turn
- **WHEN** the current player completes a legal normal action and no scoring interruption begins
- **THEN** the next seated player becomes current

#### Scenario: Unavailable action
- **WHEN** a player attempts an action that is unavailable, illegal, or out of turn
- **THEN** the action is rejected and the race state does not change

### Requirement: Leg betting tickets
Each racing camel SHALL have a public stack of leg betting tickets worth five, three, two, and two Pounds for first place; a held ticket SHALL instead pay one Pound for second place and lose one Pound for any lower place.

#### Scenario: Take the top ticket
- **WHEN** the current player takes a leg ticket for a racing camel
- **THEN** the highest remaining ticket for that camel moves to the player's public holdings

#### Scenario: Score a leg ticket
- **WHEN** a leg ends
- **THEN** each held ticket pays its printed value for the leading camel, one Pound for the second-place camel, or negative one Pound for another camel without reducing a player below zero Pounds

### Requirement: Spectator tiles
A player SHALL be able to place or move their spectator tile, cheering or booing side up, on an empty track space other than space one that is not adjacent to another spectator tile.

#### Scenario: Cheering tile
- **WHEN** a camel unit ends its movement on a cheering tile
- **THEN** the tile owner gains one Pound and the unit moves one additional space in its forward direction, landing on top of any destination stack

#### Scenario: Booing tile
- **WHEN** a camel unit ends its movement on a booing tile
- **THEN** the tile owner gains one Pound and the unit moves one space opposite its forward direction, landing beneath any destination stack

#### Scenario: Crazy camel direction
- **WHEN** a crazy-camel unit encounters a spectator tile
- **THEN** cheering and booing modify movement relative to its counterclockwise forward direction

### Requirement: Pyramid actions and leg end
Taking a pyramid ticket SHALL reveal one random remaining die, move the indicated camel unit, and award one Pound for that ticket during leg scoring. A leg SHALL end after the fifth pyramid ticket is taken, leaving one die unrevealed.

#### Scenario: Racing die
- **WHEN** a racing die is revealed
- **THEN** its matching camel unit moves clockwise by the server-rolled value from one to three

#### Scenario: Grey die
- **WHEN** the grey die is revealed
- **THEN** the eligible black or white crazy camel moves counterclockwise by the server-rolled value from one to three, following the crazy-camel carrying priority rules

#### Scenario: Next leg
- **WHEN** leg scoring and any partnership choices are complete and the race has not ended
- **THEN** leg and pyramid tickets return to their stacks, spectator tiles return to their owners, all six dice return to the pyramid, and the next player begins a new leg

### Requirement: Hidden overall bets
Each player SHALL be able to commit each of their five finish cards at most once to the ordered overall-winner or overall-loser bet, and another seat SHALL NOT learn the chosen camel before final scoring.

#### Scenario: Opponent views a finish bet
- **WHEN** a seat reads a race after another player places a finish card
- **THEN** the seat can see the bet type, order, and owner but not the camel named by that card

#### Scenario: Owner views a finish bet
- **WHEN** a player reads their own placed finish card
- **THEN** the chosen camel remains visible to that player

#### Scenario: Reuse a finish card
- **WHEN** a player tries to place a finish card they already committed
- **THEN** the action is rejected and the betting decks do not change

### Requirement: Betting partnerships
In games with six or more players, a player with an available partnership card SHALL be able to pair with another available player for the current leg, and each partner SHALL be able to copy the reward of at most one of the other's leg or pyramid tickets during leg scoring.

#### Scenario: Form a partnership
- **WHEN** the current player chooses another player whose partnership card is available
- **THEN** the two players become partners for the rest of the leg without requiring acceptance and the turn advances

#### Scenario: Partnership scoring choice
- **WHEN** leg scoring reaches a human player with a partner
- **THEN** that player chooses one partner ticket to copy or chooses no ticket before scoring completes

#### Scenario: Partnership reset
- **WHEN** leg scoring completes
- **THEN** all partnership cards become available again for the next leg

### Requirement: Race finish and final scoring
The race SHALL end immediately when any camel unit crosses the finish line in its forward direction, after which the current leg and both ordered overall betting decks SHALL be scored.

#### Scenario: Correct overall bet
- **WHEN** correct finish cards are revealed in placement order for the actual overall winner or loser
- **THEN** they pay eight, five, three, two, then one Pound for each later correct card

#### Scenario: Incorrect overall bet
- **WHEN** a revealed finish card does not name the actual overall winner or loser for its deck
- **THEN** its owner loses one Pound without dropping below zero Pounds

#### Scenario: Crazy camel crosses the finish
- **WHEN** a crazy camel carries racing camels counterclockwise across the finish line
- **THEN** the race ends and those carried racing camels rank as the least advanced racing camels

#### Scenario: Determine the winning player
- **WHEN** all final scoring is complete
- **THEN** the player or tied players with the most Egyptian Pounds win the game

### Requirement: Computer racers
Computer players SHALL choose only legal actions and SHALL resolve both normal turns and partnership scoring choices through host-paced server steps.

#### Scenario: Computer normal turn
- **WHEN** the current player is a computer during normal play
- **THEN** one host-authorized computer step performs exactly one legal action

#### Scenario: Computer partnership choice
- **WHEN** a computer must choose a partner ticket during leg scoring
- **THEN** one host-authorized computer step copies a non-negative available reward or declines when every available reward is negative
