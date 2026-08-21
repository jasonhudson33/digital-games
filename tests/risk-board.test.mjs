import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTINENTS, MAP_CONNECTIONS, PLAYER_STYLES, TERRITORIES,
  controlledContinents,
} from "../lib/risk.js";
import { EMBLEM_PATHS, emblemFor, inkFor, plateOver } from "../lib/risk-emblems.js";

/*
 * The board and the rules have to agree, and nothing was checking that.
 *
 * Madagascar was missing from CONTINENTS.africa.territories while claiming
 * continent:"africa" in TERRITORIES, so controlledContinents awarded the +3
 * Africa bonus to a player holding five of Africa's six territories, and
 * Madagascar itself counted towards nothing. Build, typecheck and 549 tests all
 * passed. The first two tests here are the ones that would have caught it.
 */

const ids = Object.keys(TERRITORIES);

test("every territory belongs to exactly one continent", () => {
  const listed = Object.values(CONTINENTS).flatMap((continent) => continent.territories);
  const counts = new Map();
  for (const id of listed) counts.set(id, (counts.get(id) ?? 0) + 1);

  const missing = ids.filter((id) => !counts.has(id));
  const twice = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
  const unknown = listed.filter((id) => !TERRITORIES[id]);

  assert.deepEqual(missing, [], "territories in no continent");
  assert.deepEqual(twice, [], "territories in more than one continent");
  assert.deepEqual(unknown, [], "continent lists a territory that does not exist");
  assert.equal(listed.length, ids.length);
});

test("each continent's list matches the territories claiming it", () => {
  for (const [id, continent] of Object.entries(CONTINENTS)) {
    const claiming = ids.filter((territoryId) => TERRITORIES[territoryId].continent === id).sort();
    assert.deepEqual(
      [...continent.territories].sort(),
      claiming,
      `${id}: CONTINENTS and TERRITORIES disagree about who is in it`,
    );
  }
});

test("a continent bonus needs every one of its territories", () => {
  for (const [id, continent] of Object.entries(CONTINENTS)) {
    const all = Object.fromEntries(ids.map((t) => [t, { ownerId: continent.territories.includes(t) ? "me" : "them", armies: 1 }]));
    assert.ok(controlledContinents(all, "me").includes(id), `holding all of ${id} does not award it`);

    // Dropping any single territory must lose the bonus.
    for (const held of continent.territories) {
      const short = { ...all, [held]: { ownerId: "them", armies: 1 } };
      assert.ok(
        !controlledContinents(short, "me").includes(id),
        `${id} is awarded without ${held}`,
      );
    }
  }
});

test("adjacency is symmetric and never self-referential", () => {
  for (const [id, territory] of Object.entries(TERRITORIES)) {
    assert.ok(!territory.neighbors.includes(id), `${id} borders itself`);
    assert.equal(new Set(territory.neighbors).size, territory.neighbors.length, `${id} lists a neighbour twice`);
    for (const other of territory.neighbors) {
      assert.ok(TERRITORIES[other], `${id} borders ${other}, which does not exist`);
      assert.ok(TERRITORIES[other].neighbors.includes(id), `${id} borders ${other} but not the other way round`);
    }
  }
});

test("the board is one connected graph", () => {
  const seen = new Set([ids[0]]);
  const queue = [ids[0]];
  while (queue.length) {
    for (const next of TERRITORIES[queue.pop()].neighbors) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  assert.deepEqual(ids.filter((id) => !seen.has(id)), [], "unreachable territories");
});

/* ── what the board draws ─────────────────────────────────────────────────── */

test("only cross-continent adjacencies are drawn as sea routes", () => {
  const sea = MAP_CONNECTIONS.filter(([a, b]) => TERRITORIES[a].continent !== TERRITORIES[b].continent);
  // All 83 used to be drawn, 69 of them restating a shared border.
  assert.ok(sea.length < MAP_CONNECTIONS.length / 4, `${sea.length} of ${MAP_CONNECTIONS.length} would be drawn`);
  for (const [a, b] of sea) {
    assert.ok(TERRITORIES[a].neighbors.includes(b), `${a}-${b} is drawn but is not an adjacency`);
  }
});

/* ── ownership is readable ────────────────────────────────────────────────── */

const luminance = (hex) => {
  const part = (at) => parseInt(hex.slice(at, at + 2), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return (0.2126 * lin(part(1))) + (0.7152 * lin(part(3))) + (0.0722 * lin(part(5)));
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

/** Viénot–Brettel LMS simulation of dichromatic vision. */
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

test("the army count is legible on every player colour", () => {
  // White on the old gold was 1.76:1; not one of the six reached 4.5:1.
  for (const style of PLAYER_STYLES) {
    const ratio = contrast(inkFor(style.color), plateOver(style.color));
    assert.ok(ratio >= 4.5, `${style.name} ${style.color} reads at ${ratio.toFixed(2)}:1`);
  }
});

test("the count stays legible on any colour, including ones no palette offers", () => {
  /* A colour right in the middle of the luminance range takes no legible ink,
   * which is why the count is drawn on a plate. Sweep the whole range rather
   * than only the colours currently on offer. */
  for (let n = 0; n <= 255; n += 5) {
    for (const hex of [
      `#${n.toString(16).padStart(2, "0").repeat(3)}`,
      `#${n.toString(16).padStart(2, "0")}80${(255 - n).toString(16).padStart(2, "0")}`,
    ]) {
      const ratio = contrast(inkFor(hex), plateOver(hex));
      assert.ok(ratio >= 4.5, `${hex} reads at ${ratio.toFixed(2)}:1`);
    }
  }
});

test("player colours stay distinct under colour blindness", () => {
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (const kind of ["deuteranopia", "protanopia", "tritanopia"]) {
    for (let i = 0; i < PLAYER_STYLES.length; i += 1) {
      for (let j = i + 1; j < PLAYER_STYLES.length; j += 1) {
        const apart = distance(simulate(PLAYER_STYLES[i].color, kind), simulate(PLAYER_STYLES[j].color, kind));
        // The old palette put red and green 26 apart under deuteranopia, and
        // blue and purple 16. Under about 40 reads as the same colour.
        assert.ok(
          apart >= 45,
          `${PLAYER_STYLES[i].name} and ${PLAYER_STYLES[j].name} are ${apart.toFixed(0)} apart under ${kind}`,
        );
      }
    }
  }
});

test("every player has a distinct emblem, so the board works in greyscale", () => {
  const emblems = PLAYER_STYLES.map((style) => style.emblem);
  assert.equal(new Set(emblems).size, emblems.length, "two players share an emblem");
  for (const emblem of emblems) assert.ok(EMBLEM_PATHS[emblem], `no path drawn for ${emblem}`);
});

test("games saved under the old palette still get an emblem and legible ink", () => {
  // Rooms store the colour hex, so colours that are no longer offered turn up.
  for (const old of ["#f0b84b", "#d85b4a", "#4ca39b", "#547fb5", "#8c68a6", "#6c965b"]) {
    assert.ok(EMBLEM_PATHS[emblemFor(old, PLAYER_STYLES)], `no emblem for retired colour ${old}`);
    assert.ok(contrast(inkFor(old), plateOver(old)) >= 4.5, `retired colour ${old} takes no legible ink`);
  }
  for (const junk of [undefined, null, "", "red", "#fff", 42]) {
    assert.match(inkFor(junk), /^#[0-9a-f]{6}$/, `inkFor(${JSON.stringify(junk)}) is not a colour`);
  }
});
