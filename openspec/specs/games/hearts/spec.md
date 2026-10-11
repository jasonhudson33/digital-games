# games/hearts Specification

## Purpose
Defines Hearts in Classic (3–4 players) and Killer (5–8 players) variants, played in a server-authoritative room where the host adds computer players in the lobby.

## Requirements

### Requirement: Variants and player counts
Classic Hearts SHALL allow three or four players with one deck, and Killer Hearts SHALL allow five to eight players with two decks.

#### Scenario: Five players Classic
- **WHEN** Classic is chosen with five players
- **THEN** it is rejected

### Requirement: Passing
Classic rounds SHALL pass three cards left, right, then across (four players only), then hold, in rotation; Killer Hearts SHALL NOT pass.

#### Scenario: Three players
- **WHEN** Classic is played with three players
- **THEN** the cycle is left, right, hold

### Requirement: Opening play
The 2♣ holder SHALL lead and MUST play it on the first trick, and a hearts lead SHALL NOT be allowed until hearts have been played unless the hand holds only hearts.

#### Scenario: Heart lead before broken
- **WHEN** hearts are unbroken and a player holds a non-heart
- **THEN** leading a heart is illegal

### Requirement: First-trick damage
A player who cannot follow suit on the first trick SHALL NOT play a heart or the queen of spades if they hold a card without points.

#### Scenario: Void on first trick
- **WHEN** a void player holds a club-free hand with a non-point card
- **THEN** discarding a heart is illegal

### Requirement: Penalty points
Each heart SHALL score 1 and the queen of spades 13, a round SHALL distribute 26 points in Classic and 52 in Killer, and the trick winner SHALL take the trick's points.

#### Scenario: Killer total
- **WHEN** a Killer round is fully scored
- **THEN** the penalties total 52

### Requirement: Match end
The match SHALL end when a player reaches 100 points, and the lowest score SHALL win.

#### Scenario: Reaching 100
- **WHEN** a player's total reaches 100
- **THEN** the match ends and the lowest total wins

### Requirement: Killer cancellation
In Killer Hearts, identical lead-suit cards SHALL cancel when deciding the trick winner, and a trick where every lead card cancels SHALL carry over.

#### Scenario: Duplicate high card
- **WHEN** two identical highest lead-suit cards are played
- **THEN** they cancel and the next highest wins
