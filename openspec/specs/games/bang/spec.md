# games/bang Specification

## Purpose
Defines BANG! for four to seven players: hidden roles, character abilities, and a bound that ends games that cannot finish.

## Requirements

### Requirement: Player range and roles
BANG! SHALL require four to seven players and SHALL deal roles by table size: 4 = Sheriff, Renegade, 2 Outlaws; 5 adds a Deputy; 6 adds an Outlaw; 7 adds a second Deputy.

#### Scenario: Seven players
- **WHEN** seven players start
- **THEN** roles are one Sheriff, two Deputies, three Outlaws and one Renegade

### Requirement: Characters and lives
Each player SHALL receive a distinct character drawn from sixteen, the Sheriff SHALL have one extra life, and each player SHALL start with a hand equal to their starting lives.

#### Scenario: Sheriff lives
- **WHEN** the Sheriff's character has 4 lives
- **THEN** the Sheriff starts with 5 lives and 5 cards

#### Scenario: Three-life character
- **WHEN** Paul Regret or El Gringo is assigned to a non-Sheriff
- **THEN** that player starts with three lives and three cards

### Requirement: Turn order
The Sheriff SHALL take the first turn, and play SHALL then pass clockwise skipping eliminated players.

#### Scenario: Eliminated neighbor
- **WHEN** the next seat is eliminated
- **THEN** the turn passes to the next living seat

### Requirement: Winning
The Sheriff and Deputies SHALL win when every Outlaw and the Renegade are eliminated, the Outlaws SHALL win when the Sheriff is eliminated, and the Renegade SHALL win by being the last survivor.

#### Scenario: Renegade alone
- **WHEN** only the Renegade remains alive
- **THEN** the Renegade wins

### Requirement: Stalemate draw
A game SHALL end in a draw when 60 consecutive turns pass with no change in who is alive or any living player's lives.

#### Scenario: Unbreakable position
- **WHEN** 60 turns pass with no life lost
- **THEN** the game ends as a draw among the survivors

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
