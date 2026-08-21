import assert from "node:assert/strict";
import test from "node:test";

import {
  GEM_COLORS, GEM_INFO, addComputerPlayer, createDevelopmentDecks, createLobby,
  currentPlayer, hasLegalMove, passTurn, purchaseCard, runComputerTurn, startGame,
} from "../lib/splendor.js";

/*
 * The deck, the dead end, and the discs.
 *
 * Each of these covers something that shipped broken and that nothing was
 * watching: a card whose cost sat on the wrong colour, a position with no legal
 * move and no way out of it, and six gem colours that could not carry their own
 * numbers.
 */

/* ── the deck ─────────────────────────────────────────────────────────────── */

const decks = createDevelopmentDecks(() => 0.5);
const all = [1, 2, 3].flatMap((level) => decks[level]);

test("the deck is 40/30/20 with eight, six and four of each colour", () => {
  assert.equal(all.length, 90);
  for (const [level, size] of [[1, 40], [2, 30], [3, 20]]) {
    assert.equal(decks[level].length, size, `level ${level}`);
    for (const bonus of GEM_COLORS) {
      assert.equal(
        decks[level].filter((card) => card.bonus === bonus).length,
        size / 5,
        `level ${level} ${bonus}`,
      );
    }
  }
});

test("every colour is demanded equally at every level", () => {
  // A level-1 white card carried 2 sapphire + 2 emerald where the published card
  // costs 2 onyx + 2 sapphire, which left level 1 asking for 35 emeralds and 31
  // onyx against 33 of everything else. Nothing else in the deck was wrong.
  for (const [level, expected] of [[1, 33], [2, 41], [3, 43]]) {
    const demand = Object.fromEntries(GEM_COLORS.map((color) => [color, 0]));
    for (const card of decks[level]) {
      for (const [color, count] of Object.entries(card.cost)) demand[color] += count;
    }
    for (const color of GEM_COLORS) {
      assert.equal(demand[color], expected, `level ${level} demands ${demand[color]} ${color}, expected ${expected}`);
    }
  }
});

test("prestige is distributed as the published deck does", () => {
  const points = (level) => decks[level].map((card) => card.points).sort().join("");
  assert.equal(points(1), "0".repeat(35) + "1".repeat(5));
  assert.equal(points(2), "1".repeat(10) + "2".repeat(15) + "3".repeat(5));
  assert.equal(points(3), "3".repeat(5) + "4".repeat(10) + "5".repeat(5));
});

test("level 3 is symmetric under the colour cycle", () => {
  // The published level 3 has this property and the other levels do not, so it
  // is a genuine check on level 3 rather than a rule about the whole deck.
  const CYCLE = ["black", "white", "blue", "green", "red"];
  const shape = (bonus) => decks[3].filter((card) => card.bonus === bonus)
    .map((card) => `${card.points}:${CYCLE.map((c) => card.cost[c] ?? 0).join(",")}`).sort().join("|");
  const rotated = (bonus) => {
    const from = CYCLE.indexOf(bonus);
    return decks[3].filter((card) => card.bonus === CYCLE[(from + 4) % 5])
      .map((card) => {
        const cost = Object.fromEntries(CYCLE.map((c, i) => [CYCLE[(i + 1) % 5], card.cost[c] ?? 0]));
        return `${card.points}:${CYCLE.map((c) => cost[c]).join(",")}`;
      }).sort().join("|");
  };
  for (const bonus of CYCLE) assert.equal(shape(bonus), rotated(bonus), bonus);
});

/* ── the dead end ─────────────────────────────────────────────────────────── */

function stuckGame() {
  let game = createLobby({ id: "a", name: "A" }, "TEST");
  game = addComputerPlayer(game, { id: "b", name: "B" });
  game = startGame(game, () => 0.5);
  game.players = game.players.map((player) => ({
    ...player,
    reserved: [{ id: "x", level: 3, bonus: "red", points: 5, cost: { red: 7, black: 3 } }],
  }));
  return {
    ...game,
    currentPlayerIndex: 0,
    bank: { ...Object.fromEntries(GEM_COLORS.map((color) => [color, 0])), gold: 4 },
    decks: { 1: [], 2: [], 3: [] },
    market: { 1: [], 2: [], 3: [] },
  };
}

test("a player with nothing to do can pass", () => {
  const game = stuckGame();
  assert.equal(hasLegalMove(game, "a"), false);
  const after = passTurn(game, "a");
  assert.notEqual(after, game, "passing left the game untouched");
  assert.equal(after.currentPlayerIndex, 1, "the turn did not advance");
});

test("passing is refused whenever anything else is legal", () => {
  const game = { ...stuckGame(), bank: { ...Object.fromEntries(GEM_COLORS.map((c) => [c, 2])), gold: 4 } };
  assert.equal(hasLegalMove(game, "a"), true);
  assert.equal(passTurn(game, "a"), game, "a player was allowed to skip a usable turn");
});

