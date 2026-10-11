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
Taking a pyramid ticket SHALL reveal one random remaining die, move the indicated camel unit, award one Pound for that ticket during leg scoring, and add an entry to the leg roll record. A leg SHALL end after the fifth pyramid ticket is taken, leaving one die unrevealed, and its scoring SHALL produce a leg recap.

#### Scenario: Racing die
- **WHEN** a racing die is revealed
- **THEN** its matching camel unit moves clockwise by the server-rolled value from one to three

#### Scenario: Grey die
- **WHEN** the grey die is revealed
- **THEN** the eligible black or white crazy camel moves counterclockwise by the server-rolled value from one to three, following the crazy-camel carrying priority rules

#### Scenario: Next leg
- **WHEN** leg scoring and any partnership choices are complete and the race has not ended
- **THEN** leg and pyramid tickets return to their stacks, spectator tiles return to their owners, all six dice return to the pyramid, the live leg roll record empties, and the next player begins a new leg

#### Scenario: Fifth roll is kept
- **WHEN** the fifth pyramid ticket is taken
- **THEN** that roll is in the leg recap even though the leg is scored and reset in the same action

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

### Requirement: Leg roll record
The room SHALL keep a public, ordered record of every pyramid roll in the current leg, listing the roller, the die drawn, the camel that moved, the rolled number, and any spectator-tile payout and bonus move the roll caused.

#### Scenario: Roll is recorded
- **WHEN** a player takes a pyramid ticket and the revealed die moves a camel unit
- **THEN** the leg record gains an entry naming that player, the die, the moved camel, and the server-rolled value from one to three

#### Scenario: Grey die entry
- **WHEN** the grey die is revealed
- **THEN** the entry names the crazy camel that actually moved and the face shown on the die

#### Scenario: Spectator tile in a roll
- **WHEN** the moved unit ends on a spectator tile
- **THEN** the entry names the tile owner, whether it was cheering or booing, and the one-Pound payout

#### Scenario: Record covers the whole leg
- **WHEN** the fifth pyramid ticket of a leg is taken
- **THEN** the leg record contains all five entries and the unrevealed sixth die is not listed

#### Scenario: Record resets with the leg
- **WHEN** the next leg begins
- **THEN** the live leg record is empty and the previous leg's rolls remain only inside that leg's recap

### Requirement: Leg recap
When a leg is scored the room SHALL publish a recap that survives the leg reset and lists the final leg order, the leg's rolls, and for each player their ticket payouts, pyramid ticket reward, spectator-tile income, copied partner reward, and Pound totals before and after the leg.

#### Scenario: Recap after a normal leg
- **WHEN** the fifth pyramid ticket ends a leg and the race has not finished
- **THEN** the room contains a recap for that leg while the next leg is already ready to begin

#### Scenario: Per-player breakdown
- **WHEN** a recap is shown for a leg
- **THEN** each player's row lists every leg ticket they held with its payout, their pyramid reward, tile income, and any partner copy, and their after total equals their before total plus those amounts but never below zero

#### Scenario: Recap awaits partnership choices
- **WHEN** a leg ends in a game with partnerships
- **THEN** the recap is published only after every partnership choice has been made and includes each copied reward

#### Scenario: Recap is public
- **WHEN** any seat reads the room after a leg is scored
- **THEN** that seat receives the same recap, which contains no finish-card colors

#### Scenario: Recap does not stall play
- **WHEN** a leg recap is published
- **THEN** the next leg's first player can act immediately and no player is required to acknowledge the recap for the game to continue

### Requirement: Final race recap
When the race ends, the room SHALL include the final leg's recap and a card-by-card resolution of the overall winner and loser bets, listing each card's owner, named camel, correctness, and Pound change, ahead of the final standings.

#### Scenario: Final leg is recapped
- **WHEN** a camel unit crosses the finish line
- **THEN** the final leg's recap, including the roll that ended the race, is available alongside the final standings

#### Scenario: Bets resolved in order
- **WHEN** overall bets are scored
- **THEN** the resolution lists the winner deck and then the loser deck in placement order, each card with its owner, camel, and payout of eight, five, three, two, or one Pound, or a loss of one Pound

#### Scenario: Finish cards stay hidden until the end
- **WHEN** the race has not yet finished
- **THEN** no recap or roll record reveals any finish card's camel

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
