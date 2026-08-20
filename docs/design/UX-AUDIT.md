# Digital Games — UX/UI & Front-End Audit

**Reviewed:** `~/code/digital-games` @ `186520c` · Next.js 15.5 (App Router), React 19, 24 games
**Reviewer brief:** improve functionality and look-and-feel · mixed phone/laptop audience
**Scope of this pass:** hub page, app shell, and the CSS/design-system foundation everything else inherits

---

## The one-paragraph version

The game logic here is genuinely impressive — 24 games, server-authoritative rooms, computer opponents, a real
test and typecheck pipeline. The presentation layer has not kept up with it. There are **two unrelated design
systems** in the app (a warm Georgia-serif one and a cool Inter/Impact one), **seven typefaces referenced that
never load on the routes that use them**, and **24 hand-tuned card gradients that all resolve to the same dark
green-and-gold rectangle**, so the hub reads as one texture instead of 24 games. Fixing the foundation — one
token layer, one type scale, one card recipe — is a few hundred lines of CSS that deletes a few thousand, and
it makes every subsequent game-level improvement cheap instead of bespoke.

---

## Findings, ranked

Ranked by **impact ÷ effort**. Each has the evidence, the consequence, and the fix.

---

### P0-1 · The hub can't answer the only question a game night asks

**Evidence:** `app/page.js` renders all 24 games as one flat, alphabetised grid. Each card is `min-height: 280px`
(`app/globals.css:203`). No search, no filter, no grouping, no recency.

**Consequence:** On a phone that's roughly **eight screens of scrolling** to see the catalogue. The actual
question at game night — *"we have five people and twenty minutes, what can we play?"* — is unanswerable
without opening cards one at a time. The information needed to answer it *is* on the card, but as prose:
`status: "New · Rooms for 5–10"`.

**Fix:** Promote that prose to structured metadata and build the hub around it.

```js
// app/lib/games.js  — single source of truth, replaces the arrays in
// app/page.js AND components/site-header.js (currently duplicated and drifting)
{
  slug: "secret-hitler",
  name: "Secret Hitler",
  players: { min: 5, max: 10 },
  minutes: { min: 30, max: 45 },
  category: "hidden-role",      // card | board | hidden-role
  modes: ["online", "computer"],
  hue: 8,                        // index into the accent wheel, see P0-3
  blurb: "Nominate a government, pass secret policies, and uncover the hidden Fascist team.",
}
```

Then: a **player-count filter as the primary control** (a 2–12 chip row), secondary chips for length and
category, and a search field. Everything client-side over a 24-item array — no state management, no network.
Add a "Jump back in" row from `localStorage` for the 2–3 games actually replayed.

Also: **`"New · "` prefixes 20 of 24 games.** A badge that's on 83% of items conveys nothing and costs a line of
vertical rhythm on every card. Drop it, or make it real (`isNew: true` for the last three shipped).

---

### P0-2 · Seven typefaces are specified; most never load where they're used

**Evidence:**

| Family | Declared in | Actually loaded? |
|---|---|---|
| `Inter` | `color-games.css` (UNO, DOS) + 4 others | ❌ — only linked on `/mafia` (`app/mafia/page.js:11`) |
| `Impact, Haettenschweiler` | `color-games.css` — every UNO/DOS display heading | ❌ — not a webfont; absent on iOS & Android |
| `Rockwell` | 10 declarations | ❌ — Windows/Office only; absent on Mac, iOS, Android |
| `Oswald`, `Playfair Display`, `DM Sans` | `spyrium.css` | ⚠️ via `@import url(...)` at `spyrium.css:1` |
| `Fraunces`, `DM Sans` | `life.css` | ⚠️ via `@import url(...)` at `life.css:1` |
| `Crimson Pro`, `Inter` | `/mafia` | ⚠️ via `<link>` in the page body |

**Consequence:** This is a **cross-device correctness bug, not a taste issue.** UNO and DOS are designed around
Impact — `font: 950 clamp(4rem, 8vw, 7.2rem)/.82 Impact` (`color-games.css:9`). On the phones half this audience
plays on, Impact does not exist, so those headings silently fall back to the system sans at whatever weight is
nearest 950. The game looks like a different product on a MacBook than on an iPhone, and nobody sees both
side by side to notice.

Separately, `@import url("https://fonts.googleapis.com/...")` inside a CSS file is the slowest available way to
load a font: it can't be discovered by the preload scanner, so the browser must download and parse the CSS
before it even learns the font exists. Two serial round-trips before first paint of text.

**Fix:** One `next/font` declaration in `app/layout.js`, self-hosted and preloaded, exposed as CSS variables.

