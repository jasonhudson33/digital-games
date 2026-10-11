import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  COMPUTER_SPEEDS,
  DEFAULT_COMPUTER_DELAY_MS,
  computerDelayOf,
  computerSpeedLabel,
  computerSpeedProp,
  normalizeComputerDelay,
} from "../lib/computer-speed.js";
import { armComputerStep } from "../lib/use-computer-pacer.js";

test("the four speeds are Fast 300, Normal 600, Slow 1000 and Very slow 1500, and Normal is the default", () => {
  assert.deepEqual(COMPUTER_SPEEDS.map((speed) => [speed.label, speed.ms]), [["Fast", 300], ["Normal", 600], ["Slow", 1000], ["Very slow", 1500]]);
  assert.equal(DEFAULT_COMPUTER_DELAY_MS, 600);
});

test("only listed speeds are accepted, as a number or its string form", () => {
  for (const ms of [300, 600, 1000, 1500]) assert.equal(normalizeComputerDelay(ms), ms);
  assert.equal(normalizeComputerDelay("1000"), 1000);
  for (const bad of [0, 5, 599, 2000, -300, "fast-ish", "", " ", null, undefined, NaN, {}, [], true]) assert.equal(normalizeComputerDelay(bad), null, String(bad));
});

test("a room with no speed, or a damaged one, reads as Normal", () => {
  assert.equal(computerDelayOf({}), 600);
  assert.equal(computerDelayOf(null), 600);
  assert.equal(computerDelayOf({ computerDelayMs: 42 }), 600);
  assert.equal(computerDelayOf({ computerDelayMs: 1500 }), 1500);
});

test("labels follow the value, with Normal for anything unknown", () => {
  assert.equal(computerSpeedLabel(300), "Fast");
  assert.equal(computerSpeedLabel(1500), "Very slow");
  assert.equal(computerSpeedLabel(777), "Normal");
});

test("the control's props exist only when a computer player is seated", () => {
  const onChange = () => {};
  assert.equal(computerSpeedProp({ players: [{ isComputer: false }, {}], delayMs: 300, onChange }), null);
  assert.equal(computerSpeedProp({ players: [], delayMs: 300, onChange }), null);
  assert.equal(computerSpeedProp({ players: [{ isBot: true }], delayMs: 300, onChange }).value, 300, "Risk calls its computers bots");
  assert.equal(computerSpeedProp({ players: undefined, delayMs: 300, onChange }), null);
  const prop = computerSpeedProp({ players: [{}, { isComputer: true }], delayMs: 1000, onChange });
  assert.deepEqual({ value: prop.value, same: prop.onChange === onChange }, { value: 1000, same: true });
  assert.equal(computerSpeedProp({ players: [{ isComputer: true }], onChange }).value, 600);
});

test("a step is taken once, after the delay, and cancelling stops it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let steps = 0;
  const cancel = armComputerStep(600, () => { steps += 1; }, { setTimeout, clearTimeout });
  t.mock.timers.tick(599);
  assert.equal(steps, 0);
  t.mock.timers.tick(1);
  assert.equal(steps, 1);
  const again = armComputerStep(300, () => { steps += 1; }, { setTimeout, clearTimeout });
  again();
  t.mock.timers.tick(5000);
  assert.equal(steps, 1, "a cancelled step never runs");
  cancel();
});
