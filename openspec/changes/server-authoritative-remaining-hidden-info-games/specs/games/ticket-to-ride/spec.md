# Spec Delta

## ADDED Requirements

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
