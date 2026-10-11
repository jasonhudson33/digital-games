# Tasks

## 1. Route theme scoping

- [x] 1.1 Add a client component in `app/layout.js` that sets `document.documentElement.dataset.route` from `usePathname()` (first path segment, empty on the landing) in a layout effect
- [x] 1.2 Add an inline head script that sets the same attribute from `location.pathname` before first paint
- [x] 1.3 Update the comment in `app/tokens.css` that says route CSS only loads on its own route, and keep the `:root` defaults
- [x] 1.4 Move the `--route-*` block in each of the 22 game stylesheets that set it on `:root` from `:root` to `html[data-route="<slug>"]`, keeping values unchanged
- [x] 1.5 Add a check in `scripts/validate-frontend.mjs` that fails when a game stylesheet sets `--route-*` on a bare `:root`
- [x] 1.6 Test: open Skull King, return to the landing, and confirm the landing text and ground match a fresh load; repeat for Spyrium and Mafia and in dark mode

## 2. Hand display order

- [x] 2.1 Create `lib/hand-order.js` with a per-game table of suit order, rank strength, wild-first rule and grouping mode
- [x] 2.2 Add tests in `tests/` for Ace-high suit-grouped order, Scum rank grouping, Pinochle strength order, and jokers and 2s first in Hand & Foot and Five Crowns
- [x] 2.3 Use the helper when rendering the hand in Hearts, Scum, Pinochle, 7-Up, Hand & Foot, Five Crowns and Skull King
- [x] 2.4 Confirm the engines, bots and stored snapshots are unchanged (existing rules and engine-room tests pass)

## 3. Shared hand layout

- [x] 3.1 Add the `.tbl-fan` styles to `app/table.css` and a `CardFan` component: container query width, `--n` and `--card-w` overlap, wrap fallback below the visible-width minimum with end-padding reserve, raised selected card, isolated slots, filter-based disabled styling
- [x] 3.2 Render each hand through `CardFan`, which sets `--n` from the card count
- [x] 3.3 Move Hearts, Scum, Pinochle, 7-Up, Hand & Foot, Five Crowns and Skull King onto the fan and remove their `overflow-x: auto`, flex sizing and horizontal padding on the hand
- [x] 3.4 Move Sequence, Phase 10, UNO, DOS, Dominion and Killer Bunnies hands onto the same layout, keeping their card order (Dominion shows 60px of each card, Killer Bunnies wraps without overlap)
- [x] 3.5 Check each game at 320px with a full hand: no sideways scroll, ranks readable, selected card clear, each card at least 24px tappable
- [x] 3.6 Extend `scripts/mobile-audit.mjs` to flag a hand that scrolls sideways, has a card outside its box, or shows under 24px of a card; add `tests/card-fan.test.mjs` as a static guard for every hand

## 4. Verify

- [x] 4.1 Run `npm run check`
- [x] 4.2 Walk through the landing and each game once on a phone-width and a desktop viewport (mobile audit over every game at 390px; the 13 hand games at 320px and 1280px)