```js
import { Fraunces, Inter } from "next/font/google";
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans    = Inter({    subsets: ["latin"], variable: "--font-sans",    display: "swap" });
// <html className={`${display.variable} ${sans.variable}`}>
```

Then `font-family: var(--font-display)` everywhere, and pick a real condensed webfont (Anton, Archivo
Expanded) to replace Impact. Zero layout shift, one round-trip, identical on every device. Delete all three
`@import`s and the `<link>` block.

---

### P0-3 · 24 bespoke gradients that are 24 versions of the same gradient

**Evidence:** ~250 lines of `app/globals.css` (lines 209–465) are per-game card backgrounds. The pattern
underneath them is nearly constant:

```css
/* bang, cover-your-assets, hand-foot, killer-bunnies, pinochle, risk, scum,
   secret-hitler, sequence, skull-king, splendor, spyrium, ticket-to-ride */
radial-gradient(circle at ~83% ~17%, rgba(<gold>, .4–.8), transparent ~22%),
linear-gradient(145deg, <deep green/teal>, <darker>, <rust brown>)
```

**Thirteen** of the twenty-four are deep-green-to-rust with a gold spark in the same corner. Confirmed by the
per-game token blocks, which independently reinvented the same palette: `--bang-gold: #d59434`,
`--sequence-gold: #d79b36`, `--ttr-gold: #c8993f`, `--spy-brass: #d4aa54`.

**Consequence:** Colour is the fastest scanning channel humans have, and this spends it on nothing. Scrolling
the hub, the eye gets one repeated texture and has to fall back to reading every title. The theming effort was
real; the differentiation it bought is close to zero.

**Fix:** One recipe, one variable per game. Perceptually-even hues via OKLCH, so equal steps *look* equal:

```css
.game-tile {
  --h: 0;                                        /* only per-game value */
  --tile-lo: oklch(0.26 0.06 var(--h));
  --tile-hi: oklch(0.46 0.13 var(--h));
  background:
    radial-gradient(circle at 84% 16%, oklch(0.78 0.15 calc(var(--h) + 40) / 0.5), transparent 34%),
    linear-gradient(146deg, var(--tile-hi), var(--tile-lo));
}
.game-tile[data-game="uno"]     { --h:  25; }
.game-tile[data-game="catan"]   { --h:  75; }
/* …24 lines total */
```

**~250 lines → ~35.** Every game stays distinct because hues are spread deliberately rather than chosen one at
a time, and text contrast is guaranteed because lightness is fixed by the recipe instead of eyeballed 24 times.

---

### P0-4 · Two design systems, both global, silently overlapping

**Evidence:** `app/layout.js` imports **both** `globals.css` and `color-games.css` on every route.

| | `globals.css` | `color-games.css` |
|---|---|---|
| Used by | hub + 22 games | UNO, DOS only |
| Type | Georgia serif | Inter + Impact |
| Surface | `#f4efe7` warm cream | `#fffdf5` cool paper |
| Ink | `#1e1a17` warm brown-black | `#161929` cool blue-black |
| Radius | 26px / 22px / 999px | 30px / 13px / 11px |
| Accent | `#b84c2a` terracotta | `#ed2f37` red + `#f5c62b` yellow |
| Shadow | `0 20px 50px rgba(39,26,16,.1)` | `0 22px 60px rgba(20,23,38,.13)` |

**Consequence:** Two things, one worse than the other.

The visible one: moving from the hub to UNO and back is a jarring change of temperature, type, and corner
radius — it reads as two different apps sharing a header.

The structural one: **`color-games.css` is not scoped.** Selectors like `.primary`, `.link`, and
`button:disabled` (`color-games.css:23–28`) are bare global selectors shipped to every route. `button:disabled`
even carries `!important`. Any new component that uses the class name `primary` inherits UNO's red gradient by
accident, and the bug will look inexplicable.

**Fix, in order:**
1. Scope it today — wrap every `color-games.css` selector under `.cg-scope` and put that class on the UNO/DOS
   page roots. One-line safety fix, no visual change.
2. Then reconcile: `color-games.css` is, honestly, **the better system.** Its lobby, seat rail, opponent
   strip, hand zone, and modal are a more mature UI than anything in `globals.css`. The right direction is to
   promote those patterns up into the shared layer rather than to flatten them down.

---

### P1-5 · `color-games.css` is hand-minified and structurally coupled to the DOM

**Evidence:** 21 KB across 74 lines — line 31 alone is ~2,400 characters. It is authored as if it were build
output. And it targets structure, not intent:

```css
.cg-hero > p:nth-of-type(2)          { /* the description */ }
.cg-hero > div:not(.cg-hero-fan)     { /* the badge row */ }
.cg-entry > .link                    { margin-top: 10px }
.cg-seats article > span             { /* the avatar */ }
.cg-game-header > button:nth-last-child(2) { font-size: .7rem }
```

