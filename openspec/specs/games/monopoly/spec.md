# games/monopoly Specification

## Purpose
Defines Monopoly property trading, building, debt and bankruptcy for two to eight players in shared rooms.

## Requirements

### Requirement: Monopoly requires unmortgaged group
Building SHALL be allowed only on a color group the player fully owns with no mortgaged property, and SHALL be even across the group.

#### Scenario: Mortgaged property
- **WHEN** one property of a color group is mortgaged
- **THEN** no houses can be built on that group

### Requirement: Manage stage
After rolling, the active player SHALL be able to trade and build before ending the turn.

#### Scenario: Trade after roll
- **WHEN** the active player has rolled
- **THEN** they may propose a trade before ending the turn

### Requirement: Debt and bankruptcy
A player in debt SHALL raise cash only through legal mortgaging, and if debt remains they SHALL be bankrupt and surrender all transferable value to the creditor.

#### Scenario: Unpayable rent
- **WHEN** a player cannot cover rent after mortgaging everything
- **THEN** they are eliminated and their assets go to the creditor

### Requirement: Building supply
The bank SHALL hold 32 houses and 12 hotels, and a purchase SHALL fail when its pieces are exhausted.

#### Scenario: Houses gone
- **WHEN** all 32 houses are on the board
- **THEN** no further house can be bought

### Requirement: Server-decided dice
Every die roll in Monopoly, including rolls to leave jail and for utility rent, SHALL be made by the server, and a request SHALL NOT supply or influence a roll.

#### Scenario: Forced roll
- **WHEN** a roll request carries a die value
- **THEN** the value is ignored and the server's own roll is applied

### Requirement: Each action belongs to one player
The server SHALL accept an action only from the seat of the player whose decision it is: rolling, the pending purchase, tax, rent, debt, card and jail exit by the player concerned; a trade proposal by the proposer and a trade response by its recipient; auction bids and passes by the active bidder; mortgages, buying and selling improvements by the owner during their own management stage.

#### Scenario: Another seat rolls
- **WHEN** a seat that is not the current player sends a roll
- **THEN** the action is rejected and the game is unchanged

#### Scenario: Someone else answers a trade
- **WHEN** a seat other than the trade's recipient accepts it
- **THEN** the action is rejected

#### Scenario: Not the active bidder
- **WHEN** a seat that is not the auction's active bidder bids
- **THEN** the action is rejected

### Requirement: Host controls local and computer seats
The host SHALL act for local seats it added, and computer players SHALL move only when the host requests a computer step.

#### Scenario: Local player rolls
- **WHEN** it is a local player's turn and the host sends a roll as that seat
- **THEN** the roll is applied

### Requirement: Trade expiry on the server clock
A pending trade SHALL expire when the server's clock passes its expiry time, and an expiry request made before then SHALL do nothing.

#### Scenario: Early expiry
- **WHEN** a client asks to expire a trade before its expiry time
- **THEN** the trade stays pending
