# Tasks

## 1. Structure checks

- [x] 1.1 Add `data-layout` attributes (`landing`, `entry`, `lobby`, `game-bar`, `dialog`) to the existing shared components in `components/ui/table-shell.js` and verify UNO still renders them (`npm run audit:mobile -- --games uno`)
- [x] 1.2 Extend `scripts/mobile-audit.mjs` to check each game shows a landing entry, lobby, game bar and Rules dialog, with an explicit allowlist of unmigrated games, and verify it passes with every game allowlisted and fails when UNO is removed from the allowlist and its bar is hidden
- [x] 1.3 Add a unit test for the allowlist logic (`tests/`) and verify `npm test` passes

## 2. Generalize the shared components

- [x] 2.1 Move felt-specific parts (seat rail, hand zone) out of `components/ui/table-shell.js` into `seated-table.js` and verify UNO, DOS and 7-Up audit clean at all three viewports
- [x] 2.2 Document the theme contract (the existing tokens a game overrides, plus `--tbl-hue`) at the top of `app/table.css`, and verify no colour in the shared landing, entry, lobby, game bar or dialog styles is hardcoded outside overlays and shadows
- [x] 2.3 Add a `Landing` component with `hero`, `rules` and `localPlay` slots wrapping `EntryCard`, and verify it renders with and without local play in a test
- [x] 2.4 Add `options` and `seatNote` slots to `Lobby` and `actions` to `GameHeader`, and verify with a render test that slot content appears alongside the common content
- [x] 2.5 Replace `ChoiceModal`/`RoundModal` internals with one `Dialog` built on `useDialog` (focus trap, Escape, focus return) and verify with a test that Escape closes it and returns focus
- [x] 2.6 Document the component contract and theme variables in the README and verify the documented usage matches a migrated game

## 3. Prove the approach on simple games

- [x] 3.1 Migrate flip-7 to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games flip-7` and `npm run validate` pass
- [x] 3.2 Migrate no-thanks to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games no-thanks` and `npm run validate` pass
- [x] 3.3 Migrate qwirkle to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games qwirkle` and `npm run validate` pass


## 4. Games already on the shared shell, and Hearts and 7-Up rooms

- [x] 4.1 Migrate uno to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games uno` and `npm run validate` pass
- [x] 4.2 Migrate dos to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games dos` and `npm run validate` pass

- [x] 4.3 Add Hearts engine-backed rooms: `lib/hearts-engine-room.js`, room adapter and store, `/api/hearts/rooms` routes, a client room service, host-managed computer seats, the variant chosen in the lobby, and private pass selection exchanged only when every seat has chosen, and verify with new engine-room tests (seat views hide other hands, a four-seat Classic and a five-seat Killer start, a pass waits for the last seat, a non-host `computerStep` is rejected) alongside the existing `tests/hearts-rules.test.mjs`
- [x] 4.4 Move the Hearts client onto `useEngineRoom` and the shared landing, lobby, game bar and dialogs, delete its local-game setup screen and replaced CSS, remove it from the allowlist and `NO_LOBBY`, and verify `npm run audit:mobile -- --games hearts` and `npm run validate` pass
- [x] 4.5 Port 7-Up rooms to the engine-backed model: `lib/seven-up-engine-room.js`, adapter and store, `/api/seven-up/rooms` routes, host-managed computer seats and a three-to-seven seat start, and verify with new engine-room tests (seat views hide other hands, host adds and removes computers, a two-seat start is rejected, an old-format room reports that it predates an update) and a rewritten `tests/seven-up-rooms.test.mjs`
- [x] 4.6 Move the 7-Up client onto `useEngineRoom` and the shared landing, lobby, game bar and dialogs, add the Rules dialog it lacks, delete its local mode, seat-type setup and replaced CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games seven-up` and `npm run validate` pass
- [x] 4.7 Retire the 7-Up seat-claiming code (`lib/rooms.js`, `lib/room-store.js` if unused, and the generic `/api/create-room`, `join-room`, `start-room`, `room`, `play-card`, `pass-turn`, `add-computer`, `remove-computer` routes) once nothing imports them, and verify `npm run check` passes
- [x] 4.8 Remove the unused `localPlay` option from `Landing` and `EntryCard` and its tests, update the Purpose lines of `openspec/specs/games/hearts/spec.md`, `openspec/specs/games/seven-up/spec.md` and `openspec/specs/platform/server-authoritative-rooms/spec.md` to describe room play, and update the README's room-storage section, and verify `npm test` and the README match

## 5. Games with light custom lobbies

- [x] 5.1 Migrate sequence to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games sequence` and `npm run validate` pass
- [x] 5.2 Migrate splendor to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games splendor` and `npm run validate` pass
- [x] 5.3 Migrate spyrium to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games spyrium` and `npm run validate` pass
- [x] 5.4 Migrate stratego to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games stratego` and `npm run validate` pass
- [x] 5.5 Migrate five-crowns to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games five-crowns` and `npm run validate` pass
- [x] 5.6 Migrate life to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games life` and `npm run validate` pass
- [x] 5.7 Migrate dominion to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games dominion` and `npm run validate` pass
- [x] 5.8 Migrate bang to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games bang` and `npm run validate` pass
- [x] 5.9 Migrate cover-your-assets to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games cover-your-assets` and `npm run validate` pass
- [x] 5.10 Migrate viticulture to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games viticulture` and `npm run validate` pass
- [x] 5.11 Migrate ticket-to-ride to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games ticket-to-ride` and `npm run validate` pass
- [x] 5.12 Migrate phase-10 to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games phase-10` and `npm run validate` pass


## 6. Games with heavy custom lobbies or flows

- [x] 6.1 Migrate catan to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games catan` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.2 Migrate risk to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games risk` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.3 Migrate scum to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games scum` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.4 Migrate secret-hitler to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games secret-hitler` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.5 Migrate skull-king to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games skull-king` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.6 Migrate hand-and-foot to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games hand-and-foot` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.7 Migrate killer-bunnies to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games killer-bunnies` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)
- [x] 6.8 Migrate pinochle to the shared landing, lobby, game bar and dialog, delete its replaced markup and CSS, remove it from the allowlist, and verify `npm run audit:mobile -- --games pinochle` and `npm run validate` pass (game-specific lobby controls move into the lobby `options` slot)


## 7. Mafia and Monopoly

- [x] 7.1 Render Mafia's landing, lobby, game bar and dialogs through the shared components while keeping its Supabase transport, and verify `npm run audit:mobile -- --games mafia` and `npm test` pass
- [x] 7.2 Render Monopoly's landing, lobby, game bar and dialogs through the shared components without changing the board, and verify `npm run audit:mobile -- --games monopoly` and `npm run test:monopoly` pass

## 8. Finish

- [x] 8.1 Confirm the audit allowlist is empty, make the structure check a hard failure, and verify `npm run audit:mobile` reports no failures at 390x844, 320x568 and 844x390
- [x] 8.2 Run `npm run check` (tests, typecheck, validate, build) and verify it passes
