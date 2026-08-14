# Splendor Context

## Purpose

Splendor is a 2–4 player, turn-based engine-building game. Players share a gem bank, three development markets, and a row of nobles while keeping their reserved developments private in the interface. A room may mix human players and computer merchants.

## Rules boundary

`lib/splendor.js` owns setup, the classic 90-card development distribution, token actions, the ten-token limit, reservations, gold wilds, purchases and permanent bonuses, noble visits, final-round timing, tie-breaking, and computer decisions. UI code submits actions to that engine and does not duplicate legality rules.

## Room boundary

`components/splendor-room-service.js` provides compare-and-set room updates, local caching, broadcast/poll subscriptions, and five-character room codes. `lib/splendor-room-store.js` stores rooms in the shared server-side Supabase table in production and an isolated in-memory namespace during local development.

## User interface

`components/splendor-client.js` owns the landing page, lobby seats, computer controls, shared market, private tableau, token returns, noble choice, results, and the concise rules drawer. `app/splendor/splendor.css` contains the responsive Renaissance trading-house presentation.
