# Design

## Context

The host's auto-resolve effect in `App.tsx` fires when `dayVotes` has one entry per living player, then resolves after a 1.2s pause, writes the `voteReveal` ballots, and clears `dayVotes`. `DayPhase.tsx` renders the voting screen and the reveal from `voteReveal.ballots`. Host duty is held by the first player, alive or not. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One resolution path for complete and early-finished votes.
- Idle players are visible in the reveal.

**Non-Goals:**
- Automatic early finish when a lead can't be beaten, or a voting timer.
- A confirmation dialog or undo.
- Letting non-host players finish voting.

## Decisions

- **A `voteClosed` flag in room state.** The button sets it through `hostUpdateState`; the existing effect fires on "all voted or `voteClosed`". Verdict, runoff, tie, the 1.2s pause and intent clearing then stay in one place. Alternative: a separate resolve function called from the button. Rejected because it duplicates the tie and runoff logic. The flag is cleared whenever a vote begins, a runoff begins, and when a vote resolves.
- **Late votes are blocked in two places.** The voting buttons are disabled while `voteClosed` is set, and the host ignores votes arriving after resolution because the round's intents are cleared. Votes already in `dayVotes` when the flag is set are the ones counted.
- **`voteReveal` gains `nonVoterIds`**, computed at resolution from living players at that moment minus those in the ballots, so the reveal shows idle players even though they are alive at vote time and the victim is marked dead afterwards.
- **Button availability** follows the acting host and at least one cast vote, shown as "Finish Voting (n of m voted)". It uses the existing host check, so an eliminated first player keeps it.
- **No confirmation.** One tap on the host's own device after seeing the count.

## Risks / Trade-offs

- Accidental tap ends voting early → count is shown on the button; accepted for v1, a confirm is a small follow-up.
- A vote arriving in the same moment as the tap may or may not count → ballots in room state when the host effect runs are the ones used; acceptable.
- Existing rooms without the new fields → state defaults treat them as not closed and no non-voters.
