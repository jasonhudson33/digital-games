# Spec Delta

## ADDED Requirements

### Requirement: Seat survives reloads
An online game SHALL remember a player's seat in persistent browser storage, keyed by room code, so that reloading the page or returning after the browser discards a sleeping tab puts the player back in the same seat.

#### Scenario: Phone sleeps mid-game
- **WHEN** a player's browser discards the game tab while the device sleeps and the player reopens the room link
- **THEN** the player is back in their seat with their own hand

#### Scenario: Seat saved by an older version
- **WHEN** a seat token exists only in session storage from before this change
- **THEN** it is used and moved to persistent storage

### Requirement: Seat kept through temporary failures
A saved seat SHALL be forgotten only when the server reports that the room no longer exists or the seat token is not valid, or when the player leaves. Any other failure SHALL keep the seat, tell the player the game is reconnecting, and retry automatically until it succeeds.

#### Scenario: Network not back yet
- **WHEN** the first load after waking fails with a network error
- **THEN** the seat is kept, a reconnecting message is shown, and the game loads once the network returns

#### Scenario: Room expired
- **WHEN** the load reports that the room is not found
- **THEN** the saved seat is forgotten and the player sees the game's landing page

#### Scenario: Player leaves
- **WHEN** the player chooses Leave
- **THEN** the saved seat for that room is forgotten

### Requirement: Rejoin with the room code
When a player joins with a room code for which they already hold a valid seat, the game SHALL return them to that seat instead of joining them as a new player, including after the game has started.

#### Scenario: Typed code after being booted
- **WHEN** a player whose Scum game has started enters its room code and taps Join on the same browser
- **THEN** they return to their existing seat rather than seeing "That game has already started."
