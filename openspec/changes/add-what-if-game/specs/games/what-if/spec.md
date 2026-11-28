# Spec Delta

## Purpose

Defines What If, a party game for three to twenty players (people and computer players): everyone writes a "What if", each player draws one at random and answers it with a "Then", and the Thens are dealt back onto the What ifs at random for the table to read.

## ADDED Requirements

### Requirement: Players
A What If room SHALL seat three to twenty players, people and computers together, and the host SHALL NOT be able to start with fewer than three. The host SHALL be able to add and remove computer players in the lobby only.

#### Scenario: Too few
- **WHEN** the host tries to start with two players
- **THEN** the start is rejected

#### Scenario: One person and two computers
- **WHEN** the host adds two computer players and starts
- **THEN** the game starts with three players

### Requirement: Writing a What if
Each round SHALL begin with every player writing only a "What if" in a single text area, limited to 200 characters. A blank entry SHALL be refused, and a player SHALL be able to edit and resubmit until the step ends. The step SHALL end when every player has written one, or when the host continues with at least three written; players without one sit the round out.

#### Scenario: Blank What if
- **WHEN** a player submits an empty What if
- **THEN** it is refused

#### Scenario: Last What if in
- **WHEN** the last player submits their What if
- **THEN** the game moves to drawing

### Requirement: Drawing and writing a Then
When the What ifs are in, each player who wrote one SHALL be dealt one What if at random, every What if dealt exactly once, and a player MAY receive their own. Each player SHALL see the What if they drew, but not who wrote it, and write a "Then" for it in a single text area, limited to 200 characters. The step SHALL end when every drawer has written a Then, or when the host continues with at least three written; a What if whose drawer wrote no Then is left out.

#### Scenario: Own What if
- **WHEN** the random deal gives a player their own What if
- **THEN** they write the Then for it

#### Scenario: What the drawer sees
- **WHEN** a player is writing their Then
- **THEN** they see the text of the What if they drew and nothing that names its writer

### Requirement: Random matching
After the Thens are in, the game SHALL deal the Thens onto the answered What ifs at random, using each What if and each Then exactly once, and SHALL put the pairs in random order. A Then MAY land back on the What if it was written for.

#### Scenario: Three players
- **WHEN** three players finish writing their Thens
- **THEN** three pairs are made, each with one What if and one Then

### Requirement: Private until the reveal
Before a pair is revealed, a player's view SHALL NOT contain any other player's What if or Then, except the single What if that player drew.

#### Scenario: During the What if step
- **WHEN** Ana has written her What if and Ben views the room
- **THEN** Ben sees that Ana has written, and none of her text

### Requirement: Host-paced reveal
Every player SHALL see the same current pair, showing the What if, then the Then, then who wrote each. Only the host SHALL be able to advance, until every pair has been read. Pairs not yet reached SHALL NOT be sent to any player.

#### Scenario: Next pair
- **WHEN** the host chooses Next on pair 2 of 5
- **THEN** every player sees pair 3 of 5

#### Scenario: Unrevealed pairs stay hidden
- **WHEN** pair 2 of 5 is showing
- **THEN** no player's view contains the text of pairs 3 to 5

### Requirement: Computer writers
Computer players SHALL write their What if and their Then from a built-in bank of lines, one computer at a time at the room's computer speed, avoiding lines already used in that step while unused ones remain. Their entries SHALL count toward ending each step like a person's.

#### Scenario: Computers finish a step
- **WHEN** the only person has written and two computers have not
- **THEN** the computers write one after another and the step ends after the second

### Requirement: Play again
After the last pair has been read, the host SHALL be able to start a new round in the same room, beginning again with empty What ifs.

#### Scenario: New round
- **WHEN** the host chooses Play again
- **THEN** everyone returns to writing a What if with an empty box
