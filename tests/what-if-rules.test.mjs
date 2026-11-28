import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PLAYERS,
  MAX_TEXT,
  addComputerPlayer,
  addPlayer,
  computerToWrite,
  continueNow,
  createLobby,
  dealIfs,
  nextPair,
  playAgain,
  removeComputerPlayer,
  runComputerStep,
  startGame,
  submitText,
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

const ids = (count) => Array.from({ length: count }, (_, index) => `p${index}`);

/** Everyone writes an IF ("if-p3"), then a THEN ("then-p3"). */
function playToReveal(count, seed = 1) {
  let game = startGame(table(count));
  for (const id of ids(count)) game = submitText(game, id, `if-${id}`, seeded(seed));
  for (const id of ids(count)) game = submitText(game, id, `then-${id}`, seeded(seed + 1));
  return game;
}

test("start needs three players and the table holds at most twenty", () => {
  assert.throws(() => startGame(table(2)), /at least 3/);
  assert.equal(startGame(table(3)).phase, "ifs");
  const full = table(MAX_PLAYERS);
  assert.equal(addPlayer(full, { id: "extra", name: "Late" }), full);
});

test("step one: everyone writes only a What if; blank is refused, edits replace, text is capped", () => {
  let game = startGame(table(3));
  assert.throws(() => submitText(game, "p0", "   "), /What if/);
  game = submitText(game, "p0", "  cats   could vote ");
  assert.equal(game.ifs.p0, "cats could vote");
  game = submitText(game, "p0", "x".repeat(500));
  assert.equal(game.ifs.p0.length, MAX_TEXT);
  assert.equal(game.phase, "ifs");
});

test("when every What if is in, each writer draws one at random, own included", () => {
  let game = startGame(table(4));
  for (const id of ["p0", "p1", "p2"]) game = submitText(game, id, `if-${id}`);
  assert.equal(game.phase, "ifs");
  game = submitText(game, "p3", "if-p3", seeded(2));
  assert.equal(game.phase, "thens");
  assert.deepEqual(Object.keys(game.draws).sort(), ids(4));
  assert.deepEqual(Object.values(game.draws).sort(), ids(4), "every IF is drawn exactly once");

  // Over many deals, drawing your own IF happens: it is allowed, not avoided.
  let base = startGame(table(3));
  for (const id of ids(3)) base = { ...base, ifs: { ...base.ifs, [id]: `if-${id}` } };
  let ownDraws = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const { draws } = dealIfs(base, seeded(seed));
    ownDraws += Object.entries(draws).filter(([drawer, author]) => drawer === author).length;
  }
  assert.ok(ownDraws > 0, "a player can draw their own What if");
});

test("step two: a Then is written for the drawn IF, and the last one in deals the reveal", () => {
  let game = startGame(table(3));
  for (const id of ids(3)) game = submitText(game, id, `if-${id}`, seeded(5));
  assert.throws(() => submitText(game, "p1", ""), /Then/);
  game = submitText(game, "p1", "then-p1");
  game = submitText(game, "p1", "then-p1 edited");
  assert.equal(game.thens.p1, "then-p1 edited");
  game = submitText(game, "p0", "then-p0");
  game = submitText(game, "p2", "then-p2", seeded(6));
  assert.equal(game.phase, "reveal");
  assert.equal(game.pairs.length, 3);
});

test("step three: THENs are dealt to IFs at random, each IF and THEN used once", () => {
  for (let count = 3; count <= MAX_PLAYERS; count += 1) {
    for (let seed = 1; seed <= 10; seed += 1) {
      const { pairs } = playToReveal(count, seed * 7 + count);
      assert.equal(pairs.length, count);
      assert.equal(new Set(pairs.map((pair) => pair.ifBy)).size, count);
      assert.equal(new Set(pairs.map((pair) => pair.thenBy)).size, count);
      for (const pair of pairs) {
        assert.equal(pair.ifText, `if-${pair.ifBy}`);
        assert.match(pair.thenText, /^then-p\d+$/);
        assert.equal(pair.thenText, `then-${pair.thenBy}`);
      }
    }
  }
});

