# Design

## Context

When the detectives agree, the host in `App.tsx` stores a private `DetectiveResult` (target id, killer flag) per detective, speaks the angel narration, then changes the phase to `NIGHT_ANGEL`. `NightPhase.tsx` loads the result by polling and shows an inline banner only while the phase is `NIGHT_DETECTIVE`, so it disappears with the phase change. Acknowledgement-style messages already exist as round-scoped "ready" intents (used at role reveal), and the intent type column is restricted to `ready`, `night` and `day`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- A persistent popup naming the checked player.
- The host holds the angel step until human detectives acknowledge, with a host escape hatch.

**Non-Goals:**
- Showing results to anyone other than detectives, or a history of past checks.
- Waiting on non-detective roles.
- A timeout that moves on automatically.

## Decisions

- **A `detectivePending` flag in room state** is set when detectives reach agreement. The phase stays `NIGHT_DETECTIVE` while it is set; the host effect advances when it is clear. Alternative: a new phase. Rejected because many screens and the night narration key off the existing phases.
- **Acknowledgements are "ready" intents under an offset round key** (the same trick the day vote uses for runoffs), so they cannot collide with the role-reveal ready intents for the same round and need no migration or new intent type. Round intents for that key are cleared when the step finishes.
- **The host effect** watches acknowledgements and advances when every living human detective has one; computer detectives are excluded from the required set. A small pure helper in `NightRules.ts` returns the detectives still pending, which also drives the host's "n of m ready" count and is unit-tested.
- **Continue sets the same outcome as full acknowledgement** by clearing `detectivePending` through `hostUpdateState`, so there is one advance path. It uses the existing host check, so an eliminated host still has it.
- **The popup replaces the inline banner** and is driven by the stored result plus a local "dismissed" state per round. A reload before dismissing shows it again, because the result is still stored and the acknowledgement has not been sent.
- **Result persistence:** the stored detective result stays available after the phase moves on, so a detective who dismissed late (via host Continue) can still see it until they tap OK.

## Risks / Trade-offs

- An idle detective stalls night → mitigated by the host Continue button and visible ready count.
- A detective who disconnects mid-popup keeps the table waiting → same mitigation; host can also rely on the existing absence handling that turns long-absent players into computers.
- The intent-type check could reject the offset-round ready intents if later validation is added → verify the existing `mafia_submit_intent` accepts it before relying on it; if not, a small migration is needed and this design must be updated.
- A late acknowledgement arriving after the host continued → ignored because the round key is cleared and the flag is already clear.
