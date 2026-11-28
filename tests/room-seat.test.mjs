import assert from "node:assert/strict";
import test from "node:test";

import {
  StaleSeatError,
  forgetSeatToken,
  isStaleSeatError,
  readSeatToken,
  resumeRoom,
  writeSeatToken,
} from "../lib/room-seat.js";
import { createScumRoom, getScumRoom } from "../lib/scum-rooms.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function withStorage(fn) {
  const saved = { local: globalThis.localStorage, session: globalThis.sessionStorage };
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true, writable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: memoryStorage(), configurable: true, writable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(globalThis, "localStorage", { value: saved.local, configurable: true, writable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: saved.session, configurable: true, writable: true });
  }
}

test("a seat saved in session storage moves to local storage on read", () => withStorage(() => {
  sessionStorage.setItem("scum-room-token:ABCDE", "tok");
  assert.equal(readSeatToken("scum-room-token:ABCDE"), "tok");
  assert.equal(localStorage.getItem("scum-room-token:ABCDE"), "tok");
  assert.equal(sessionStorage.getItem("scum-room-token:ABCDE"), null);
}));

test("writing and forgetting a seat", () => withStorage(() => {
  writeSeatToken("k", "t");
  assert.equal(readSeatToken("k"), "t");
  forgetSeatToken("k");
  assert.equal(readSeatToken("k"), "");
}));

test("missing storage never throws", () => {
  const saved = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    get() { throw new Error("SecurityError"); },
    configurable: true,
  });
  try {
    assert.equal(readSeatToken("k"), "");
    assert.doesNotThrow(() => writeSeatToken("k", "t"));
    assert.doesNotThrow(() => forgetSeatToken("k"));
  } finally {
    Object.defineProperty(globalThis, "localStorage", { value: saved, configurable: true, writable: true });
  }
});

test("stale seats are told apart from temporary failures", () => {
  assert.equal(isStaleSeatError(new StaleSeatError()), true);
  assert.equal(isStaleSeatError(Object.assign(new Error("gone"), { status: 404 })), true);
  assert.equal(isStaleSeatError(Object.assign(new Error("not seated"), { status: 403 })), true);
  assert.equal(isStaleSeatError(new TypeError("Failed to fetch")), false);
  assert.equal(isStaleSeatError(Object.assign(new Error("boom"), { status: 500 })), false);
  assert.equal(isStaleSeatError(Object.assign(new Error("conflict"), { status: 409 })), false);
});

test("the legacy room modules' real rejections count as stale", async () => {
  const missing = await getScumRoom({ roomCode: "ZZZZZ", token: "x" }).catch((error) => error);
  assert.equal(isStaleSeatError(missing), true, missing.message);

  const created = await createScumRoom({ name: "Host" });
  const badSeat = await getScumRoom({ roomCode: created.state.roomCode, token: "not-a-seat" }).catch((error) => error);
  assert.equal(isStaleSeatError(badSeat), true, badSeat.message);
});

function harness() {
  const timers = new Map();
  let nextId = 1;
  const wakeHandlers = new Set();
  return {
    env: {
      setTimeout(fn, ms) { const id = nextId++; timers.set(id, { fn, ms }); return id; },
      clearTimeout(id) { timers.delete(id); },
      onWake(handler) { wakeHandlers.add(handler); return () => wakeHandlers.delete(handler); },
    },
    delays: () => [...timers.values()].map((timer) => timer.ms),
    async fire() {
      const pending = [...timers.entries()];
      timers.clear();
      for (const [, timer] of pending) await timer.fn();
      await flush();
    },
    async wake() {
      for (const handler of [...wakeHandlers]) handler();
      await flush();
    },
    wakeCount: () => wakeHandlers.size,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("a network failure keeps retrying with backoff until the room loads", async () => {
  const h = harness();
  let calls = 0;
  const events = [];
  resumeRoom({
    env: h.env,
    load: async () => {
      calls += 1;
      if (calls < 3) throw new TypeError("Failed to fetch");
      return { roomCode: "ABCDE" };
    },
    onState: (state) => events.push(["state", state.roomCode]),
    onStale: () => events.push(["stale"]),
    onRetrying: () => events.push(["retrying"]),
  });
  await flush();
  assert.deepEqual(h.delays(), [1000]);
  await h.fire();
  assert.deepEqual(h.delays(), [2000]);
  await h.fire();
  assert.deepEqual(events, [["retrying"], ["retrying"], ["state", "ABCDE"]]);
  assert.equal(h.wakeCount(), 0);
});

test("coming back online retries immediately", async () => {
  const h = harness();
  let online = false;
  const events = [];
  resumeRoom({
    env: h.env,
    load: async () => { if (!online) throw new TypeError("Failed to fetch"); return { roomCode: "ABCDE" }; },
    onState: () => events.push("state"),
    onStale: () => events.push("stale"),
  });
  await flush();
  online = true;
  await h.wake();
  assert.deepEqual(events, ["state"]);
});

test("a stale seat stops after one call to onStale", async () => {
  const h = harness();
  const events = [];
  resumeRoom({
    env: h.env,
    load: async () => { throw new Error("Room not found."); },
    onState: () => events.push("state"),
    onStale: () => events.push("stale"),
    onRetrying: () => events.push("retrying"),
  });
  await flush();
  assert.deepEqual(events, ["stale"]);
  assert.deepEqual(h.delays(), []);
});

test("a null load result is a room that no longer exists", async () => {
  const h = harness();
  const events = [];
  resumeRoom({ env: h.env, load: async () => null, onState: () => events.push("state"), onStale: () => events.push("stale") });
  await flush();
  assert.deepEqual(events, ["stale"]);
});

test("cancel stops retries", async () => {
  const h = harness();
  let calls = 0;
  const cancel = resumeRoom({
    env: h.env,
    load: async () => { calls += 1; throw new TypeError("Failed to fetch"); },
    onState: () => {},
    onStale: () => {},
  });
  await flush();
  cancel();
  await h.fire();
  await h.wake();
  assert.equal(calls, 1);
  assert.deepEqual(h.delays(), []);
});
