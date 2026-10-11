import assert from "node:assert/strict";
import test from "node:test";

import { MAX_PLAYED, planReplay, timeline } from "../lib/viticulture-replay.js";

const ev = (seq, type = "coins") => ({ seq, type });
const run = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => ev(from + index));

test("a first load or a rejoin shows the present and plays nothing", () => {
  assert.deepEqual(planReplay({ lastSeq: null, events: run(1, 9) }), { play: [], nextSeq: 9 });
  assert.deepEqual(planReplay({ lastSeq: undefined, events: run(40, 99) }), { play: [], nextSeq: 99 });
  assert.deepEqual(planReplay({ lastSeq: null, events: [] }), { play: [], nextSeq: 0 });
});

test("only events newer than the last seen are played, in order", () => {
  const { play, nextSeq } = planReplay({ lastSeq: 4, events: run(1, 7) });
  assert.deepEqual(play.map((event) => event.seq), [5, 6, 7]);
  assert.equal(nextSeq, 7);
});

test("nothing new plays nothing and never moves the cursor back", () => {
  assert.deepEqual(planReplay({ lastSeq: 7, events: run(1, 7) }), { play: [], nextSeq: 7 });
  assert.deepEqual(planReplay({ lastSeq: 7, events: [] }), { play: [], nextSeq: 7 });
});

test("a hidden tab and reduced motion skip the motion but keep the cursor current", () => {
  assert.deepEqual(planReplay({ lastSeq: 2, events: run(1, 6), hidden: true }), { play: [], nextSeq: 6 });
  assert.deepEqual(planReplay({ lastSeq: 2, events: run(1, 6), reduced: true }), { play: [], nextSeq: 6 });
});

test("a long backlog plays only its latest events", () => {
  const { play, nextSeq } = planReplay({ lastSeq: 1, events: run(1, 60) });
  assert.equal(play.length, MAX_PLAYED);
  assert.equal(play[play.length - 1].seq, 60);
  assert.equal(nextSeq, 60);
});

test("events that fell off the capped list leave a gap that is skipped, not guessed at", () => {
  assert.deepEqual(planReplay({ lastSeq: 3, events: run(40, 99) }), { play: [], nextSeq: 99 });
});

test("the timeline starts quick events together and lets a worker's flight hold the queue", () => {
  const items = timeline([ev(1, "worker-placed"), ev(2, "coins"), ev(3, "vp"), ev(4, "season-changed")]);
  assert.deepEqual(items.map((item) => item.delay), [0, 600, 740, 880]);
  assert.deepEqual(items.map((item) => item.event.seq), [1, 2, 3, 4]);
  assert.deepEqual(timeline([]), []);
});
