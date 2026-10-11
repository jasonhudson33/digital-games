# Proposal

## Why

The collection does not offer Camel Up, a group-friendly racing and betting game that fits the existing online-room and computer-player model. Adding the complete second-edition game broadens the board-game catalogue while exercising the shared layout and server-authoritative room architecture with public racing state and private finish bets.

## What Changes

- Add Camel Up (Second Edition) for three to eight human or computer players, including the five racing camels, two counter-running crazy camels, stacking, spectator tiles, leg bets, pyramid actions, secret overall winner and loser bets, leg scoring, final scoring, and partnerships in games with six or more players.
- Add a server-authoritative Camel Up room whose server chooses setup and dice randomness, validates every action, and hides each player's unplayed and placed finish-card choices from other seats until final scoring.
- Add Camel Up to the game catalogue, hub filters, route metadata, shared create/join lobby flow, mobile audit, and project documentation.
- Render the landing, lobby, game bar, rules, and results through the shared game-layout components while giving the racetrack and betting table a Camel Up-specific responsive presentation.
- Add pure rules tests and engine-room tests for movement, stacking, spectator tiles, scoring, hidden information, action validation, and computer turns.

## Capabilities

### New Capabilities
- `games/camel-up`: Defines the complete Camel Up second-edition race, betting actions, scoring, hidden finish bets, partnerships, and room play for three to eight players.

### Modified Capabilities
- `platform/game-catalog`: Increases the shipped game catalogue from 29 to 30 games and requires Camel Up's verified player range and supported modes to appear through the shared catalogue.
- `platform/server-authoritative-rooms`: Applies per-viewer hidden-state projection and server-owned randomness to Camel Up's finish bets, setup, pyramid draws, and dice rolls.

## Impact

- New Camel Up rules, engine-room adapter, room store, API routes, browser room service, client, route, styles, context document, and tests.
- `lib/games.js`, the README game inventory, mobile layout auditing, and the main OpenSpec game-catalog and server-room documentation after the change is archived.
- Depends on the shared components being completed by the in-progress `uniform-game-layout` change; Camel Up will use that contract from its first implementation and will not be added to the unmigrated-game allowlist.
- No new runtime dependency, database table, or client-side authority is introduced; Camel Up uses the existing shared Supabase room storage and engine-room APIs.
