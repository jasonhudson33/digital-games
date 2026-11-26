# Tasks

## 1. Hidden card at game start

- [ ] 1.1 In `RoleReveal.tsx`, hide the card and role until a "Reveal my card" button is tapped, then show them with the "I Understand" button; verify manually that nothing about the role shows before the tap and that acknowledging hides the card again
- [ ] 1.2 Verify a reload during the role phase returns to the hidden state and that the other players' ready count and the host's "Begin Night" button still work

## 2. Main device as host

- [x] 2.1 Change `selectActingHostId` in `SessionCoordinator.ts` to order candidates host-first then seat order, exclude only players who left, and ignore alive status; verify with updated cases in `tests/mafia-session-coordinator.test.mjs` (dead host stays host, absent host falls to player two, then three, host returns, nobody present falls back to the first candidate, presence not ready)
- [x] 2.2 Replace the existing "fails over only to a recently present living player" test with the new cases and verify `node --experimental-strip-types --test tests/*.test.mjs` passes
- [ ] 2.3 Add a Supabase migration redefining `mafia_acting_host_id` with host-first then seat order, no living-player filter, still excluding players who left or were revoked and still requiring presence within 5 minutes; verify by reading the migration against `20260801020000_mafia_permanent_leave.sql` and, once applied to Supabase, that an eliminated first player's host calls succeed
- [x] 2.4 Check `App.tsx` for places that assume the acting host is alive (host effects, audio unlock, presence heartbeat for eliminated players) and fix any found; verify with `npm run typecheck`
- [ ] 2.5 Play through with computer seats: eliminate the first player and verify narration audio, Call Vote, Skip, acknowledge-result and replay all still work on their device

## 3. Spec and integration

- [ ] 3.1 Run `openspec validate mafia-main-device-and-card-reveal --strict` and the full test and typecheck commands, and verify all pass