test("the host can move on without stragglers once three are done", () => {
  let game = startGame(table(5));
  game = submitText(submitText(game, "p0", "if-p0"), "p1", "if-p1");
  assert.throws(() => continueNow(game), /At least 3/);
  game = continueNow(submitText(game, "p2", "if-p2"), seeded(3));
  assert.equal(game.phase, "thens");
  assert.deepEqual(Object.keys(game.draws).sort(), ["p0", "p1", "p2"], "players without an IF sit out");
  assert.equal(submitText(game, "p4", "late then"), game, "a non-drawer cannot write a Then");

  let five = startGame(table(5));
  for (const id of ids(5)) five = submitText(five, id, `if-${id}`, seeded(8));
  for (const id of ["p0", "p1", "p2"]) five = submitText(five, id, `then-${id}`);
  const revealed = continueNow(five, seeded(9));
  assert.equal(revealed.phase, "reveal");
  assert.equal(revealed.pairs.length, 3, "an IF whose drawer wrote no Then is dropped");
  const answered = new Set(["p0", "p1", "p2"].map((id) => five.draws[id]));
  assert.ok(revealed.pairs.every((pair) => answered.has(pair.ifBy)));
});

test("next steps through every pair, then play again starts a fresh round", () => {
  let game = playToReveal(3, 4);
  game = nextPair(game);
  assert.equal(game.revealIndex, 1);
  game = nextPair(nextPair(game));
  assert.equal(game.phase, "done");
  const again = playAgain(game);
  assert.equal(again.phase, "ifs");
  assert.equal(again.round, 2);
  assert.deepEqual([again.ifs, again.draws, again.thens, again.pairs], [{}, {}, {}, []]);
});

test("computer seats join and leave in the lobby only", () => {
  let game = addComputerPlayer(addComputerPlayer(table(1)));
  assert.equal(game.players.length, 3);
  assert.ok(game.players.slice(1).every((player) => player.isComputer));
  game = removeComputerPlayer(game, game.players[1].id);
  assert.equal(game.players.length, 2);
  assert.equal(removeComputerPlayer(game, "p0"), game);
  const started = startGame(addComputerPlayer(addComputerPlayer(table(1))));
  assert.equal(addComputerPlayer(started), started);
});

test("computers write their IF, then their THEN, one per step", () => {
  let game = startGame(addComputerPlayer(addComputerPlayer(table(1))));
  game = runComputerStep(runComputerStep(game, seeded(1)), seeded(2));
  assert.equal(computerToWrite(game), null);
  assert.equal(Object.keys(game.ifs).length, 2);
  assert.notEqual(Object.values(game.ifs)[0], Object.values(game.ifs)[1]);
  game = submitText(game, "p0", "I could fly", seeded(3));
  assert.equal(game.phase, "thens");
  assert.ok(computerToWrite(game));
  game = runComputerStep(runComputerStep(game, seeded(4)), seeded(5));
  game = submitText(game, "p0", "I'd never take the bus again", seeded(6));
  assert.equal(game.phase, "reveal");
  assert.equal(game.pairs.length, 3);
});

test("a table of one person and nineteen computers reaches the reveal", () => {
  let game = table(1);
  for (let index = 0; index < 19; index += 1) game = addComputerPlayer(game);
  game = submitText(startGame(game), "p0", "if-p0");
  for (let step = 0; step < 19; step += 1) game = runComputerStep(game, seeded(step + 11));
  game = submitText(game, "p0", "then-p0");
  for (let step = 0; step < 19; step += 1) game = runComputerStep(game, seeded(step + 41));
  assert.equal(game.phase, "reveal");
  assert.equal(game.pairs.length, 20);
});
