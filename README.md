# Digital Games

A single Next.js application containing 30 games: 7-Up, BANG!, Camel Up, Catan, Cover Your Assets, Dominion, DOS, Five Crowns, Flip 7, Hand and Foot, Hearts, Killer Bunnies, Life, Mafia, Monopoly, No Thanks!, Phase 10, Pinochle, Qwirkle, Risk, Scum, Secret Hitler, Sequence, Skull King, Splendor, Spyrium, Stratego, Ticket to Ride, UNO, and Viticulture.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root quality commands cover every game:

```bash
npm test
npm run typecheck
npm run build
```

## Game layout

Every game renders its landing, lobby, game bar and dialogs through `components/ui/table-shell.js`, so players meet the same flow in each. A game supplies content and a theme, never structure (spec: `openspec/specs/platform/game-layout`, in `openspec/changes/uniform-game-layout` until archived). `components/flip-7-client.js` is the reference.

```jsx
// Landing: hero content + the shared entry card (name, create room, join by code)
<Landing gameName="Flip 7" theme="tbl-light flip-7-theme"
  hero={<Hero kicker=".." title={<>Flip.<br /><em>Don&apos;t flop.</em></>} copy=".." badges={[{ icon: Users, label: "2–10 players" }]} art={cards} />}
  entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
  onRules={openRules} dialogs={showRules && <RulesModal />}
  localPlay={{ onPlay }} />        {/* only for games playable without a room */}

// Lobby: room code + copy, seats, computer controls, Start, Leave
<Lobby gameName=".." theme=".." room={room} me={me} min={2} max={10}
  onAdd onRemove onStart onLeave onRules
  options={<ExpansionPicker />}    {/* game-specific lobby controls */}
  seatNote="Needs an even number" /> {/* optional override of the ready line */}

// Game bar: title, status, Rules, room code, Leave
<GameHeader title=".." room={room} status=".." subtitle="Trick 3 of 7" actions={<TradeButton />} onRules onLeave />

// Dialogs: rules, prompts and results all use the same focus-trapped dialog
<ChoiceModal title=".." text=".." onClose={close} wide>…</ChoiceModal>
<Results title=".." rows={[{ id, name, value, note }]}>…actions…</Results>
```

**Theme.** A game gives these components its look by overriding the design tokens on its root class (`--accent`, `--on-accent`, `--accent-soft`, `--surface`, `--ink`, `--font-display`, `--r-lg`, plus `--tbl-hue` for the hero), and adds `tbl-light` if its board is a light room that must not follow the OS dark mode. It does not restyle the structure.

**Check.** `npm run audit:mobile` fails if a game does not show the entry card, lobby, game bar and a Rules dialog that closes on Escape. `scripts/layout-check.mjs` lists the games not yet moved over (`UNMIGRATED`); the list only shrinks.

## Mobile audit

`scripts/mobile-audit.mjs` plays every game in an emulated iPhone (WebKit) at 390×844, 320×568 and 844×390: it loads the lobby, creates a room, adds computers and starts the game. It fails on sideways page scroll, uncaught errors and text fields under 16px (iOS zooms the page on focus), and warns about text under 9px and tap targets under 24px.

```bash
npx playwright install webkit     # once
npm run dev                       # in another terminal
BASE_URL=http://localhost:3000 npm run audit:mobile
npm run audit:mobile -- --games uno,scum --viewport 320x568 --shots /tmp/shots --verbose
```

Mafia needs Supabase keys, so only its lobby is checked.

## Multiplayer storage

Every online game except Mafia stores its rooms in Supabase through the app's room routes. Apply the SQL files under `supabase/migrations` in filename order, then configure these server-only Vercel variables:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` variable. In-memory storage is used only during local development when the server credentials are absent. Rooms expire after 24 hours and are cleaned up opportunistically.

Every online game except Mafia and Hearts runs its rules on the server, so each seat receives only its own view and every move is checked there (see [CONTEXT-MAP.md](./CONTEXT-MAP.md)). There is no browser database access for room state, and a room's code alone does not let anyone read or replace it.

Camel Up uses that engine-room path: the race, pyramid dice and computer choices stay on the server, while each seat view masks other players' finish-card colors until final scoring.

Mafia is the only game that uses the public Supabase variables, because its browser calls token-checked RPCs and Realtime directly:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Mafia always uses Supabase RPCs and Realtime. It uses persistent device credentials rather than Supabase Authentication, so Anonymous Sign-Ins should remain disabled.

## Architecture

The game contexts and shared platform relationships are described in [CONTEXT-MAP.md](./CONTEXT-MAP.md). Architectural decisions are recorded under [docs/adr](./docs/adr).

The deployed application is the repository root. Vercel should use the default blank root directory and run `npm run build`.
