# Design

## Context

`RoleReveal.tsx` renders the card and role as soon as the phase opens, with an acknowledge button below. `selectActingHostId` in `SessionCoordinator.ts` filters to living, non-left players, prefers the host-flagged player when present, and otherwise picks the first present one. Narration audio plays only on the acting host's device (`App.tsx`), and every phase-advance button is gated on being host, not on being alive. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Card hidden until an explicit local reveal step.
- Host selection independent of alive/dead status, with deterministic seat-order fallback.

**Non-Goals:**
- Hiding cards on night or day screens, or letting players re-peek after acknowledging.
- A separate narrator-only seat or new host controls for night.
- Changing who can read other players' roles; the acting host's device already subscribes to all roles and keeps doing so.

## Decisions

- **Reveal state is local React state in `RoleReveal`**, initially hidden, set by the button. Nothing syncs. A device that reloads mid-phase shows the hidden state again, which is the safe default. Alternative: store revealed in room state. Rejected as needless and it would leak a sync lag.
- **Candidate order is the host-flagged player first, then remaining players in `players` array order**, excluding `hasLeft`. The first candidate who is present wins. Alive status is not considered. Alternative: prefer living fallbacks. Rejected because the user asked for seat order and dead players already work as host in the UI.
- **Presence still gates selection.** When presence is not yet ready, pick the first candidate, matching today's behavior. The 5-minute `PRESENCE_TIMEOUT_MS` is unchanged.
- **When nobody is present**, fall back to the first candidate rather than none, so the game never has no host.
- **Host returns automatically** because selection is recomputed from presence on every render; no handoff state is stored. Audio on the returning device needs the existing one-tap unlock.

- **The database repeats the host rule and must change too.** `mafia_acting_host_id` decides who passes `mafia_host_token_valid`, which guards every host RPC. A new migration drops its living-player filter and keeps the host-first, seat-order, presence and left/revoked checks, so client and server agree. Alternative: client-only change. Rejected because an eliminated host would be rejected by every host call. The migration must be applied to Supabase before the client change ships.

## Risks / Trade-offs

- Client and database host rules disagreeing during rollout → apply the migration first; the old client rule is a subset of the new server rule for living hosts, so the order is safe.

- A dead host keeps all roles in memory on their device → already true for any acting host; no new exposure beyond who holds it.
- Eliminated host's presence heartbeat might stop if the app skips it for dead players → verify presence is written regardless of alive status; fix if not.
- Host handoff on absence moves audio to a device that has not unlocked it → host-only audio unlock already runs on first tap; narration may stay silent until that player taps.
- Host elimination screens for night show the dead spectator view → acceptable since night advances without host input.
