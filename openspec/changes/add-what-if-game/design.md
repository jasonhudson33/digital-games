# Design

## Context

Engine-room games (No Thanks! is the smallest) are made of a few pieces:

- **Rules module:** a pure rules module in `lib/<game>.js`.
- **Adapter:** `lib/<game>-room-adapter.js`, with `label`, `createLobby`, `addPlayer`, `actions`, `computerStep` and `view`.
- **Store:** a Supabase-backed store in `lib/<game>-room-store.js`.
- **Room and routes:** `lib/<game>-engine-room.js`, which wires `createEngineRoom` and `createEngineRoomRoutes`.
- **API:** two route files under `app/api/<game>/rooms`.
- **Client:** a client built on `useEngineRoom` and the shared `table-shell` pieces.

`engine-room` takes the acting seat from the token and returns `adapter.view(game, viewerId)`, so all privacy lives in `view`. `scripts/layout-check.mjs` requires each game to have an entry, lobby, game bar and dialog, and `tests/games-catalog.test.mjs` checks each catalog entry against the game's own limits. `KINDS` in `lib/games.js` has card, board and hidden; none of them describes a writing party game. No game has a text input yet.

## Goals / Non-Goals

**Goals:**
- Follow the No Thanks! structure exactly, so the game gets seat tokens, reconnection (`room-seat`), polling and layout checks for free.

**Non-Goals:**
- Real-time typing indicators, moderation, saving past rounds after the room expires.

## Decisions

- **State shape (`lib/what-if.js`):**
  - Top level: `{ phase: "lobby" | "writing" | "reveal" | "done", round, players: [{ id, name, isHost }], entries: { [playerId]: { if, then } }, pairs: [{ ifText, ifBy, thenText, thenBy }], revealIndex }`.
  - Pure functions: `createLobby`, `addPlayer`, `startGame`, `submitEntry`, `mix(game, rng)`, `nextPair`, `playAgain`.
- **Writing.** Text is trimmed, its whitespace collapsed, and it's capped at 200 characters on the server; the client's `maxLength` is only a convenience. `submitEntry` with a blank half throws a readable error. When every seated player has an entry, `submitEntry` calls `mix` itself, so no extra request is needed.
- **Mixing without self-pairs.** Shuffle the writers, then pair each writer's IF with the THEN of the next writer in that shuffled order (a rotation by one). With at least 3 writers no one gets their own THEN, every THEN is used once, and the order is random. Then shuffle the pair order. Both shuffles use the engine's `rng`, so tests can be deterministic.
- **Privacy in `view(game, viewerId)`:**
  - Writing: `{ myEntry, submitted: [playerIds] }`, with no `entries`.
  - Reveal: `pairs.slice(0, revealIndex + 1)`, with the current pair last, and `pairCount`.
  - Done: all pairs.
  - The raw `entries` and `pairs` are never sent.
- **Actions:** `start` (host), `submit` (any seat: `{ if, then }`), `mixNow` (host, needs at least 3 entries), `next` (host), `playAgain` (host, from `done`). `addComputer`/`removeComputer` (host, lobby only). `computerStep` has the first computer that hasn't written submit a random IF and THEN from `lib/what-if-lines.js`, skipping lines already used that round. It goes through `submitEntry`, so the last computer in triggers the mix. The client's `computerDue` is "writing, and a computer isn't in `submitted`", so the host's browser paces the computers at the room's computer speed like other games.
- **Client (`components/what-if-client.js`):**
  - **Shared screens:** `useEngineRoom`, plus the shared `Landing`, `Lobby`, `GameHeader` and a rules `ChoiceModal`.
  - **Writing:** two labelled `<textarea>`s with "What if…" and "Then…" placeholders, character counters, and Submit / Update. Seat chips show "done" ticks, and the host gets a Mix now button once 3 have submitted.
  - **Reveal:** a large card showing "What if" in the IF writer's words, then "Then…", then the bylines, with "Pair 3 of 5" and a host-only Next. Done lists every pair, with Play again for the host.
  - Text areas use at least 16px text, so iOS doesn't zoom in on them.
- **Catalog.** `{ slug: "what-if", name: "What If", players: [3, 20], minutes: [15, 30], kind: "party", modes: ["online"], isNew: true }`, with a hue at least 40° from its alphabetical neighbours. Add `party: "Party"` to `KINDS`.

## Risks / Trade-offs

- [Free text from players can be crude] → It's a private-room game among friends, and React escapes all text. No moderation in v1.
- [A host who leaves strands the reveal] → The same as other host-paced games today. Out of scope.
- [A new `kind` may need a hub filter label or icon] → `KINDS` drives the hub and the command palette. Check the hub renders the new group.

## Update: three-step rounds

This replaced the original "write both halves, then mix" flow at the user's request.

- **State:** `{ phase: "lobby" | "ifs" | "thens" | "reveal" | "done", ifs: {playerId: text}, draws: {drawerId: ifAuthorId}, thens: {drawerId: text}, pairs, revealIndex }`.
- **Dealing:** `dealIfs` shuffles the IF writers and pairs them with the writer list as a random permutation, so a player can draw their own.
- **Matching:** `matchPairs` takes the IFs drawn by players who wrote a THEN, shuffles the THENs onto them (fully random, so a THEN may land on its own IF), then shuffles the reading order.
- **Actions:** a single `submit { text }` action follows the phase. `continueNow` (host, at least 3 done) ends either writing step early.
- **View:** `writers` is who is writing this step and `submitted` is who is done. `myText` is your own text for this step. In the THEN step, `myDraw = { ifText }` only, with no author.
