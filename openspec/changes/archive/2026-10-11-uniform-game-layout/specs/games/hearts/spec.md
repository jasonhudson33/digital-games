# Spec Delta

## ADDED Requirements

### Requirement: Online rooms
Hearts SHALL be played in a server-authoritative room that a host creates and other players join by five-character code, and the host SHALL be able to add and remove computer players in the lobby.

#### Scenario: Solo with computers
- **WHEN** a player creates a Hearts room and adds computers up to the variant's minimum
- **THEN** the host can start the game with only one human seat

#### Scenario: Guest joins
- **WHEN** another player enters the room code
- **THEN** that player takes the next open seat and appears in the lobby

### Requirement: Variant chosen in the lobby
The host SHALL choose Classic or Killer in the lobby, and the room SHALL NOT start with a player count the chosen variant does not allow.

#### Scenario: Killer with four players
- **WHEN** the host selects Killer with four seats filled
- **THEN** the game does not start and the lobby says Killer needs five to eight players

#### Scenario: Classic with five players
- **WHEN** the host selects Classic with five seats filled
- **THEN** the game does not start and the lobby says Classic needs three or four players

### Requirement: Private hands in rooms
A seat's view of a Hearts room SHALL contain only that seat's own cards and passed cards, with other seats shown as card counts, until cards are played to a trick.

#### Scenario: Opponent hand
- **WHEN** a seat loads a started Hearts room
- **THEN** the payload holds that seat's hand and only counts for the other seats

### Requirement: Passing in rooms
In Classic rounds with a pass, every seat SHALL choose its three cards privately, and the passes SHALL be exchanged only once every seat, including computer seats, has chosen.

#### Scenario: Waiting for a pass
- **WHEN** three of four seats have chosen cards to pass
- **THEN** no cards move and the table shows who is still choosing
