# Spec Delta

## ADDED Requirements

### Requirement: Phone table fits one screen
On viewports up to 560px wide, the Scum table during play SHALL fit the visible screen without vertical page scrolling. It SHALL show every opponent's name or initial, card count and passed or finished state, the last-play message, the pile, the player's whole hand, and the Pass and Play controls at the same time. Opponents beyond the screen width SHALL scroll sideways within their own strip.

#### Scenario: Your turn on a phone
- **WHEN** it is the player's turn at a 4-player table on a 390x844 screen
- **THEN** the opponents, the last-play message, the pile, the hand and the Pass and Play buttons are all visible without scrolling the page

#### Scenario: Twenty seats on a phone
- **WHEN** a 20-player table is shown on a 390x844 screen and the player holds 17 cards
- **THEN** the page does not scroll, the opponent strip scrolls sideways, and every card in the hand can be read and tapped

#### Scenario: Desktop unchanged
- **WHEN** the table is shown wider than 560px
- **THEN** the existing layout is used

### Requirement: Turn alert
When it becomes the player's turn to play, or the player must choose cards to trade, the game SHALL play a short sound while the page is visible and SHALL also vibrate on devices that support it. Each alert SHALL fire once per turn, not on every refresh of the same turn.

#### Scenario: Turn arrives
- **WHEN** the turn passes to the player
- **THEN** one chime plays

#### Scenario: Same turn refreshed
- **WHEN** the room refreshes while it is still the same turn
- **THEN** no further chime plays

#### Scenario: Trade choice
- **WHEN** a new round starts and the player must choose cards to give
- **THEN** one chime plays

### Requirement: Sound control
The game bar SHALL offer a control to turn the turn sound off and on, and the choice SHALL be remembered in that browser. Sound SHALL be on by default.

#### Scenario: Muted
- **WHEN** the player turns sound off and the turn later passes to them
- **THEN** no chime plays, and the choice is still off after reloading
