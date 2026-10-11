import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/hand-and-foot/hand-and-foot.css", import.meta.url), "utf8");
const client = await readFile(new URL("../components/hand-and-foot-client.js", import.meta.url), "utf8");

// Superseded "overflowing cards stay reachable" (safe centring on a scrolling
// hand): the hand no longer scrolls, it overlaps and wraps (platform/card-hands).
test("the Hand and Foot hand is a card fan, so no card can be out of reach", () => {
  const handRule = css.match(/\.hf-hand\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(client, /<CardFan className="hf-hand"/, "The hand must render through the shared card fan.");
  assert.doesNotMatch(handRule, /overflow-x\s*:\s*(auto|scroll)/, "The hand must not scroll sideways.");
  assert.match(handRule, /--card-w\s*:/, "The hand must tell the fan how wide one card is.");
});
