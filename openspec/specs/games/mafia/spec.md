# games/mafia Specification

## Purpose
Defines Mafia's hidden-role night and day game for five or more players, with no upper limit.

## Requirements

### Requirement: Player range
A room SHALL require at least five players and SHALL NOT impose a maximum, including for computer seats.

#### Scenario: Four players
- **WHEN** the host starts with four players
- **THEN** the start is rejected

#### Scenario: Large table
- **WHEN** more than twenty players are in the lobby
- **THEN** more players and computers can still be added

### Requirement: Narrated phases
Play SHALL alternate night and day phases, with narration and canonical transitions driven by the acting host. Room and privacy rules are in `platform/mafia-rooms`.

#### Scenario: Night to day
- **WHEN** all night intents are in and the result is acknowledged
- **THEN** the day phase begins

### Requirement: Replay
Players SHALL be able to start a new game in the same room after one ends.

#### Scenario: Replay
- **WHEN** a game is over and the host chooses replay
- **THEN** roles are reassigned privately for a new game

### Requirement: Trial ballot reveal
When every living player has voted on a trial, the game SHALL reveal to all players, including eliminated ones, which candidate each voter chose. Individual choices SHALL NOT be shown in the interface before the last vote is in.

#### Scenario: Verdict reveal
- **WHEN** all living players have voted and one candidate has the most votes
- **THEN** the verdict screen lists each candidate with the names of the players who voted for them

#### Scenario: Votes hidden while voting
- **WHEN** some living players have not yet voted
- **THEN** other players see vote progress but not who voted for whom

#### Scenario: Eliminated viewer
- **WHEN** an eliminated player watches a trial
- **THEN** they see the same ballot reveal as living players

### Requirement: Tie ballot reveal
A tied trial vote SHALL also reveal its ballots. A tie in the first vote SHALL show its ballots on the runoff screen, and a tied runoff SHALL end the trial on a results screen with the ballots and no elimination.

#### Scenario: First vote ties
- **WHEN** the first vote is tied between candidates
- **THEN** the runoff screen shows who voted for each tied candidate

#### Scenario: Runoff ties
- **WHEN** the runoff vote is also tied
- **THEN** a results screen shows the ballots and states that no one is eliminated, and night begins after the result is acknowledged
