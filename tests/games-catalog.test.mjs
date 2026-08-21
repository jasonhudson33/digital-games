import assert from "node:assert/strict";
import test from "node:test";

import {
  GAMES,
  KINDS,
  getGame,
  lengthBucket,
  playerCountOptions,
  playersLabel,
  supportsPlayerCount,
} from "../lib/games.js";

function hueDistance(a, b) {
  const raw = Math.abs(a - b) % 360;
  return Math.min(raw, 360 - raw);
}

test("every game has the fields the hub and metadata depend on", () => {
  for (const game of GAMES) {
    assert.match(game.slug, /^[a-z0-9-]+$/, `${game.name} slug`);
    assert.ok(game.name.length > 0, `${game.slug} name`);
    assert.ok(game.blurb.length > 0, `${game.slug} blurb`);
    assert.ok(Object.hasOwn(KINDS, game.kind), `${game.slug} kind "${game.kind}" is not a known kind`);
    assert.ok(game.modes.length > 0, `${game.slug} modes`);

    const [minPlayers, maxPlayers] = game.players;
    assert.ok(Number.isInteger(minPlayers) && minPlayers >= 1, `${game.slug} min players`);
    assert.ok(maxPlayers >= minPlayers, `${game.slug} player range is inverted`);

    const [minMinutes, maxMinutes] = game.minutes;
    assert.ok(minMinutes > 0 && maxMinutes >= minMinutes, `${game.slug} minute range`);

    assert.ok(game.hue >= 0 && game.hue < 360, `${game.slug} hue must be a degree on the wheel`);
  }
});

test("slugs are unique", () => {
  const slugs = GAMES.map((game) => game.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("games are listed in the order the grid renders them", () => {
  const sorted = [...GAMES].sort((left, right) => left.name.localeCompare(right.name, "en", { numeric: true }));
  assert.deepEqual(GAMES.map((game) => game.slug), sorted.map((game) => game.slug));
});

test("adjacent tiles are at least 40 degrees apart on the hue wheel", () => {
  // The grid renders GAMES in order, so alphabetical neighbours are visual
  // neighbours. Keeping them far apart is what makes 24 tiles scannable —
  // it is the invariant that replaced 250 lines of hand-tuned gradients.
  for (let index = 0; index < GAMES.length; index += 1) {
    const current = GAMES[index];
    const next = GAMES[(index + 1) % GAMES.length];
    const distance = hueDistance(current.hue, next.hue);
    assert.ok(
      distance >= 40,
      `${current.name} (${current.hue}°) and ${next.name} (${next.hue}°) are only ${distance}° apart`,
    );
  }
});

test("player count filter only offers counts that match at least one game", () => {
  for (const count of playerCountOptions()) {
    const matches = GAMES.filter((game) => supportsPlayerCount(game, count));
    assert.ok(matches.length > 0, `no game supports ${count} players`);
  }
});

test("supportsPlayerCount respects both ends of the range", () => {
  const uno = getGame("uno");
  assert.equal(supportsPlayerCount(uno, 2), true);
  assert.equal(supportsPlayerCount(uno, 10), true);
  assert.equal(supportsPlayerCount(uno, 1), false);
  assert.equal(supportsPlayerCount(uno, 11), false);
});

test("playersLabel reads naturally for ranges, fixed counts and solo", () => {
  assert.equal(playersLabel({ players: [2, 10] }), "2–10 players");
  assert.equal(playersLabel({ players: [4, 4] }), "4 players");
  assert.equal(playersLabel({ players: [1, 1] }), "Solo");
});

test("length buckets split at 20 and 40 minutes", () => {
  assert.equal(lengthBucket({ minutes: [15, 20] }), "quick");
  assert.equal(lengthBucket({ minutes: [20, 30] }), "quick");
  assert.equal(lengthBucket({ minutes: [30, 45] }), "mid");
  assert.equal(lengthBucket({ minutes: [45, 60] }), "long");
});

test("getGame returns null rather than throwing for an unknown slug", () => {
  assert.equal(getGame("not-a-game"), null);
});

/*
 * The tests above check the catalogue against itself. That is what let four
 * entries drift away from the code they describe — the hub's player-count
 * chips are built straight from `players`, so a wrong range offers people a
 * game that then refuses to deal. These check it against the engines.
 */
test("advertised player counts match what each engine will actually start", async () => {
  const engines = [
    { slug: "seven-up", load: async () => { const m = await import("../lib/game.js"); return { min: m.SevenUpGame.MIN_PLAYERS, max: m.SevenUpGame.MAX_PLAYERS }; } },
    { slug: "uno", load: async () => await import("../lib/uno.js") },
    { slug: "dos", load: async () => await import("../lib/dos.js") },
    { slug: "flip-7", load: async () => await import("../lib/flip-7.js") },
    { slug: "bang", load: async () => await import("../lib/bang.js") },
    { slug: "no-thanks", load: async () => await import("../lib/no-thanks.js") },
    { slug: "cover-your-assets", load: async () => await import("../lib/cover-your-assets.js") },
    { slug: "secret-hitler", load: async () => { const m = await import("../lib/secret-hitler.js"); return { min: m.SECRET_HITLER_MIN_PLAYERS, max: m.SECRET_HITLER_MAX_PLAYERS }; } },
    { slug: "scum", load: async () => { const m = await import("../lib/scum-rooms.js"); return { min: m.SCUM_MIN_PLAYERS, max: m.SCUM_MAX_PLAYERS }; } },
  ];

  for (const engine of engines) {
    const game = getGame(engine.slug);
    assert.ok(game, `${engine.slug} is missing from the catalogue`);
    const loaded = await engine.load();
    const min = loaded.min ?? loaded.MIN_PLAYERS;
    const max = loaded.max ?? loaded.MAX_PLAYERS;
    assert.equal(game.players[0], min, `${engine.slug}: catalogue min ${game.players[0]} vs engine ${min}`);
    assert.equal(game.players[1], max, `${engine.slug}: catalogue max ${game.players[1]} vs engine ${max}`);
  }
});

test("Sequence only offers seat counts it can actually deal", async () => {
  const { VALID_PLAYER_COUNTS } = await import("../lib/sequence.js");
  const sequence = getGame("sequence");
  for (let count = sequence.players[0]; count <= sequence.players[1]; count += 1) {
    assert.equal(
      supportsPlayerCount(sequence, count),
      VALID_PLAYER_COUNTS.includes(count),
      `Sequence with ${count} players: catalogue and engine disagree`,
    );
  }
});

test("Hand and Foot only offers even partnership counts", async () => {
  const { HAND_FOOT_MAX_PLAYERS } = await import("../lib/hand-and-foot.js");
  const handAndFoot = getGame("hand-and-foot");
  assert.equal(handAndFoot.players[1], HAND_FOOT_MAX_PLAYERS);
  assert.equal(supportsPlayerCount(handAndFoot, 5), false);
  assert.equal(supportsPlayerCount(handAndFoot, 6), true);
  assert.equal(supportsPlayerCount(handAndFoot, 3), false);
});

test("every catalogue entry has a route, and every route a catalogue entry", async () => {
  const { readdirSync, existsSync } = await import("node:fs");
  const routes = readdirSync("app", { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "api" && existsSync(`app/${entry.name}/page.js`))
    .map((entry) => entry.name);
  const slugs = GAMES.map((game) => game.slug);

  assert.deepEqual(slugs.filter((slug) => !routes.includes(slug)), [], "catalogue entries with no page");
  assert.deepEqual(routes.filter((route) => !slugs.includes(route)), [], "pages with no catalogue entry");
});
