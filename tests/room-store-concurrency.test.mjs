import assert from "node:assert/strict";
import test from "node:test";

import {
  createSupabaseRoomStore,
  isRoomConflict,
  versionOf,
} from "../lib/supabase-server-room-store.js";

/*
 * Room actions load, mutate and write back whole. Without a version check the
 * later of two overlapping writes silently erased the earlier one — two players
 * could claim the same seat, because both passed `if (seat.token)` against the
 * same starting state.
 *
 * The audit could not force this against the old in-memory store: its load
 * resolved without a real await boundary, so the requests never interleaved.
 * These tests interleave them explicitly.
 */

function makeStore(overrides = {}) {
  return createSupabaseRoomStore({
    namespace: `test-${Math.random().toString(36).slice(2)}`,
    memoryKey: `__test_${Math.random().toString(36).slice(2)}`,
    environment: {},
    ...overrides,
  });
}

test("a second write built on stale state is refused, not applied", async () => {
  const store = makeStore();
  await store.save({ roomCode: "ABC", seats: [] });

  const first = await store.load("ABC");
  const second = await store.load("ABC");

  first.seats = ["alice"];
  await store.save(first);

  // `second` was read before Alice's write landed.
  second.seats = ["bob"];
  await assert.rejects(() => store.save(second), isRoomConflict);

  const final = await store.load("ABC");
  assert.deepEqual(final.seats, ["alice"], "the first write must survive");
});

test("only one of several racing seat claims succeeds", async () => {
  const store = makeStore();
  await store.save({ roomCode: "RACE", seat: null });

  // Every claimant reads first, then all of them write — the shape of two
  // browsers hitting /api/<game>/rooms/<code> at the same instant.
  const claimants = ["a", "b", "c", "d", "e", "f"];
  const rooms = await Promise.all(claimants.map(() => store.load("RACE")));

  const outcomes = await Promise.allSettled(
    rooms.map((room, index) => {
      if (room.seat) throw new Error("seat already taken");
      room.seat = claimants[index];
      return store.save(room);
    }),
  );

  const won = outcomes.filter((outcome) => outcome.status === "fulfilled");
  assert.equal(won.length, 1, "exactly one claim may win");
  for (const outcome of outcomes.filter((o) => o.status === "rejected")) {
    assert.ok(isRoomConflict(outcome.reason), `expected a conflict, got ${outcome.reason}`);
  }

  const final = await store.load("RACE");
  assert.ok(claimants.includes(final.seat));
});

test("re-reading after a conflict lets the retry succeed", async () => {
  // What lib/api.js does: replay the action against freshly loaded state.
  const store = makeStore();
  await store.save({ roomCode: "RETRY", plays: [] });

  const stale = await store.load("RETRY");
  const other = await store.load("RETRY");
  other.plays = ["first"];
  await store.save(other);

  stale.plays = [...stale.plays, "second"];
  await assert.rejects(() => store.save(stale), isRoomConflict);

  const fresh = await store.load("RETRY");
  fresh.plays = [...fresh.plays, "second"];
  await store.save(fresh);

  const final = await store.load("RETRY");
  assert.deepEqual(final.plays, ["first", "second"], "neither play may be lost");
});

test("two simultaneous creates of the same code cannot both win", async () => {
  const store = makeStore();
  const outcomes = await Promise.allSettled([
    store.save({ roomCode: "NEW", owner: "alice" }),
    store.save({ roomCode: "NEW", owner: "bob" }),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
});

test("the version never leaks into a response body", async () => {
  const store = makeStore();
  await store.save({ roomCode: "HIDE", seats: ["a"] });
  const room = await store.load("HIDE");

  assert.equal(typeof versionOf(room), "number", "the store can still read it");
  assert.ok(!Object.keys(room).includes("__roomVersion"));
  assert.ok(!JSON.stringify(room).includes("__roomVersion"));
  assert.ok(!Object.keys({ ...room }).includes("__roomVersion"));
});

test("a room that has expired is treated as absent, not as a conflict", async () => {
  let clock = 1_000;
  const store = makeStore({ ttlSeconds: 1, now: () => clock });
  await store.save({ roomCode: "OLD", seats: [] });

  clock += 5_000;
  assert.equal(await store.load("OLD"), null);
  await store.save({ roomCode: "OLD", seats: ["fresh"] });
  assert.deepEqual((await store.load("OLD")).seats, ["fresh"]);
});
