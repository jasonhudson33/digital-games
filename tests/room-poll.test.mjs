import assert from "node:assert/strict";
import test from "node:test";

import { createRoomPoll } from "../lib/room-poll.js";

/**
 * A controllable clock and visibility flag, so backoff and pause behaviour can
 * be asserted without waiting real seconds.
 */
function harness() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  let hidden = false;
  const visibilityHandlers = new Set();

  const env = {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + ms, delay: ms, fn });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    isHidden: () => hidden,
    onVisibilityChange(handler) {
      visibilityHandlers.add(handler);
      return () => visibilityHandlers.delete(handler);
    },
  };

  /** Run every timer due at or before now + ms, then advance the clock. */
  async function advance(ms) {
    const target = now + ms;
    for (let guard = 0; guard < 1000; guard += 1) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      timers.delete(id);
      now = timer.at;
      await timer.fn();
      await Promise.resolve();
    }
    now = target;
  }

  return {
    env,
    advance,
    setHidden(value) {
      hidden = value;
      for (const handler of visibilityHandlers) handler();
    },
    pending: () => timers.size,
    // The interval each pending timer was scheduled with — not its remaining
    // time, which depends on where advance() left the clock.
    delays: () => [...timers.values()].map((timer) => timer.delay),
  };
}

test("polls immediately and delivers the first state", async () => {
  const h = harness();
  const seen = [];
  let loads = 0;
  createRoomPoll({
    load: async () => {
      loads += 1;
      return { updatedAt: 1, value: "a" };
    },
    onState: (state) => seen.push(state.value),
    env: h.env,
  });

  await h.advance(0);
  assert.equal(loads, 1);
  assert.deepEqual(seen, ["a"]);
});

test("only reports state with a newer updatedAt", async () => {
  const h = harness();
  const seen = [];
  let updatedAt = 5;
  createRoomPoll({
    load: async () => ({ updatedAt, value: `v${updatedAt}` }),
    onState: (state) => seen.push(state.value),
    env: h.env,
  });

  await h.advance(0);
  await h.advance(1200);
  await h.advance(1200);
  assert.deepEqual(seen, ["v5"], "unchanged polls do not re-notify");

  updatedAt = 6;
  await h.advance(1200);
  assert.deepEqual(seen, ["v5", "v6"]);
});

test("backs off while the room is quiet and snaps back when it changes", async () => {
  const h = harness();
  let updatedAt = 1;
  createRoomPoll({
    load: async () => ({ updatedAt }),
    onState: () => {},
    baseInterval: 1000,
    maxInterval: 8000,
    quietPolls: 2,
    env: h.env,
  });

  await h.advance(0);
  assert.deepEqual(h.delays(), [1000]);

  await h.advance(1000);
  await h.advance(1000);
  assert.deepEqual(h.delays(), [2000], "two quiet polls double the interval");

  await h.advance(2000);
  await h.advance(2000);
  assert.deepEqual(h.delays(), [4000]);

  updatedAt = 2;
  await h.advance(4000);
  assert.deepEqual(h.delays(), [1000], "a change resets to the base interval");
});

test("backoff is capped at maxInterval", async () => {
  const h = harness();
  createRoomPoll({
    load: async () => ({ updatedAt: 1 }),
    onState: () => {},
    baseInterval: 1000,
    maxInterval: 4000,
    quietPolls: 1,
    env: h.env,
  });

  await h.advance(0);
  for (let index = 0; index < 10; index += 1) await h.advance(8000);
  assert.deepEqual(h.delays(), [4000]);
});

test("a hidden tab does not fetch, and refetches once on becoming visible", async () => {
  const h = harness();
  let loads = 0;
  createRoomPoll({
    load: async () => {
      loads += 1;
      return { updatedAt: loads };
    },
    onState: () => {},
    baseInterval: 1000,
    env: h.env,
  });

  await h.advance(0);
  assert.equal(loads, 1);

  h.setHidden(true);
  await h.advance(10_000);
  assert.equal(loads, 1, "no fetches while hidden");

  h.setHidden(false);
  await h.advance(0);
  assert.equal(loads, 2, "one immediate fetch on return");
});

test("a failing load neither throws nor stops the loop", async () => {
  const h = harness();
  const seen = [];
  let fail = true;
  createRoomPoll({
    load: async () => {
      if (fail) throw new Error("network");
      return { updatedAt: 9, value: "back" };
    },
    onState: (state) => seen.push(state.value),
    baseInterval: 1000,
    env: h.env,
  });

  await h.advance(0);
  await h.advance(1000);
  assert.deepEqual(seen, []);
  assert.equal(h.pending(), 1, "still scheduled after failures");

  fail = false;
  await h.advance(1000);
  assert.deepEqual(seen, ["back"]);
});

test("stop clears the timer and drops the visibility listener", async () => {
  const h = harness();
  let loads = 0;
  const stop = createRoomPoll({
    load: async () => {
      loads += 1;
      return { updatedAt: loads };
    },
    onState: () => {},
    baseInterval: 1000,
    env: h.env,
  });

  await h.advance(0);
  stop();
  assert.equal(h.pending(), 0);

  await h.advance(10_000);
  assert.equal(loads, 1);

  h.setHidden(false);
  await h.advance(10_000);
  assert.equal(loads, 1, "stopped polls are not resurrected by visibility");
});
