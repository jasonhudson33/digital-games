# Spyrium Context

## Purpose

Spyrium owns a six-round Victorian industrial strategy game for two to five human or computer players. Its key domain rule is a shared 3×3 card market where workers occupy the twelve gaps between cards: congestion both increases activation prices and creates withdrawal income.

## Model

- The `lib/spyrium.js` rules module owns the period decks, event deck, market topology, placement and activation phases, neighborhoods, techniques, milestones, computer policy, and final scoring.
- A player independently switches from Placement to Activation and cannot switch back during that round.
- Market-card activation is priced from the card, all other workers adjacent to it, and any new building-space cost.
- Character cards remain in the market after use; buildings and techniques leave it for the activating player's tableau.
- Rooms support two to five seats and may be filled with computer industrialists.

## Boundaries

- `components/spyrium-client.js` renders the game and translates deliberate player choices into pure rules actions.
- `components/spyrium-room-service.js` coordinates optimistic browser updates with the game-specific API route.
- `lib/spyrium-room-store.js` provides server-side persistence using the shared room-store adapter.
- Other game contexts must not import Spyrium rules or card data.
