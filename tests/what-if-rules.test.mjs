import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PLAYERS,
  MAX_TEXT,
  addPlayer,
  createLobby,
  mix,
  mixNow,
  nextPair,
  playAgain,
  startGame,
  submitEntry,
} from "../lib/what-if.js";

function seeded(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function table(count) {
  let game = createLobby({ id: "p0", name: "Ana" }, "ABCDE", 0);
  for (let index = 1; index < count; index += 1) game = addPlayer(game, { id: `p${index}`, name: `P${index}` });
  return game;
}

const write = (game, id, rng) => submitEntry(game, id, { ifText: `if-${id}`, thenText: `then-${id}` }, rng);

test("start needs three players and the table holds at most twenty", () => {
  assert.throws(() => startGame(table(2)), /at least 3/);
  assert.equal(startGame(table(3)).phase, "writing");
  const full = table(MAX_PLAYERS);
  assert.equal(addPlayer(full, { id: "extra", name: "Late" }), full);
  assert.equal(addPlayer(startGame(table(3)), { id: "late", name: "Late" }).players.length, 3);
});

test("both halves are required, text is trimmed and capped, and resubmitting replaces it", () => {
  let game = startGame(table(3));
  assert.throws(() => submitEntry(game, "p0", { ifText: "cats could vote", thenText: "   " }), /both/);
  game = submitEntry(game, "p0", { ifText: "  cats   could vote ", thenText: "x".repeat(500) });
  assert.equal(game.entries.p0.if, "cats could vote");
  assert.equal(game.entries.p0.then.length, MAX_TEXT);
  game = submitEntry(game, "p0", { ifText: "dogs could vote", thenText: "chaos" });
  assert.deepEqual(game.entries.p0, { if: "dogs could vote", then: "chaos" });
  assert.equal(game.phase, "writing");
});

test("the last submission mixes the round automatically", () => {
  let game = startGame(table(4));
  for (const id of ["p0", "p1", "p2"]) game = write(game, id);
  assert.equal(game.phase, "writing");
  game = write(game, "p3", seeded(7));
  assert.equal(game.phase, "reveal");
  assert.equal(game.pairs.length, 4);
  assert.equal(game.revealIndex, 0);
});

test("no IF is ever paired with its own writer's THEN, and every THEN is used once", () => {
  for (let count = 3; count <= MAX_PLAYERS; count += 1) {
    let base = startGame(table(count));
    for (let index = 0; index < count; index += 1) base = { ...base, entries: { ...base.entries, [`p${index}`]: { if: `if-p${index}`, then: `then-p${index}` } } };
    for (let seed = 1; seed <= 40; seed += 1) {
      const { pairs } = mix(base, seeded(seed * 31 + count));
      assert.equal(pairs.length, count);
      for (const pair of pairs) {
        assert.notEqual(pair.ifBy, pair.thenBy, `self-pair with ${count} writers, seed ${seed}`);
        assert.equal(pair.ifText, `if-${pair.ifBy}`);
        assert.equal(pair.thenText, `then-${pair.thenBy}`);
      }
      assert.equal(new Set(pairs.map((pair) => pair.thenBy)).size, count);
      assert.equal(new Set(pairs.map((pair) => pair.ifBy)).size, count);
    }
  }
});

test("mix now needs three submissions, and non-submitters sit out", () => {
  let game = startGame(table(6));
  game = write(write(game, "p0"), "p1");
  assert.throws(() => mixNow(game), /At least 3/);
  for (const id of ["p2", "p3", "p4"]) game = write(game, id);
  const mixed = mixNow(game, seeded(3));
  assert.equal(mixed.phase, "reveal");
  assert.equal(mixed.pairs.length, 5);
  assert.ok(mixed.pairs.every((pair) => pair.ifBy !== "p5" && pair.thenBy !== "p5"));
});

test("next steps through the pairs, then play again starts a fresh round", () => {
  let game = startGame(table(3));
  for (const id of ["p0", "p1", "p2"]) game = write(game, id, seeded(9));
  assert.equal(game.revealIndex, 0);
  game = nextPair(game);
  assert.equal(game.revealIndex, 1);
  game = nextPair(nextPair(game));
  assert.equal(game.phase, "done");
  assert.equal(game.pairs.length, 3);
  const again = playAgain(game);
  assert.equal(again.phase, "writing");
  assert.equal(again.round, 2);
  assert.deepEqual(again.entries, {});
  assert.deepEqual(again.pairs, []);
});
