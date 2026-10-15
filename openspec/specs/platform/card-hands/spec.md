# platform/card-hands Specification

## Purpose

Defines how every game orders and lays out the cards in a player's hand, so hands read the same across games and are fully visible without scrolling.

## Requirements

### Requirement: Lowest first, Ace high
In every game that deals ranked playing cards, a hand SHALL show the lowest card first and the Ace as the highest card, with ranks running from the lowest up to Ace.

#### Scenario: Hearts hand
- **WHEN** a Hearts player holds A, 2 and K of the same suit
- **THEN** the hand shows 2, K, A in that order within the suit

#### Scenario: Seven-Up and Hand & Foot
- **WHEN** a 7-Up or Hand & Foot player holds an Ace and a King of the same suit
- **THEN** the King is shown before the Ace

### Requirement: Hands grouped by suit
A hand SHALL be grouped by suit, with a stable suit order in each game, and ranks ordered low to high within each suit.

#### Scenario: Mixed suits
- **WHEN** a player holds cards from several suits
- **THEN** each suit's cards sit together, and the same suits appear in the same order on every deal

### Requirement: Scum groups by number
In Scum, a hand SHALL be grouped by rank, lowest rank first, with cards of equal rank adjacent and suit used only to order them within the group.

#### Scenario: Pairs together
- **WHEN** a Scum player holds two Kings, a 5 and an Ace
- **THEN** the hand shows the 5, then both Kings together, then the Ace

### Requirement: Game-specific strength order
A game whose card strength differs from the standard order SHALL show its hand in that game's strength order, lowest first.

#### Scenario: Pinochle hand
- **WHEN** a Pinochle player holds A, 10, K, Q, J and 9 of one suit
- **THEN** they appear as 9, J, Q, K, 10, A

#### Scenario: Wild cards in Hand & Foot and Five Crowns
- **WHEN** a hand holds jokers and 2s
- **THEN** jokers come first, then 2s, then the remaining cards from 3 up to Ace

### Requirement: Order is display only
Showing a hand in this order SHALL NOT change the cards held, the rules, or what other players see.

#### Scenario: Same cards, new order
- **WHEN** a hand is shown in the new order
- **THEN** it holds exactly the same cards as before and play is judged on the real hand

### Requirement: Hands fit without sideways scrolling
A hand SHALL fit within the width of its container without sideways scrolling at any supported viewport width, including 320px.

#### Scenario: Thirteen cards on a phone
- **WHEN** a player holds thirteen cards on a 320px-wide screen
- **THEN** every card can be seen and chosen without scrolling the hand sideways

### Requirement: Cards overlap only when needed
Cards in a hand SHALL sit at normal spacing while they fit, and SHALL overlap more as the hand grows, so the overlap is the least that makes the hand fit.

#### Scenario: Small hand
- **WHEN** a hand has few enough cards to fit side by side
- **THEN** the cards do not overlap

#### Scenario: Large hand
- **WHEN** a hand has more cards than fit side by side
- **THEN** the cards overlap just enough to fit the container

### Requirement: Card values stay visible
When cards overlap, each card's rank and suit SHALL remain visible, and the order of overlap SHALL leave the earlier card's corner showing.

#### Scenario: Reading an overlapped hand
- **WHEN** a hand is overlapped
- **THEN** a player can read every card's rank and suit without moving it

### Requirement: Selection stays clear
A selected card SHALL be raised and drawn on top of its neighbours, and a card that cannot be played SHALL be distinguishable from one that can.

#### Scenario: Choosing an overlapped card
- **WHEN** a player selects a card in an overlapped hand
- **THEN** that card lifts above its neighbours and shows in full

### Requirement: Touch targets stay usable
In an overlapped hand, every card SHALL keep a tap target that a finger can reach, with the target at least 24px wide.

#### Scenario: Tapping the narrowest card
- **WHEN** the hand is at its tightest overlap on a 320px screen
- **THEN** each card still has at least 24px of its own tappable width

#### Scenario: Too many cards for one row
- **WHEN** a hand would need cards narrower than 24px of visible width to fit one row
- **THEN** the hand continues on a second row rather than overlapping further or scrolling
