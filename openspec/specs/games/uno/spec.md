# games/uno Specification

## Purpose
Defines UNO for two to ten players, Classic or UNO Flip, first to 500 points.

## Requirements

### Requirement: Classic deck
Classic UNO SHALL use 108 cards: 76 numbers, 24 colored actions, 4 Wilds and 4 Wild Draw Fours.

#### Scenario: New round
- **WHEN** a Classic round is dealt
- **THEN** the deck has 108 cards

### Requirement: Draw voluntarily
A player who draws SHALL be restricted to playing the drawn card for the rest of that turn.

#### Scenario: Play another card
- **WHEN** a player draws and then tries to play a different card
- **THEN** the play is rejected

### Requirement: Wild Draw Four challenge
The victim of a Wild Draw Four SHALL be able to challenge, and a successful or failed challenge SHALL apply the official card outcome.

#### Scenario: Successful challenge
- **WHEN** the player had a matching-color card
- **THEN** the player who played it draws four

### Requirement: UNO call
A missed UNO call SHALL be catchable until the next player acts and SHALL cost two cards.

#### Scenario: Caught
- **WHEN** a player has one card without calling and is caught in time
- **THEN** they draw two

### Requirement: UNO Flip
Playing FLIP SHALL reverse the draw and discard piles and expose the opposite side of every card, and scoring SHALL use the side showing at round end.

#### Scenario: Flip
- **WHEN** FLIP is played
- **THEN** the newly exposed discard controls the next match

### Requirement: Scoring
Round winners SHALL score opponents' cards and the first to 500 SHALL win.

#### Scenario: Reach 500
- **WHEN** a winner's total reaches 500
- **THEN** the match ends

### Requirement: UNO hidden information
UNO SHALL be played with its rules on the server, and each seat's view SHALL show only its own hand, other seats' card counts, the top discard and the draw pile count.

#### Scenario: Opponent hand
- **WHEN** seat A reads a started UNO room
- **THEN** every other seat's hand is empty with a card count

### Requirement: Wild Draw Four legality hidden
Whether a Wild Draw Four was played legally SHALL NOT be sent to the victim before they choose to accept or challenge, and SHALL be revealed only by the challenge outcome.

#### Scenario: Pending Draw Four
- **WHEN** the victim reads the room with a Wild Draw Four pending
- **THEN** the view contains the pending penalty but not whether it was legal

### Requirement: UNO Flip hidden faces
In UNO Flip, a seat's view SHALL show discarded and held cards only on their currently active face, and SHALL NOT show the opposite face of the discard pile or draw pile.

#### Scenario: Light side showing
- **WHEN** the light side is active
- **THEN** discard cards in the view carry no dark-side face

### Requirement: Computer step pacing
UNO computer moves SHALL be applied one per host `computerStep`, preserving the delay between computer moves.

#### Scenario: Two computers in a row
- **WHEN** two computers are due to act
- **THEN** the host posts two separate steps
