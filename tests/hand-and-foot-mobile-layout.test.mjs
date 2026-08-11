import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/hand-and-foot/hand-and-foot.css", import.meta.url), "utf8");

test("overflowing Hand and Foot cards remain reachable from the left edge", () => {
  const handRule = css.match(/\.hf-hand\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(
    handRule,
    /justify-content:\s*safe center\s*;/,
    "The scrollable hand must use safe centering so overflow falls back to the reachable start edge.",
  );
});
