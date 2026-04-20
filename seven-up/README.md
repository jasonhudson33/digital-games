# 7-up

React + Next.js implementation of the 7-up card game with:

- local hot-seat play
- configurable computer players
- shared online rooms for human players
- Vercel-ready API routes for multiplayer actions

## Stack

- Next.js App Router
- React
- Route Handlers for room APIs
- Redis-backed room storage in production on Vercel

## Why Redis

Shared room state cannot safely live in memory on Vercel because serverless functions do not share process memory across requests. For production room play, configure `REDIS_URL` in Vercel using a Redis integration from the Vercel Marketplace.

Vercel’s own docs currently point Redis users to Marketplace integrations rather than the old Vercel KV product:

- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Storage on Vercel Marketplace](https://vercel.com/docs/marketplace-storage)
- [Redis on Vercel](https://vercel.com/docs/redis)

## Local development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For local development only, room state falls back to in-memory storage so you can test multiplayer flows on one machine.

## Room play

1. Choose `Room game`
2. Set each seat to `Human` or `Computer`
3. Create the room
4. Share the room link with other players
5. Each human player opens the link and claims an open seat
6. The host starts the room after every human seat is claimed

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo into Vercel
3. Add a Redis integration in the Vercel Marketplace
4. Confirm `REDIS_URL` is available in the project environment
5. Deploy

Without `REDIS_URL`, local play still works, but production room play is intentionally blocked.

## Scripts

```bash
npm run dev
npm run build
npm run start
```
