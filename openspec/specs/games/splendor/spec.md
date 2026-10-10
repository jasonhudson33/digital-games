# games/splendor Specification

## Purpose
Defines Splendor for two to four players with a shared gem bank and development markets.

## Requirements

### Requirement: Token limit
A player SHALL hold at most ten tokens and SHALL return the excess at turn end.

#### Scenario: Eleventh token
- **WHEN** a player ends with eleven tokens
- **THEN** they must return one

### Requirement: Setup
Each colored gem pile SHALL hold 4 tokens at two players, 5 at three and 7 at four, with 5 gold in every game.

#### Scenario: Two players
- **WHEN** a two-player game starts
- **THEN** each colored gem has 4 tokens

### Requirement: Reservations
A player SHALL hold at most three reserved developments, reserved cards SHALL be private, and gold SHALL stand in for any missing gem when buying.

#### Scenario: Fourth reservation
- **WHEN** a player with three reserved cards tries to reserve another
- **THEN** the action is rejected

### Requirement: Nobles and end
A noble SHALL visit a player who meets its bonus requirement, and when a player reaches 15 points the round SHALL finish so all players have equal turns before the winner is decided.

#### Scenario: Final round
- **WHEN** a player reaches 15 points
- **THEN** the remaining players in that round still take a turn

### Requirement: Splendor hidden information
Splendor SHALL be played with its rules on the server, and each seat's view SHALL show its own reserved developments, other seats' reserved counts, the three face-up markets, tokens, nobles and tableaux, and the three development decks as counts only.

#### Scenario: Opponent reservations
- **WHEN** a seat reads a started game
- **THEN** other seats' reserved developments are empty with a count and each deck is a count

### Requirement: Purchases and reservations checked on the server
A purchase, a reservation and a token action SHALL be validated on the server against the acting seat's real tokens, tableau and reserved developments.

#### Scenario: Unaffordable purchase
- **WHEN** a seat buys a development it cannot afford
- **THEN** the action is rejected
