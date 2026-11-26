# Spec Delta

## ADDED Requirements

### Requirement: Host finishes voting
During a trial or runoff vote, the acting host SHALL be able to finish voting once at least one vote has been cast, resolving it with the ballots cast so far. Players who have not voted SHALL NOT be able to vote afterwards.

#### Scenario: Finish with votes in
- **WHEN** the host finishes voting after some but not all living players have voted
- **THEN** the vote resolves using the ballots cast, with the usual verdict, runoff or tie outcome

#### Scenario: No votes yet
- **WHEN** no votes have been cast
- **THEN** the finish voting control is not available

#### Scenario: Late vote
- **WHEN** a player tries to vote after the host has finished voting
- **THEN** their vote is not counted

#### Scenario: Eliminated host
- **WHEN** the host has been eliminated
- **THEN** they can still finish voting

#### Scenario: Other players
- **WHEN** a player who is not the acting host views a vote
- **THEN** no finish voting control is shown

## MODIFIED Requirements

### Requirement: Trial ballot reveal
When voting on a trial ends, whether every living player has voted or the host finished it early, the game SHALL reveal to all players, including eliminated ones, which candidate each voter chose and which living players did not vote. Individual choices SHALL NOT be shown in the interface before voting ends.

#### Scenario: Verdict reveal
- **WHEN** voting ends and one candidate has the most votes
- **THEN** the verdict screen lists each candidate with the names of the players who voted for them

#### Scenario: Votes hidden while voting
- **WHEN** some living players have not yet voted and voting has not ended
- **THEN** other players see vote progress but not who voted for whom

#### Scenario: Eliminated viewer
- **WHEN** an eliminated player watches a trial
- **THEN** they see the same ballot reveal as living players

#### Scenario: Players who did not vote
- **WHEN** the host finishes voting before everyone has voted
- **THEN** the reveal also lists the living players who did not vote
