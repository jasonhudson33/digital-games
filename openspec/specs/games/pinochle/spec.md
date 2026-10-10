# games/pinochle Specification

## Purpose
Defines Pinochle for two to six players: auction, meld, trump and tricks, with partnership and individual variants.

## Requirements

### Requirement: Variants by player count
Two players SHALL play Draw Pinochle with no auction, three SHALL play Cutthroat, four and six SHALL play Partnership, and five SHALL use a calling partner.

#### Scenario: Two players
- **WHEN** two players start
- **THEN** there is no auction and the turned stock card sets trump

### Requirement: Contract
The auction winner SHALL name trump, and a bidding side that misses its contract SHALL lose the value of the bid.

#### Scenario: Set contract
- **WHEN** meld plus tricks fall short of the bid
- **THEN** the bid amount is subtracted from that side's score

### Requirement: Trick play
Players MUST follow suit, head the trick when able, and trump or overtrump when void.

#### Scenario: Void in lead suit
- **WHEN** a player is void and holds trump
- **THEN** a non-trump discard is illegal

### Requirement: Hidden calling partner
A five-player calling partner SHALL stay hidden from others until they play their jack of trump.

#### Scenario: Other seats' view
- **WHEN** a non-partner views the table before the jack is played
- **THEN** the calling partner is not identified
