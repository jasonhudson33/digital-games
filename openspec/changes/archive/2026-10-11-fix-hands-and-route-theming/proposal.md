# Proposal

## Why

Two visual problems make the games harder to use. Going back to the landing page after a dark game such as Skull King leaves white text on a white or dark ground that is hard to read, because the game's theme stays in force. And in-game hands are inconsistent: most sort low to high (so Ace lands last in Hearts and Scum, but first in 7-Up and Hand & Foot), and nearly every hand sits in a single row that scrolls sideways, so players must scroll to see all their cards.

## What Changes

- Route theme values (`--route-surface`, `--route-ink`, `--route-muted`, `--route-line`, `--route-chip`) stop being declared on `:root` in 22 game stylesheets. Each game applies them under `html[data-route="<slug>"]`, and the root layout sets that attribute from the current route, so a game's colours never outlast its page. `tokens.css` keeps the defaults the landing and token-driven games inherit.
- Every card hand shows Ace high and the lowest card last, grouped by suit with ranks running Ace down to lowest inside each suit. Scum groups by number instead (highest rank first, suit as a tiebreaker). Pinochle keeps its own strength order (A, 10, K, Q, J, 9). Hand & Foot and Five Crowns put jokers and 2s first as the high wilds, then Ace down to 3.
- Card order is a display concern: one shared client-side helper orders each hand for display, and the game engines and stored room state are untouched.
- Hands share one layout. Cards sit at normal spacing while they fit, then overlap by a negative margin that grows with the card count, with each card's rank corner left visible and the selected card lifted. A hand never needs sideways scrolling.

## Capabilities

### New Capabilities
- `platform/route-theming`: a game's colour theme applies only on that game's route, and the landing and shared pages read the same on arrival, however the player got there.
- `platform/card-hands`: the order and layout every game uses to show a player's hand of cards.

### Modified Capabilities
<!-- None. No existing spec states hand order or route theme scoping. -->

## Impact

- `app/layout.js`, `app/tokens.css`, and the 22 stylesheets under `app/*/` that set `--route-*` on `:root`.
- A new shared hand-order helper (`lib/hand-order.js`), a `CardFan` component and the `.tbl-fan` layout in `app/table.css`, used by `components/*-client.js` for Hearts, Scum, Pinochle, 7-Up, Hand & Foot, Five Crowns, Skull King, Sequence, Phase 10, UNO, DOS, Dominion and Killer Bunnies. Games whose hands are not rank-ordered cards (Sequence, Phase 10, UNO, DOS, Dominion, Killer Bunnies) adopt the shared layout only, and keep their own card order.
- Tests under `tests/` for the helper and for the route attribute, plus the existing layout checks in `tests/layout-check.test.mjs` and `scripts/validate-frontend.mjs`.
- No change to game rules, server state or APIs.