**Consequence:** Adding one `<p>` to the hero re-skins the wrong paragraph. Reordering two buttons in the game
header changes which one keeps its label on mobile. These break at a distance, produce no error, and are found
by a person noticing something looks wrong. Every future change to UNO/DOS markup is riskier than it should be.

Also `@media(max-width:620px)` uses `font-size: 0` to hide button labels — the text stays in the accessibility
tree (fine) but the buttons become unlabelled icons with no tooltip, and one is exempted by `:nth-last-child(2)`.

**Fix:** Reformat (Prettier will do it), then replace structural selectors with explicit class names as you
touch each block. Not a rewrite — a rule for the next person editing it.

---

### P1-6 · Seven games poll every 1.2 s forever, including in background tabs

**Evidence:** `setInterval(poll, 1200)` in `hand-and-foot`, `killer-bunnies`, `pinochle`, `scum`,
`secret-hitler`, `skull-king` room services, plus `lib/supabase-room-sync.js`. Only
`components/seven-up-client.js` pauses — it's the single `visibilitychange` listener in the codebase
(line 103); the other seven poll unconditionally.

**Consequence:** On a phone, a backgrounded game tab wakes the radio **50 times a minute** indefinitely. Across
six players that's ~300 requests/min against Supabase for a game nobody is looking at — a battery cost, and on
a hobby-tier plan a quota cost.

**Fix:** One shared hook, three behaviours:

```js
// lib/use-room-poll.js
// 1. pause entirely on document.hidden, refetch once on visibilitychange
// 2. back off 1200ms → 5s → 15s after N unchanged responses, reset on change
// 3. one shared timer per room, not one per subscriber
```
Roughly 40 lines, replaces seven copies, and cuts idle traffic by well over 90%. Mafia already does this
correctly with Supabase Realtime — that's the eventual target for the rest.

---

### P1-7 · Navigation is a 26-item ungrouped list with an admin link in it

**Evidence:** `components/site-header.js:7–34`. A single flat dropdown, `max-height: calc(100vh - 90px)` with
`overflow-y: auto` (`globals.css:61–63`) — so on a phone it's a scrolling column inside a scrolling page.
`"Update KB Cards" → /killer-bunnies/cards` sits between "Killer Bunnies" and "Life".

**Consequence:** Finding a game in the nav is slower than going home and using the grid. And a content-admin
tool is one mis-tap from a player mid-game.

**Fix:** The header should carry **brand · search · current game · leave**, not a catalogue. Replace the list
with a command-palette-style search (⌘K / tap), grouped by category, with the current game pinned. Move
`/killer-bunnies/cards` behind the Killer Bunnies page or an `/admin` route. And derive it from the shared
`games.js` — right now the nav array and the hub array are **two hand-maintained copies of the same list**, and
they have already diverged ("Hand & Foot" vs "Hand and Foot").

---

### P1-8 · Accessibility: better than expected, with three specific gaps

Credit first — this is not an afterthought: **163 `aria-label`s, 36 `role="dialog"`, 31 `role="alert"`,
6 `role="status"`**, `aria-expanded`/`aria-controls` wired on the menu, Escape-to-close and outside-click
handled in `site-header.js`, and `prefers-reduced-motion` respected in 6 files. Turn changes announce to
screen readers via the implicit live regions on `role="status"`. That's ahead of most hobby projects.

The gaps:

1. **`:focus-visible` appears in 3 of the 22 stylesheets** (`spyrium`, `hearts`, `skull-king`).
   Keyboard players elsewhere get the browser default outline over
   dark gradient tiles, where it's often invisible. Needs one global rule:
   `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` with a token that flips per surface.
2. **36 dialogs, no focus trap.** `role="dialog"` and `aria-modal` are set, but nothing moves focus in on open,
   returns it on close, or prevents Tab escaping to the page behind. `inert` on the backdrop's sibling is the
   modern one-attribute fix.
3. **No skip link.** Every route starts with the same 26-item nav; a keyboard or switch user tabs through all
   of it to reach the game.

Also worth a contrast pass: `.game-card.splendor p { color: rgba(255,247,223,.72) }` and
`.game-card.spyrium p { color: rgba(240,230,207,.74) }` are translucent body text over a gradient, so the
effective ratio varies across the card. The OKLCH recipe in P0-3 makes this checkable once instead of 24 times.

---

### P2-9 · Missing route-level infrastructure

No `error.js`, `not-found.js`, or `loading.js` anywhere in `app/`. An exception in a game client shows the
Next.js default error screen mid-game with no way back to the hub. No `manifest.json`, `theme-color`, or
apple-touch-icon — so for an app whose core use case is *phones around a table*, nobody can add it to their
home screen, and the browser chrome clashes with every game's theme.

