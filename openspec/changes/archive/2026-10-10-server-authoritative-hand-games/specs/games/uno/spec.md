# Spec Delta

## ADDED Requirements

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
