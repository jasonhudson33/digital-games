# platform/game-layout Specification

## Purpose

Defines the page structure every game shares: a landing with a room entry, a lobby, an in-game bar and dialogs. Players meet the same flow and controls in every game, while each game keeps its own theme and content.

## Requirements

### Requirement: Common landing
Every game SHALL open on a landing that shows the game's name and a hero, and the same entry card for starting play: a name field, a create-room action, and a room-code field with a join action.

#### Scenario: Any game's landing
- **WHEN** a player opens any game's page
- **THEN** the landing offers a name field, "Create a room", and a room-code field with "Join" in the same order and wording

#### Scenario: Invalid room code
- **WHEN** a player joins with a code that has no room
- **THEN** the entry card shows the not-found message and no room is created

### Requirement: Rooms for every game
Every game SHALL be played through a room created or joined from the landing, and playing alone SHALL mean creating a room and adding computer players. No game SHALL offer a separate local mode or a different landing for it.

#### Scenario: Solo play
- **WHEN** a player opens any game, creates a room and adds computer players
- **THEN** the lobby starts the game with only that player at a human seat

#### Scenario: Hearts and 7-Up
- **WHEN** a player opens Hearts or 7-Up
- **THEN** the landing offers the same create and join entry as every other game and no separate local-play option

### Requirement: Common lobby
Every game SHALL show a lobby after a room is created or joined, listing the room code with a copy action, the seated players, the host's add and remove computer controls, a Start action, and a Leave action.

#### Scenario: Host in the lobby
- **WHEN** the host opens a new room
- **THEN** the lobby shows the room code, the host's seat, add-computer, Start and Leave

#### Scenario: Guest in the lobby
- **WHEN** a non-host player is in the lobby
- **THEN** Start and computer controls are not offered and the lobby says it is waiting for the host

### Requirement: Game-specific lobby options
A game SHALL be able to add its own options to the lobby, such as an expansion or variant picker, without replacing the common lobby content.

#### Scenario: Catan expansions
- **WHEN** the Catan host opens the lobby
- **THEN** the expansion picker appears alongside the room code, seats and Start

### Requirement: Common game bar
Every game SHALL show a bar while a game is in progress with the game's name and room code or round, a Rules action, and a Leave action. A game MAY add actions to the bar.

#### Scenario: Bar during play
- **WHEN** a game is in progress in any game
- **THEN** the bar shows the title, the round or room, Rules, and Leave

#### Scenario: Leaving a game
- **WHEN** a player chooses Leave
- **THEN** the player returns to that game's landing

### Requirement: Common dialogs
Every game SHALL present its rules, prompts and end-of-round or end-of-game results in the shared dialog, which traps focus while open, closes with Escape or a close control, and is not wider than the viewport.

#### Scenario: Open rules
- **WHEN** a player opens Rules from the bar
- **THEN** the shared dialog opens and focus moves into it

#### Scenario: Close with Escape
- **WHEN** a dialog is open and the player presses Escape
- **THEN** the dialog closes and focus returns to the control that opened it

#### Scenario: Round or game results
- **WHEN** a round or game ends
- **THEN** the results appear in the shared dialog naming the winner and showing scores

### Requirement: Theme without restructuring
A game SHALL set its look through theme values for colour, fonts and hero art, and SHALL NOT replace the structure, wording or behaviour of the shared landing, lobby, game bar or dialogs.

#### Scenario: Themed landing
- **WHEN** two games are compared
- **THEN** their landings differ in colour, type and hero art and match in structure and controls

### Requirement: Phone fit
The shared landing, lobby, game bar and dialogs SHALL fit a 320px-wide viewport without sideways page scroll, SHALL use text fields of at least 16px, and SHALL keep primary actions at least 44px tall.

#### Scenario: Narrow phone
- **WHEN** any game's landing, lobby or dialog is shown at 320px width
- **THEN** the page does not scroll sideways and its fields and primary actions meet the sizes above

### Requirement: Layout verification
The project SHALL include an automated check that fails when a game lacks a landing entry, lobby, game bar or Rules dialog.

#### Scenario: Missing game bar
- **WHEN** the check runs and a game shows no game bar during play
- **THEN** the check fails and names the game