test("the bot never returns the same state, so a driver cannot hang", () => {
  const game = { ...stuckGame(), currentPlayerIndex: 1 };
  const after = runComputerTurn(game);
  assert.notEqual(after, game);
  assert.equal(after.currentPlayerIndex, 0);
});

test("a full bot game always terminates", () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    let state = seed * 7919;
    const rng = () => { state = (state * 1103515245 + 12345) & 0x7fffffff; return state / 0x7fffffff; };
    let game = createLobby({ id: "p0", name: "P0" }, "T");
    game.players[0].isComputer = true;
    for (let i = 1; i < 2 + (seed % 3); i += 1) game = addComputerPlayer(game, { id: `p${i}`, name: `P${i}` });
    game = startGame(game, rng);
    let actions = 0;
    while (game.phase === "playing" && actions < 3000) {
      const before = game;
      game = runComputerTurn(game, rng);
      assert.notEqual(game, before, `seed ${seed} stalled after ${actions} actions`);
      actions += 1;
    }
    assert.equal(game.phase, "finished", `seed ${seed} did not finish in ${actions} actions`);
  }
});

/* ── the market does not jump ─────────────────────────────────────────────── */

test("a bought card is replaced in the slot it left", () => {
  let game = createLobby({ id: "a", name: "A" }, "T");
  game = addComputerPlayer(game, { id: "b", name: "B" });
  game = startGame(game, () => 0.5);
  game.players[0].tokens = { white: 7, blue: 7, green: 7, red: 7, black: 7, gold: 5 };
  game.currentPlayerIndex = 0;
  for (const slot of [0, 1, 2, 3]) {
    const before = game.market[1].map((card) => card.id);
    const after = purchaseCard(game, "a", { kind: "market", level: 1, index: slot }).market[1].map((card) => card.id);
    assert.equal(after.length, 4);
    for (let i = 0; i < 4; i += 1) {
      if (i === slot) continue;
      assert.equal(after[i], before[i], `buying slot ${slot} moved the card in slot ${i}`);
    }
  }
});

/* ── the discs ────────────────────────────────────────────────────────────── */

const luminance = (hex) => {
  const part = (at) => parseInt(hex.slice(at, at + 2), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return (0.2126 * lin(part(1))) + (0.7152 * lin(part(3))) + (0.0722 * lin(part(5)));
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

function simulate(hex, kind) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((at) => lin(parseInt(hex.slice(at, at + 2), 16) / 255));
  const L = (17.8824 * r) + (43.5161 * g) + (4.11935 * b);
  const M = (3.45565 * r) + (27.1554 * g) + (3.86714 * b);
  const S = (0.0299566 * r) + (0.184309 * g) + (1.46709 * b);
  let [l, m, s] = [L, M, S];
  if (kind === "deuteranopia") m = (0.494207 * L) + (1.24827 * S);
  if (kind === "protanopia") l = (2.02344 * M) - (2.52581 * S);
  if (kind === "tritanopia") s = (-0.395913 * L) + (0.801109 * M);
  const enc = (c) => {
    const v = Math.max(0, Math.min(1, c));
    return Math.round((v <= 0.00304 ? 12.92 * v : (1.055 * (v ** (1 / 2.4))) - 0.055) * 255);
  };
  return [
    enc((0.0809444479 * l) + (-0.130504409 * m) + (0.116721066 * s)),
    enc((-0.0102485335 * l) + (0.0540193266 * m) + (-0.113614708 * s)),
    enc((-0.000365296938 * l) + (-0.00412161469 * m) + (0.693511405 * s)),
  ];
}

test("every gem carries its number legibly", () => {
  // White on gold used to be 2.21:1, on emerald 3.77:1, on ruby 4.46:1.
  for (const [id, gem] of Object.entries(GEM_INFO)) {
    const ratio = contrast(gem.ink, gem.hex);
    assert.ok(ratio >= 4.5, `${id} ${gem.hex} reads at ${ratio.toFixed(2)}:1`);
  }
});

test("no two gems collapse into each other under colour blindness", () => {
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const ids = Object.keys(GEM_INFO);
  for (const kind of ["deuteranopia", "protanopia", "tritanopia"]) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const apart = distance(simulate(GEM_INFO[ids[i]].hex, kind), simulate(GEM_INFO[ids[j]].hex, kind));
        // Emerald and ruby were 25 apart under deuteranopia, sapphire and
        // emerald 28 under tritanopia. Under about 45 reads as one colour.
        assert.ok(apart >= 45, `${ids[i]} and ${ids[j]} are ${apart.toFixed(0)} apart under ${kind}`);
      }
    }
  }
});

test("every gem has a distinct letter, so the board works in greyscale", () => {
  const marks = Object.values(GEM_INFO).map((gem) => gem.short);
  assert.equal(new Set(marks).size, marks.length);
  for (const mark of marks) assert.match(mark, /^[A-Z]$/);
});
