# Phase 10 Context

## Purpose

Phase 10 provides the classic ten-phase rummy race for two to six human or computer players in a shared room.

## Model

- `lib/phase-10.js` owns the 108-card deck, ten ordered phase definitions, Wild and Skip rules, laying phases, hitting, round scoring, advancement, tiebreakers, and computer policy.
- Every player receives ten cards and independently attempts their current phase. Completing a phase advances only that player after the round.
- A player may hit any laid phase only after laying their own phase in that round.
- Only cards remaining in hand score: 1-9 score 5, 10-12 score 10, Skip scores 15, and Wild scores 25.
- Rooms support two to six seats and may be filled with computer players.

## Boundaries

- `components/phase-10-client.js` renders private hands and translates player choices into pure engine actions.
- `components/phase-10-room-service.js` uses the shared optimistic room service.
- `lib/phase-10-room-store.js` persists room state through the shared server room store.
