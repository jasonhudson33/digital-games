# platform/computer-pacing Specification

## Purpose

Lets the people in a room decide how fast the computer players move, with one speed per room that every player sees, in every game that has computers.

## Requirements

### Requirement: Room computer speed
Each room SHALL have one computer speed, chosen from Fast (300ms), Normal (600ms), Slow (1000ms) and Very slow (1500ms), and a new room SHALL start at Normal.

#### Scenario: New room
- **WHEN** a room is created in any game
- **THEN** its computer speed is Normal, 600ms

#### Scenario: Room from before this setting
- **WHEN** a room saved without a computer speed is opened
- **THEN** its computer speed reads as Normal

### Requirement: Any seated human can change it
Any seated human player in a room SHALL be able to change the room's computer speed, in the lobby or during play, and a request from anyone not seated in the room SHALL be rejected.

#### Scenario: A guest slows the computers
- **WHEN** a non-host seated player chooses Slow
- **THEN** the room's computer speed becomes Slow for everyone

#### Scenario: Not seated
- **WHEN** a request to change the speed carries no valid seat
- **THEN** it is rejected and the speed is unchanged

### Requirement: Only listed speeds
The room SHALL accept only the four listed speeds, and any other value SHALL be rejected with the speed unchanged.

#### Scenario: Unlisted value
- **WHEN** a seat asks for 5ms or "fast-ish"
- **THEN** the request is rejected and the speed is unchanged

### Requirement: One speed for everyone, kept with the room
The computer speed SHALL be stored with the room and sent to every seat in its view, so every player sees the same value, and it SHALL survive a player leaving and rejoining.

#### Scenario: Seen by all
- **WHEN** one seat changes the speed
- **THEN** the other seats see the new value in their next view

#### Scenario: Rejoining
- **WHEN** a player reopens a room whose speed was changed
- **THEN** the control shows the changed speed

### Requirement: Shown only where there are computers
The speed control SHALL be offered only in a room that has computer players, and SHALL NOT appear in a room with none.

#### Scenario: Room with computers
- **WHEN** a room has at least one computer player
- **THEN** its lobby and game bar offer the speed control

#### Scenario: Room without computers
- **WHEN** a room has only human players
- **THEN** no speed control is shown

### Requirement: The host paces computers by the room's speed
The host's client SHALL wait the room's computer speed between computer moves, and SHALL use the value current at that moment, so a change takes effect on the next move.

#### Scenario: Normal pace
- **WHEN** a computer is due and the speed is Normal
- **THEN** the host's client requests that move about 600ms after the previous state arrived

#### Scenario: Changed mid-game
- **WHEN** a player changes the speed from Normal to Fast during play
- **THEN** the next computer move is requested after about 300ms

### Requirement: Computers move one move at a time in every game
In every game with computer players, the server SHALL apply one computer move per host request and SHALL NOT play several computer turns inside a human's action, so each computer move is a separate visible state.

#### Scenario: Human acts before computers
- **WHEN** a human in Skull King, Pinochle, Scum, Hand & Foot, Killer Bunnies or Secret Hitler completes their move and a computer is next
- **THEN** the response leaves the computer's move for a separate host request

#### Scenario: Only the host steps
- **WHEN** a non-host seat requests a computer move in any of those games
- **THEN** it is rejected

#### Scenario: Nothing due
- **WHEN** a computer move is requested and no computer is due
- **THEN** the room is unchanged

### Requirement: Computer due is part of the view
In the six games whose clients cannot infer it, the seat view SHALL say whether a computer is due to move, so the host's client steps only when there is something to do.

#### Scenario: Computer to act
- **WHEN** it is a computer's turn
- **THEN** the view marks a computer as due

#### Scenario: Human to act
- **WHEN** it is a human's turn
- **THEN** the view marks no computer as due
