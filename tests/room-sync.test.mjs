import assert from "node:assert/strict";
import test from "node:test";

import { subscribeToRoomState } from "../lib/room-sync.js";

/** A clock the test drives by hand, shaped like the environment room-poll.js expects. */
function clock() {
  let nextId = 1;
  const timers = new Map();
  return {
    env: {
      setTimeout(fn) { const id = nextId++; timers.set(id, fn); return id; },
      clearTimeout(id) { timers.delete(id); },
      isHidden: () => false,
      onVisibilityChange: () => () => {},
    },
    /** Run the pending poll timer once and let its async load finish. */
    async tick() {
      const [id, fn] = [...timers.entries()][0] ?? [];
      if (!id) return false;
      timers.delete(id);
      await fn();
      return true;
    },
    pending: () => timers.size,
  };
}

function fakeChannel() {
  const listeners = [];
  return {
    closed: false,
    addEventListener(_type, listener) { listeners.push(listener); },
    close() { this.closed = true; },
    send(data) { for (const listener of listeners) listener({ data }); },
  };
}

function subscribe({ rooms }) {
  const time = clock();
  const channel = fakeChannel();
  const delivered = [];
  const stop = subscribeToRoomState({
    roomCode: " ab12c ",
    broadcastName: "test-room",
    load: async (code) => rooms[code] ?? null,
    handler: (state) => delivered.push(state),
    env: time.env,
    createChannel: () => channel,
  });
  return { time, channel, delivered, stop };
}

test("a poll delivers a newer state once and ignores an unchanged one", async () => {
  const rooms = { AB12C: { roomCode: "AB12C", updatedAt: 5, marker: "five" } };
  const { time, delivered } = subscribe({ rooms });
  await time.tick();
  assert.deepEqual(delivered.map((s) => s.marker), ["five"]);
  await time.tick();
  assert.equal(delivered.length, 1, "the same state is not delivered twice");
  rooms.AB12C = { roomCode: "AB12C", updatedAt: 6, marker: "six" };
  await time.tick();
  assert.deepEqual(delivered.map((s) => s.marker), ["five", "six"]);
});

test("a state older than the newest delivered is dropped, whichever channel it came on", async () => {
  const rooms = { AB12C: { roomCode: "AB12C", updatedAt: 10, marker: "ten" } };
  const { time, channel, delivered } = subscribe({ rooms });
  await time.tick();
  channel.send({ roomCode: "AB12C", updatedAt: 9, marker: "nine" });
  assert.deepEqual(delivered.map((s) => s.marker), ["ten"]);
  channel.send({ roomCode: "AB12C", updatedAt: 11, marker: "eleven" });
  assert.deepEqual(delivered.map((s) => s.marker), ["ten", "eleven"]);
  rooms.AB12C = { roomCode: "AB12C", updatedAt: 11, marker: "late poll of the same state" };
  await time.tick();
  assert.equal(delivered.length, 2, "the poll does not repeat what the broadcast already delivered");
});

test("a broadcast for another room is ignored", async () => {
  const { channel, delivered } = subscribe({ rooms: {} });
  channel.send({ roomCode: "ZZZZZ", updatedAt: 99 });
  assert.equal(delivered.length, 0);
});

test("stopping ends the poll and closes the channel", async () => {
  const { time, channel, stop } = subscribe({ rooms: {} });
  assert.equal(time.pending(), 1);
  stop();
  assert.equal(time.pending(), 0);
  assert.equal(channel.closed, true);
});

test("a failing load does not end the subscription", async () => {
  const time = clock();
  const delivered = [];
  let fail = true;
  subscribeToRoomState({
    roomCode: "AB12C",
    broadcastName: "x",
    load: async () => { if (fail) throw new Error("offline"); return { roomCode: "AB12C", updatedAt: 1 }; },
    handler: (state) => delivered.push(state),
    env: time.env,
    createChannel: () => null,
  });
  await time.tick();
  assert.equal(time.pending(), 1, "the next poll is still scheduled");
  fail = false;
  await time.tick();
  assert.equal(delivered.length, 1);
});
