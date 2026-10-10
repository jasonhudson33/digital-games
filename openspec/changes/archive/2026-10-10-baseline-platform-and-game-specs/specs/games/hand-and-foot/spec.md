# Spec Delta

## Purpose

Defines partnership Hand and Foot for an even number of four to sixteen players, with hidden foots and seven-card books.

## ADDED Requirements

### Requirement: Player range
A game SHALL require an even number of players from four to sixteen, formed into two-player partnerships.

#### Scenario: Odd table
- **WHEN** the host starts with five players
- **THEN** the start is rejected

### Requirement: Hand then foot
Each player SHALL hold a hand and a hidden foot, and SHALL pick up the foot after emptying the hand.

#### Scenario: Hand emptied
- **WHEN** a player plays their last hand card
- **THEN** the foot becomes their active cards

### Requirement: Shared melds, private cards
Partners SHALL share melds and books but SHALL NOT see each other's private cards, except that a player's client MAY be told whether their partner's foot holds a 3.

#### Scenario: Partner view
- **WHEN** a player views the table
- **THEN** their partner's hand and foot cards are hidden

### Requirement: Opening requirements
Round point requirements to open melds SHALL be 50, 90, 120 and 150 for the four rounds.

#### Scenario: Round two
- **WHEN** a team opens in round 2
- **THEN** its laid points must reach 90

### Requirement: Going out
A player in their foot SHALL NOT go out unless their partner has reached their own foot and holds no 3 in it; the player MUST keep at least two foot cards while blocked.

#### Scenario: Partner in hand
- **WHEN** a player tries to go out while their partner is still in their hand
- **THEN** the action is rejected

### Requirement: Books
A meld of seven or more cards SHALL be a book and SHALL earn a bonus by its natural and wild composition.

#### Scenario: Seven-card meld
- **WHEN** a meld reaches seven cards
- **THEN** it counts as a book for the bonus
