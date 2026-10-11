import assert from "node:assert/strict";
import test from "node:test";

import { checkLayout, LAYOUT_PARTS, UNMIGRATED, UNREACHABLE } from "../scripts/layout-check.mjs";

const all = LAYOUT_PARTS;

test("a migrated game showing every part passes", () => {
  assert.deepEqual(checkLayout("uno", all, []), { missing: [], stale: false });
});

test("a migrated game missing its game bar fails and names it", () => {
  const seen = all.filter((part) => part !== "game-bar");
  assert.deepEqual(checkLayout("uno", seen, []), { missing: ["game-bar"], stale: false });
});

test("an allowlisted game is not failed for missing parts", () => {
  assert.deepEqual(checkLayout("catan", [], ["catan"]), { missing: [], stale: false });
});

test("an allowlisted game that now shows every part is stale", () => {
  assert.deepEqual(checkLayout("catan", all, ["catan"]), { missing: [], stale: true });
});

test("every game is required to show a lobby", () => {
  const seen = all.filter((part) => part !== "lobby");
  assert.deepEqual(checkLayout("uno", seen, []), { missing: ["lobby"], stale: false });
});

test("the allowlist only names games that exist and has no duplicates", async () => {
  const { readFile } = await import("node:fs/promises");
  const catalogue = await readFile(new URL("../lib/games.js", import.meta.url), "utf8");
  const slugs = new Set([...catalogue.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]));
  assert.equal(new Set(UNMIGRATED).size, UNMIGRATED.length);
  for (const slug of UNMIGRATED) assert.ok(slugs.has(slug), `${slug} is not a game`);
});

test("a part the audit cannot reach is covered by a named test, not silently skipped", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const [slug, parts] of Object.entries(UNREACHABLE)) {
    assert.ok(parts.length > 0);
    const test = await readFile(new URL(`../tests/${slug}-layout.test.mjs`, import.meta.url), "utf8");
    for (const part of parts) assert.match(test, new RegExp(`data-layout="${part}"`), `${slug}: ${part} has a render test`);
  }
});

test("an unreachable part counts as shown for the game that declares it", () => {
  const seen = all.filter((part) => part !== "lobby");
  assert.deepEqual(checkLayout("mafia", seen, []), { missing: [], stale: false });
  assert.deepEqual(checkLayout("uno", seen, [], {}), { missing: ["lobby"], stale: false });
});
