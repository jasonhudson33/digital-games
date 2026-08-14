# Qwirkle Context

## Purpose

Qwirkle is a room-based tile game for 2–4 players. Rooms can mix human players and computer opponents. Players build one shared, unbounded grid from private six-tile racks and race for the highest score.

## Rules boundary

`lib/qwirkle.js` owns the 108-tile bag, opening-player selection, line validation, multi-tile turns, scoring, exchanges, rack refills, end-game bonus, winners, and computer turns. A line contains either one color with distinct shapes or one shape with distinct colors. Lines may not exceed six tiles. UI code stages placements locally, but the rules library validates the complete move again before it enters shared room state.

## Room boundary

`components/qwirkle-room-service.js` provides compare-and-set room updates, local caching, broadcast/poll subscriptions, and five-character room codes. `lib/qwirkle-room-store.js` stores rooms in the shared server-side table in production and an isolated in-memory namespace during local development.

## User interface

`components/qwirkle-client.js` owns the landing page, 2–4 seat lobby, host computer controls, expandable grid, staged multi-tile turns, exchange selection, scores, results, and rules dialog. `app/qwirkle/qwirkle.css` provides the responsive dark-tile presentation.
