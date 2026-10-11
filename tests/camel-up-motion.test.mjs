import assert from "node:assert/strict";
import test from "node:test";

import { diffCamelPositions } from "../lib/camel-up-motion.js";

test("a single camel that changes space is reported with where it came from and went", () => {
  const diff = diffCamelPositions({ 1: ["blue", "red"], 5: ["green"] }, { 1: ["red"], 5: ["green"], 3: ["blue"] });
  assert.deepEqual(diff.changes, { blue: { from: 1, to: 3 } });
  assert.deepEqual(diff.moved, ["blue"]);
  assert.deepEqual(diff.units, [{ from: 1, to: 3, camels: ["blue"] }]);
});

test("a carried stack moves as one unit ordered bottom to top as it now sits", () => {
  const diff = diffCamelPositions({ 4: ["blue", "black", "red"], 6: ["green"] }, { 4: ["blue"], 6: ["green", "black", "red"] });
  assert.deepEqual(diff.moved.sort(), ["black", "red"]);
  assert.deepEqual(diff.units, [{ from: 4, to: 6, camels: ["black", "red"] }]);
});

test("a booing shift lands under the stack and still reads as one unit", () => {
  const diff = diffCamelPositions({ 5: ["blue", "red"], 6: ["green"] }, { 6: ["blue", "red", "green"] });
  assert.deepEqual(diff.units, [{ from: 5, to: 6, camels: ["blue", "red"] }]);
  assert.equal(diff.changes.green, undefined);
});

test("a crazy camel moving counterclockwise is reported", () => {
  const diff = diffCamelPositions({ 16: ["black", "white"] }, { 16: ["white"], 14: ["black"] });
  assert.deepEqual(diff.changes, { black: { from: 16, to: 14 } });
});

test("camels that only change height within a space are not reported as moved", () => {
  const diff = diffCamelPositions({ 3: ["blue", "red"] }, { 3: ["red", "blue"] });
  assert.deepEqual(diff.moved, []);
  assert.deepEqual(diff.units, []);
});

test("identical stacks and missing previous or next state report nothing", () => {
  const stacks = { 2: ["green"] };
  for (const [prev, next] of [[stacks, stacks], [null, stacks], [undefined, stacks], [stacks, null]]) {
    assert.deepEqual(diffCamelPositions(prev, next), { changes: {}, moved: [], units: [] });
  }
});
