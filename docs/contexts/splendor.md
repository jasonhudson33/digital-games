# Splendor Context

## Purpose

Splendor is a 2–4 player, turn-based engine-building game. Players share a gem bank, three development markets, and a row of nobles while keeping their reserved developments private in the interface. A room may mix human players and computer merchants.

## Rules boundary

`lib/splendor.js` owns setup, the classic 90-card development distribution, token actions, the ten-token limit, reservations, gold wilds, purchases and permanent bonuses, noble visits, final-round timing, tie-breaking, and computer decisions. UI code submits actions to that engine and does not duplicate legality rules.

## Room boundary

The rules run on the server (`lib/splendor-room-adapter.js` over `lib/splendor.js`): a seat sends named actions and receives only its own view. Other seats' reserved developments are counts and the three face-down decks are counts; the markets, bank, nobles and tableaux are public. A card reserved from the market is public in the physical game, but the engine does not record where a reservation came from, so all of another seat's reservations are hidden. The host's browser asks for each computer turn with one `computerStep`. `lib/splendor-room-store.js` stores rooms in the shared server-side Supabase table in production and an isolated in-memory namespace during local development.

## User interface

`components/splendor-client.js` owns the landing page, lobby seats, computer controls, shared market, private tableau, token returns, noble choice, results, and the concise rules drawer. `app/splendor/splendor.css` contains the responsive Renaissance trading-house presentation.
