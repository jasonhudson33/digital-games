# Digital Games

A single Next.js application containing Spyrium, Cover Your Assets, Splendor, Killer Bunnies, Secret Hitler, Sequence, Ticket to Ride,
Pinochle, Risk, Skull King, Hand and Foot, Scum, Seven Up, Hearts, Mafia, Monopoly, and Catan.

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

## Multiplayer storage

Seven Up, Scum, and Hand and Foot store private, server-authoritative rooms in Supabase. Apply the SQL files under `supabase/migrations` in filename order, then configure these server-only Vercel variables:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` variable. In-memory storage is used only during local development when the server credentials are absent. Rooms expire after 24 hours and are cleaned up opportunistically.

Catan and Monopoly use Supabase when these variables are configured, with a Next.js in-memory room route for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Mafia always uses Supabase RPCs and Realtime. It uses persistent device credentials rather than Supabase Authentication, so Anonymous Sign-Ins should remain disabled.

## Architecture

The game contexts and shared platform relationships are described in [CONTEXT-MAP.md](./CONTEXT-MAP.md). Architectural decisions are recorded under [docs/adr](./docs/adr).

The deployed application is the repository root. Vercel should use the default blank root directory and run `npm run build`.
