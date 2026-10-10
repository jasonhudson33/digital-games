# Spec Delta

## ADDED Requirements

### Requirement: BANG! hidden information
BANG! SHALL be played with its rules on the server, and each seat's view SHALL show its own role and hand, other seats' hand sizes (as face-down placeholders), the draw pile size, and other seats' roles only for the Sheriff, eliminated players and after the game ends.

#### Scenario: Outlaw's view
- **WHEN** an Outlaw reads a started game
- **THEN** the Sheriff's role is shown and other living seats' roles are hidden

#### Scenario: Hand sizes
- **WHEN** a seat reads a started game
- **THEN** other seats' hands appear as that many face-down placeholders with no card contents, and the draw pile is a count

### Requirement: Equipment and characters stay public
Cards on a player's table (equipment, weapon, jail, dynamite) and each player's character SHALL be visible to every seat.

#### Scenario: Equipment
- **WHEN** a seat plays a Barrel
- **THEN** every seat's view shows it on that player's table
