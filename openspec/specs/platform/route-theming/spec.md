# platform/route-theming Specification

## Purpose

Keeps a game's colour theme on that game's own page, so the landing and other shared pages always read clearly however the player arrived.

## Requirements

### Requirement: Theme limited to its route
A game's page colours (ground, text, muted text, lines and chips) SHALL apply only while that game's page is shown, and SHALL NOT remain in force after the player navigates to another page.

#### Scenario: Back to the landing from a dark game
- **WHEN** a player opens Skull King and then returns to the landing without reloading the page
- **THEN** the landing shows the same ground and text colours as on a fresh load

#### Scenario: Game to game
- **WHEN** a player moves from one game's page directly to another's
- **THEN** the second game shows only its own colours, with nothing carried over from the first

### Requirement: Readable text on every page
On every page, text SHALL be drawn in a colour that contrasts with the page ground it sits on, in light and in dark display modes.

#### Scenario: Landing after a dark game
- **WHEN** the landing is shown after any game
- **THEN** its headings, filter chips and game tiles have text that contrasts with the ground behind them

#### Scenario: Game pinned to a light ground
- **WHEN** a game that uses a light ground is opened while the device is in dark mode
- **THEN** its text stays dark on that ground

### Requirement: Theme applied before first paint
A page SHALL show its theme colours when it first appears, without a visible flash of another page's or the default colours.

#### Scenario: Direct load of a dark game
- **WHEN** a player loads a dark game's address directly
- **THEN** the page appears on the game's ground from the first paint, not on the default ground