Small, high-leverage: a root `error.js` with "Something broke — back to the hub", a `loading.js` skeleton, and a
web manifest. Maybe 60 lines total.

---

### P2-10 · Metadata and sharing

`app/layout.js` sets a title and description; the 23 game pages export their own `metadata` but there's no
`openGraph` block outside of what `scum-og.png` in `public/` hints at. Sharing a room link into a group chat —
which is *the* way a game starts — produces a bare URL. Per-game OG images and a
`metadata.openGraph` in the shared game config would make every invite carry the game's name and art.

---

## Suggested sequence

| | Work | Why here | Rough size |
|---|---|---|---|
| **1** | `lib/games.js` single source of truth | Unblocks the hub, the nav, and OG metadata at once | S |
| **2** | Token layer + `next/font` (P0-2) | Everything below reads from it | S–M |
| **3** | OKLCH tile recipe (P0-3) | Deletes ~250 lines, fixes scannability | S |
| **4** | Hub redesign: filter · search · jump-back-in (P0-1) | The highest-visibility change | M |
| **5** | Scope `color-games.css` (P0-4 step 1) | Stops a class of future bug | XS |
| **6** | Header → search + context (P1-7) | Depends on 1 and 4 | M |
| **7** | `use-room-poll` hook (P1-6) | Independent; can land any time | S |
| **8** | Focus ring, focus trap, skip link (P1-8) | Independent | S |
| **9** | `error.js` / `loading.js` / manifest (P2-9) | Independent | XS |
| **10** | Reconcile the two systems (P0-4 step 2) | The real work; needs 2–4 landed first | L |

Steps 1–5 and 7–9 are all small and independent enough to land in a week of evenings, and together they
change how the whole app feels before any individual game is touched.

---

## Three traps to know before you build the token layer

I hit all three building the prototype. They cost me an hour; they'd cost more mid-refactor.

**1 · A custom property that references another custom property resolves at the element that *declares*
it, not the element that *uses* it.** This looks correct and silently produces nothing:

```css
.app  { --tile-overlay: radial-gradient(…, oklch(.84 .14 var(--hue) / .45), transparent); }
.tile { --hue: 205; background: var(--tile-overlay), …; }   /* ✗ whole background invalid */
```

`--hue` doesn't exist on `.app`, so `--tile-overlay` computes to the guaranteed-invalid value there and
inherits down already broken. Worse, one invalid layer invalidates the **entire** `background` shorthand, so
the tile renders fully transparent with no console warning. Declare hue-dependent tokens on the element that
owns the hue:

```css
[data-direction="refine"] .tile { --tile-overlay: radial-gradient(…, oklch(.84 .14 var(--hue) / .45), …); }
```

**2 · `calc()` inside `oklch()` is a second way to lose the whole declaration.** Prefer emitting two plain
values (`--hue`, `--hue-spark`) from your data than computing one from the other in CSS.

**3 · Element-selector resets out-specify your component classes.** `globals.css:134` has
`a { color: inherit }`, which is fine today because it's a bare element selector. The moment it becomes
`.app a { color: inherit }` in a scoped refactor, it's specificity `(0,1,1)` and beats `.tile { color: #fff }`
at `(0,1,0)` — every tile title silently turns dark. Wrap resets in `:where()` so they carry zero specificity:

```css
.app :where(a) { color: inherit; text-decoration: none }
.app :where(button, input, select) { font: inherit; color: inherit }
```

One more, from measuring rather than debugging: **translucent-white pills fail contrast on mid-lightness
tiles.** The `rgba(255,255,255,.15)` badge surface used throughout `globals.css` lightens the substrate and
drops 0.7rem labels to **3.4:1** — below the 4.5:1 AA floor for small text. Swapping to a `rgba(0,0,0,.3)`
scrim with a white hairline takes the same labels to **7.5:1** at no visual cost. That single change applies
to every `.game-status` badge in the app.

---

## Two notes on method

**On the guessed metadata.** The prototype needs player counts and durations the repo doesn't record. Where
`status` gave a range I used it; where it gave prose I estimated: `7-Up` 2–6, `Catan` 3–4, `Monopoly` 2–6,
`Mafia` 6–15, `Hearts` 4, `Scum` 3–10, `Hand and Foot` 4, `Skull King` 2–8, `Risk` solo. Correct these in
`games.js` — every one is a real rule your players know and I don't.

**On the two directions.** The accompanying prototype shows *Refine* and *Modernize* as a runtime toggle. That
is the actual argument: both are the **same token names with different values**. Whichever you pick, the
component layer is identical, and changing your mind later is a values edit rather than a rewrite.
