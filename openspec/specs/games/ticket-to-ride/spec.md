# games/ticket-to-ride Specification

## Purpose
Defines Ticket to Ride on the USA map for two to five players with computer opponents.

## Requirements

### Requirement: Trains and scoring
Each player SHALL start with 45 trains and route length SHALL score 1, 2, 4, 7, 10 and 15 points for lengths 1 through 6.

#### Scenario: Length four
- **WHEN** a player claims a four-train route
- **THEN** they score 7

### Requirement: Final round
When a player is left with two or fewer trains the game SHALL give every player one more turn before final scoring.

#### Scenario: Final turns
- **WHEN** a player ends a turn with two or fewer trains
- **THEN** each player takes one more turn and the game then finishes

### Requirement: Destination tickets
A destination ticket whose cities are connected by the player's routes SHALL add its value at the end, and an unconnected ticket SHALL subtract it.

#### Scenario: Failed ticket
- **WHEN** a ticket is not connected at game end
- **THEN** its value is subtracted

### Requirement: Longest route
The player with the longest continuous route SHALL receive a 10-point bonus, shared by ties, and the highest total SHALL win.

#### Scenario: Tied longest
- **WHEN** two players tie for the longest route
- **THEN** both receive 10 points

### Requirement: Ticket to Ride hidden information
Ticket to Ride SHALL be played with its rules on the server, and each seat's view SHALL show its own train cards, destination tickets and pending ticket choice, other seats' card and ticket counts, the face-up cards, the map and claimed routes, and the train deck, destination deck and discard pile as counts only.

#### Scenario: Opponent hand and tickets
- **WHEN** a seat reads a started game
- **THEN** other seats' train cards and destination tickets are empty with counts and every deck is a count

### Requirement: Tickets revealed when the game ends
When the game finishes, every seat's destination tickets SHALL be visible to every seat together with whether each was completed.

#### Scenario: Final scoring
- **WHEN** the game is finished
- **THEN** each seat's view lists every player's tickets

### Requirement: Claims and draws checked on the server
Drawing cards, claiming a route with a payment color and choosing destination tickets SHALL be validated on the server against the acting seat's real cards and offered tickets, and drawn cards SHALL come from the server's decks.

#### Scenario: Missing payment cards
- **WHEN** a seat claims a route with cards it does not hold
- **THEN** the claim is rejected
