import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Every hand a player holds is laid out by the shared fan (platform/card-hands):
// it is rendered through <CardFan>, and its stylesheet neither scrolls it
// sideways nor sizes the slot itself.
const HANDS = [
  ["hearts", "player-hand"], ["scum", "scum-hand"], ["scum", "trade-hand"], ["pinochle", "pn-hand"],
  ["seven-up", "hand"], ["hand-and-foot", "hf-hand"], ["five-crowns", "fc-hand"], ["skull-king", "skull-hand"],
  ["uno", "tbl-hand"], ["dos", "tbl-hand"], ["phase-10", "p10-hand"], ["sequence", "sequence-cards"],
  ["dominion", "dom-hand"], ["killer-bunnies", "kb-hand"],
];
const SHEETS = {
  hearts: "app/hearts/hearts.css", scum: "app/scum/scum.css", pinochle: "app/pinochle/pinochle.css",
  "seven-up": "app/globals.css", "hand-and-foot": "app/hand-and-foot/hand-and-foot.css",
  "five-crowns": "app/five-crowns/five-crowns.css", "skull-king": "app/skull-king/skull-king.css",
  uno: "app/table.css", dos: "app/table.css", "phase-10": "app/phase-10/phase-10.css",
  sequence: "app/sequence/sequence.css", dominion: "app/dominion/dominion.css", "killer-bunnies": "app/killer-bunnies/killer-bunnies.css",
};
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

for (const [game, hand] of HANDS) {
  test(`${game}: .${hand} is a card fan that never scrolls sideways`, async () => {
    const client = await read(`components/${game}-client.js`);
    const css = await read(SHEETS[game]);
    assert.match(client, new RegExp(`<CardFan className="${hand}"`), "render the hand through <CardFan>");
    const rules = [...css.matchAll(new RegExp(`(?:^|[}\\s,])\\.${hand}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);
    assert.ok(rules.length > 0, `a .${hand} rule is expected`);
    for (const rule of rules) assert.doesNotMatch(rule, /overflow-x\s*:\s*(auto|scroll)/, "the hand must not scroll sideways");
  });
}

test("the fan sizes its own slots, and a card dims by filter, never by opacity", async () => {
  const css = await read("app/table.css");
  assert.match(css, /\.tbl-fan\s*>\s*\*\s*\{[^}]*flex:\s*0 0 var\(--card-w\)/, "slot width comes from --card-w");
  assert.match(css, /\.tbl-fan\s*>\s*\*\s*\{[^}]*isolation:\s*isolate/, "each slot is its own stacking context");
  assert.match(css, /\.tbl-fan\s*>\s*\.tbl-card:disabled\s*\{[^}]*opacity:\s*1/, "a disabled card stays opaque so overlap does not show through");
});
