# Digital Games

A single Next.js application containing Seven Up, Scum, Hand and Foot, Hearts, Mafia, Monopoly, and Catan.

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

Seven Up, Scum, and Hand and Foot use Redis room storage. Set `REDIS_URL` in Vercel; in-memory storage is available only during local development.

Catan and Monopoly use Supabase when these variables are configured, with a Next.js in-memory room route for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Mafia always uses Supabase RPCs and Realtime. It uses persistent device credentials rather than Supabase Authentication, so Anonymous Sign-Ins should remain disabled. Apply the SQL files under `supabase/migrations` in filename order.

## Architecture

The game contexts and shared platform relationships are described in [CONTEXT-MAP.md](./CONTEXT-MAP.md). Architectural decisions are recorded under [docs/adr](./docs/adr).

The deployed application is the repository root. Vercel should use the default blank root directory and run `npm run build`.
