# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
