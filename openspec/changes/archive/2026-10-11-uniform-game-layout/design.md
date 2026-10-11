# Design

## Context

- `components/ui/table-shell.js` already exports `EntryCard`, `Lobby`, `GameHeader`, `ChoiceModal` and `RoundModal`. UNO, DOS and 7-Up use them; Hearts, Pinochle, Skull King and Phase 10 use parts. Its own comment names it "the direction the rest of the games should move toward."
- Room behaviour is mostly shared already: `lib/use-engine-room.js` drives create, join, poll and computer turns for the engine-room games. Games that do their own room handling are Catan, Risk, Scum, Secret Hitler, Skull King, Hand and Foot, Killer Bunnies, Pinochle, 7-Up, Hearts (local), Mafia (Supabase RPC) and Monopoly (separate `monopoly/` sub-project).
- The `tbl-` classes assume a felt table (seat rail, hand zone). Boards, tile games and worker-placement games need the same landing, lobby, bar and dialog without those.
- `components/dialog-focus.js` (`DialogFocusManager`) and `lib/use-dialog.js` already handle focus trapping and Escape; about 18 clients still write their own `role="dialog"` markup.
- Each game's theme lives in its own stylesheet (7-27 colour variables, up to four fonts).

See proposal.md for motivation and specs/platform/game-layout/spec.md for the contract.

## Goals / Non-Goals

**Goals:**
- One implementation of the landing, lobby, game bar and dialog, used by every game, with the structure, wording and behaviour in the spec.
- A game supplies content (hero, lobby options, bar actions, dialog bodies) and theme tokens, never structure.
- Migration is incremental: every step leaves all games working and the build green.

**Non-Goals:**
- Changing game rules, room APIs, storage or the database.
- Redesigning in-game boards, hands or tables; only the surrounding page structure is unified.
- A single visual design language. Per-game identity stays.

## Decisions

**1. Grow `components/ui` rather than start over.** Keep the existing exports as the base and generalize them; move the felt-specific parts (seat rail, hand zone) out of the shell into `seated-table`. *Alternative:* a new layout package. Rejected: it would leave two systems while UNO, DOS and 7-Up migrate, and the existing components already encode decisions worth keeping.

**2. Components take content through named slots, not flags.** `Landing` takes `hero`, `rules`, and optional `localPlay`; `Lobby` takes `options` (game-specific controls) and `seatNote`; `GameBar` takes `actions`. Per-game variation goes in a slot. *Alternative:* boolean and enum props per variation. Rejected: Catan expansions, Killer Bunnies decks and Viticulture's flow would each add props that no other game uses.

**3. Theme through the existing design tokens.** The shared landing, entry card, lobby, game bar and dialog already read the global tokens in `app/tokens.css` (`--accent`, `--on-accent`, `--accent-soft`, `--surface`, `--ink`, `--font-display`, `--r-lg`) plus `--tbl-hue`/`--tbl-accent-hue` for the hero. A game themes them by overriding those tokens on its own root class, and its stylesheet drops its own button, panel and field rules. *Alternative:* a new `--game-*` variable set. Rejected: it would duplicate the tokens and leave two palettes to keep in sync.

**4. Every game is a room game; Hearts and 7-Up are ported to it.** Playing alone means creating a room and adding computers, as in the other 25 games, so the landing has no local-play option and no second layout. Hearts (today one browser, no rooms) and 7-Up (today pre-configured seats claimed by whoever opens the code) move onto the engine-backed pattern the other games use: a `*-engine-room` module over the existing rules in `lib/hearts.js` and `lib/game.js`, a room adapter and store, and `/api/<game>/rooms` routes. The host adds and removes computers in the lobby. *Alternative:* keep a local mode as a landing option. Rejected: it keeps two flows to build, test and explain, which is the inconsistency this change removes. Mafia keeps its Supabase transport but renders through the same components.

**5. One dialog.** The shared dialog wraps `useDialog`/`DialogFocusManager` and replaces hand-written dialog markup. In-game prompts (Catan trades, Skull King abilities, Killer Bunnies choices) use the same dialog with a different body.

**6. Verify structure, not just size.** `scripts/mobile-audit.mjs` already walks landing, room and game for every game. Add structure checks keyed to stable `data-` attributes on the shared components (`data-layout="landing|entry|lobby|game-bar|dialog"`), so a game that bypasses the shared components fails the audit rather than relying on class names.

**7. Order of migration: shell first, then simplest games.** Generalize the shell and add the audit checks (failing for unmigrated games, listed in an explicit allowlist that shrinks to empty). Prove with Flip 7, No Thanks and Qwirkle, then UNO/DOS/7-Up onto the generalized shell, then the rest grouped by how much custom lobby they have.

## Risks / Trade-offs

- [Large diff across 29 games] → one game per commit-sized task, build and audit green after each; the allowlist makes remaining work visible.
- [A shared lobby loses a game's special flow, e.g. Viticulture's vineyard or Killer Bunnies' deck choice] → those controls move into the `options` slot, not away.
- [Games lose character if too much of the page becomes shared] → theme tokens plus a game-supplied hero keep identity; review each migrated landing visually before removing the old markup.
- [Hearts' rules are written for one browser, where the human's passes and computer logic run together] → the engine room asks each seat for its pass privately and exchanges only when every seat has chosen; computers choose on the host's `computerStep` like every other engine-backed game, and the rules module is covered by its existing tests before the room is built on it.
- [Retiring 7-Up's seat-claiming rooms leaves in-progress rooms stranded] → the same rule other ported games follow: a room in the old format is not resumed and the player is told to start a new one.
- [Mafia and Monopoly sit outside the main app structure] → migrate the page chrome only; their data transport and the Monopoly board are untouched.
- [Deleting per-game CSS could break rules the game still uses] → remove selectors only after the audit and a screenshot comparison show the replacement works.

## Migration Plan

1. Add `data-layout` attributes and structure checks to the audit with an allowlist of every game not yet migrated.
2. Generalize the shell components and theme variables; keep UNO, DOS and 7-Up working unchanged.
3. Port Hearts and 7-Up to engine-backed rooms (server first, with tests), then migrate games in batches, removing each from the allowlist and deleting its replaced markup and CSS.
4. When the allowlist is empty, make the structure check a hard failure and document the contract in the README.

No data migration beyond the two ported games: rooms stored in 7-Up's old format are not resumed, and Hearts had no stored rooms. Rollback is reverting a game's commit, since each game migrates independently.

