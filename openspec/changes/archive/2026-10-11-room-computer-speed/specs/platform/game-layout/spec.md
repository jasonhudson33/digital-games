# Spec Delta

## MODIFIED Requirements

### Requirement: Common lobby
Every game SHALL show a lobby after a room is created or joined, listing the room code with a copy action, the seated players, the host's add and remove computer controls, a Start action, and a Leave action. When the room has computer players, the lobby SHALL also offer the computer speed control to every seated player.

#### Scenario: Host in the lobby
- **WHEN** the host opens a new room
- **THEN** the lobby shows the room code, the host's seat, add-computer, Start and Leave

#### Scenario: Guest in the lobby
- **WHEN** a non-host player is in the lobby
- **THEN** Start and computer controls are not offered and the lobby says it is waiting for the host

#### Scenario: Speed control in the lobby
- **WHEN** the host has added a computer player and a guest looks at the lobby
- **THEN** the guest sees the computer speed control and can change it

### Requirement: Common game bar
Every game SHALL show a bar while a game is in progress with the game's name and room code or round, a Rules action, and a Leave action, and in a room that has computer players it SHALL also show the computer speed control. A game MAY add actions to the bar.

#### Scenario: Bar during play
- **WHEN** a game is in progress in any game
- **THEN** the bar shows the title, the round or room, Rules, and Leave

#### Scenario: Leaving a game
- **WHEN** a player chooses Leave
- **THEN** the player returns to that game's landing

#### Scenario: Speed control in the bar
- **WHEN** a game with a computer player is in progress
- **THEN** the bar shows the current computer speed and lets any seated player change it

#### Scenario: No computers
- **WHEN** a game with only human players is in progress
- **THEN** the bar shows no computer speed control
