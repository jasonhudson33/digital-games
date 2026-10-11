# Spec Delta

## MODIFIED Requirements

### Requirement: Per-viewer state
A response SHALL contain only what the requesting seat is allowed to see, so other players' hands and hidden roles are never sent.

#### Scenario: Opponent hand
- **WHEN** seat A loads a Scum room
- **THEN** the payload contains A's cards and only card counts for other seats

#### Scenario: Camel Up finish bet
- **WHEN** a seat loads a Camel Up room before final scoring
- **THEN** another player's finish bet reveals its owner, order and target deck but not the camel named by the card

### Requirement: Randomness chosen by the server
Every die roll, spin, shuffle and draw in an engine-backed game SHALL be chosen by the server, and a request SHALL NOT be able to supply or influence the result.

#### Scenario: Client-supplied result
- **WHEN** a request carries a number, roll or random source alongside a move
- **THEN** the server ignores it and uses its own

#### Scenario: Camel Up pyramid action
- **WHEN** a player takes a pyramid ticket
- **THEN** the server chooses the remaining die and its face without accepting either value from the player's request
