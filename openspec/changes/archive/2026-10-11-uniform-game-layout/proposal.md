# Proposal

## Why

Twenty-nine games each build their own landing page, create/join form, room lobby, in-game header and rules dialog. Only UNO, DOS and 7-Up (and parts of Hearts, Pinochle, Skull King and Phase 10) use the shared `tbl` shell in `components/ui/table-shell.js`. The rest duplicate the same structure in their own markup and stylesheet, so one fix has to be repeated per game: the iOS input-zoom rule, a grid column that overflowed on a phone, tiny text, and a "who won the trick" message all had to be found and fixed game by game. Players also meet a different create/join flow, room-code field and Leave button in every game.

## What Changes

- Define a layout contract that every game must meet: a landing with a room-creation entry, a lobby, a game bar, and its own dialogs, all built from shared components.
- Generalize the shared `tbl` shell so it is not tied to the felt table: boards (Catan, Risk, Monopoly), tile games (Qwirkle, Splendor) and worker-placement games get the same landing, lobby, game bar and dialog with game-specific content supplied through named slots.
- Per-game identity (palette, fonts, hero art) stays; it is passed in as theme tokens, not by re-implementing the structure.
- Migrate all games to the shared components, including Mafia (Supabase RPC rooms) and Monopoly (separate sub-project).
- **BREAKING:** Hearts and 7-Up become ordinary server-authoritative room games. Hearts, today a one-browser game against computers with no rooms, gains create/join rooms. 7-Up, today a room where seats are pre-configured and claimed by whoever opens the code, moves to the standard model: the host creates the room, adds or removes computers in the lobby, and others join by code. Neither game keeps a separate local mode; playing alone means creating a room and adding computers. Rooms created before the change are not resumed.
- Delete the per-game landing, lobby, header and dialog markup and CSS that the shared components replace.
- Extend `npm run audit:mobile` so a game missing its landing entry, lobby, game bar or dialog fails the audit.

## Capabilities

### New Capabilities
- `platform/game-layout`: what every game's landing, lobby, game bar and dialogs must provide, the behaviour they share, and how a game supplies its own content and theme.

### Modified Capabilities
- `games/hearts`: adds online rooms and the host-managed computer seats Hearts lacked; Classic and Killer are chosen in the lobby.
- `games/seven-up`: seats are added by the host (people join, computers are added in the lobby) instead of being configured at creation and claimed by whoever opens the code.

## Impact

- `components/ui/*` (new shared landing, lobby, game bar, dialog, results), `app/table.css` and `app/tokens.css` (shared styles and theme tokens).
- All 29 `components/*-client.js` files and the matching `app/<game>/*.css` files; `monopoly/src/*`.
- `scripts/mobile-audit.mjs` (structure checks) and the README.
- Hearts and 7-Up: new engine-backed room modules, stores and `/api/hearts/rooms` and `/api/seven-up/rooms` routes in the pattern of the other engine-backed games; the 7-Up seat-claiming room code and its generic `/api/*-room` routes are retired.
- No change to any other game's rules, room APIs, storage or the database. Players see the same games with a consistent landing, lobby and game bar.
