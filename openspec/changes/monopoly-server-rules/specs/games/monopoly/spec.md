# Spec Delta

## ADDED Requirements

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
