# Spec Delta

## ADDED Requirements

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
