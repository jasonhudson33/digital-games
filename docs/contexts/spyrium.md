# Spyrium Context

## Purpose

Spyrium owns a six-round Victorian industrial strategy game for two to five human or computer players. Its key domain rule is a shared 3×3 card market where workers occupy the twelve gaps between cards: congestion both increases activation prices and creates withdrawal income.

## Model

- The `lib/spyrium.js` rules module owns the period decks, event deck, market topology, placement and activation phases, neighborhoods, techniques, milestones, computer policy, and final scoring.
- A player independently switches from Placement to Activation and cannot switch back during that round.
- Market-card activation is priced from the card, all other workers adjacent to it, and any new building-space cost.
- Period A supplies three nine-card markets, Period B supplies two, and all nine Period C cards make up the final market; three A cards and two B cards remain unused.
- The residence track pays 2, 3, 4, 5, then 7, with no 6 space.
- When a market card leaves, workers attached to it remain in place and inherit adjacency to live cards bordering the newly empty market region.
- Character cards remain in the market after use; buildings and techniques leave it for the activating player's tableau.
- Rooms support two to five seats and may be filled with computer industrialists.

## Boundaries

- `components/spyrium-client.js` renders the game and translates deliberate player choices into pure rules actions.
- `lib/spyrium-room-adapter.js` runs the rules module on the server behind the shared engine room. A seat sends named actions and receives only its own view: the three period decks and every event beyond the next one are counts, while the market, workers, tableaux, the current event and the next event are public. Activation and event options are filtered to a fixed set of keys before they reach the rules.
- `components/spyrium-room-service.js` is the engine room service; the host's browser asks for each computer turn with one `computerStep`.
- `lib/spyrium-room-store.js` provides server-side persistence using the shared room-store adapter.
- Other game contexts must not import Spyrium rules or card data.
