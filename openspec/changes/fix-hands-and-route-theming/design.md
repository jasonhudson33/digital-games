# Design

## Context

See proposal.md for motivation. Observed state of the code:

- `app/tokens.css` defaults `--route-surface`, `--route-ink`, `--route-muted`, `--route-line` and `--route-chip` on `:root`. 24 game stylesheets override them on `:root` too. The comment in `tokens.css` assumes "route CSS only loads on its own route", but Next.js keeps a route's stylesheet loaded after a client-side navigation, so the override outlives the game. `body` and `SiteHeader` read these variables, while the landing's own components read `--ink`, `--surface` and `--muted`. That mismatch is the unreadable text.
- Hand order lives in each game's engine: `sortHeartHand`, `sortScumHand`, `sortPinochleCards`, `sortHandFootCards`, `compareCards` in `lib/game.js` (7-Up), `sortSkullKingHand`, plus Phase 10's `cardOrder` in its client. Ace is 14 in Hearts and Scum, 1 in 7-Up and Hand & Foot, and the top of Pinochle's strength list. Five Crowns and Sequence do not sort.
- Hands render as flex rows with `overflow-x: auto` (`.tbl-hand`, `.fc-hand`, `.dom-hand`, `.kb-hand`, plus per-game classes), each with its own card size.
- `tests/layout-check.test.mjs` and `scripts/validate-frontend.mjs` already check the layout and parse every stylesheet.

## Goals / Non-Goals

**Goals:**
- A game's theme cannot outlive its page, and a new game cannot reintroduce the leak by accident.
- One definition of display order per game, one hand layout for all.
- No change to engines, stored rooms or APIs.

**Non-Goals:**
- Redesigning the landing's look, or changing any game's palette.
- Sorting hands that are not ranked playing cards (UNO, DOS, Phase 10, Sequence, Dominion, Killer Bunnies keep their order) beyond giving them the shared overlap layout.
- Animating the fan or reordering by drag.

## Decisions

**1. Scope route themes with `html[data-route]`.** Each game's `--route-*` block moves from `:root` to `html[data-route="<slug>"]`. A small client component in `app/layout.js` sets the attribute from `usePathname()` in a layout effect, and an inline script in the document head sets it before first paint on a direct load. Alternatives: (a) make the landing reset the variables, which patches one page and leaves every future page exposed; (b) put the variables on a per-game wrapper, which the site header and `body` sit outside of, and they are what show the mismatch. The attribute approach fixes the cause and keeps the header themed.

**2. Guard against regressions with a validation check.** `scripts/validate-frontend.mjs` fails when a stylesheet under `app/<game>/` declares `--route-*` on a bare `:root`. This is cheaper than a browser test and catches the exact mistake.

**3. A shared display-order helper in `lib/hand-order.js`.** It takes cards, a game id and optional trump, and returns a new array. Each game declares its suit order and rank strength (Ace high by default, Pinochle's list, and the Hand & Foot / Five Crowns wild-first rule) in one table. Clients call it when rendering. Ordering at the render layer avoids changing engine sorts that tests and stored snapshots depend on, and it also reorders hands saved before this change. The engine sorts stay as they are, since they are no longer used for display. Alternative: edit each engine sort, which means 6 edits plus a risk to the bots, which may rely on ascending order (for example `lib/hearts.js:482`).

**4. Scum groups by number through the same helper**, with a `group: "rank"` mode (rank descending, suit as tiebreak).

**5. One hand layout, `.tbl-fan`, rendered by a small `CardFan` component.** The component supplies an outer box (the width reference, `container-type: inline-size`) around the fan, and sets `--n` (card count). Each slot is `--card-w` wide; its end margin is `clamp(--fan-visible - --card-w, (100cqw - n * --card-w) / (n - 1), --fan-gap)`, so cards sit at the gap while they fit and overlap by the least that makes them fit. The container's own width does the sum, with no resize observer. Alternatives: a JS width measurement, which flickers on resize and needs an observer in every client; a fixed overlap per count, which wastes room on wide screens.

**6. Wrap when the tightest overlap will not fit, and reserve the overhang only then.** The overlap is a negative margin, and a flex line breaks on outer size, so a wrapped row's last card counts as `--fan-visible` wide while painting `--card-w` wide and would hang past the container. A wrapped hand therefore reserves `--card-w - --fan-visible` as end padding; a hand that fits on one row reserves nothing, which is why the box is separate from the fan (the fan cannot read its own width). Slots are `isolation: isolate` so a card's raised parts cannot paint over the card above it, and a disabled card dims with a filter rather than opacity so the card beneath does not show through.

**7. Text-heavy cards keep their words.** `--fan-visible` is per game: 24px for suit-and-rank cards, 30px for UNO and DOS (the corner index), 60px for Dominion, and the whole card for Killer Bunnies, which wraps and never overlaps. Skull King's "What does this do?" link becomes a round "?" under the card's visible left edge so a neighbour never covers it, and Sequence's dead-card exchange button is raised above its neighbours.

**8. Migrate every hand onto it.** The 14 hands in 13 games (Hearts, Scum with its trade hand, Pinochle, 7-Up, Hand & Foot, Five Crowns, Skull King, UNO, DOS, Phase 10, Sequence, Dominion, Killer Bunnies) render through `CardFan`, drop their own `overflow-x: auto`, flex sizing and horizontal padding, and set only `--card-w` (and `--fan-visible` / `--fan-gap` where they differ). Scum's `.hand-card-button` was also defined, unscoped, by Hearts; Scum's is renamed `.scum-hand-card` so the two no longer collide.

## Risks / Trade-offs

- [Flash of default colours on a direct load] → the inline script sets `data-route` before first paint; verify with a throttled reload of a dark game.
- [A game's selector is missed during the move and loses its theme] → each game keeps the same variable values, and the validation check from Decision 2 lists any stylesheet still on bare `:root`; the mobile audit opens every game. Dominion and Phase 10 already scope theirs to a wrapper class and were left as they are.
- [Container query units unsupported on old browsers] → they are supported in all current evergreen browsers; an `@supports` fallback keeps normal spacing and lets the hand wrap.
- [Overlap hides a card's value] → rank and suit sit in the card's start corner, and the overlap runs so each card's start edge shows; check Hearts, Hand & Foot and Skull King visually, since their card art differs.
- [Players used to the old order] → the order is display only, so reverting is a one-file change.

## Migration Plan

Ship in two independent steps: the theme scoping first (it fixes the reported landing bug alone), then the hands. No data migration, no flag. Rollback is a revert of either step.

## Open Questions

None outstanding. Skull King's order was settled in implementation: each colour's numbers high to low, then the 15 wild, then the specials in the engine's order.
