import assert from "node:assert/strict";
import test from "node:test";

import { lifeAdapter, lifeView } from "../lib/life-room-adapter.js";
import { currentLifePlayer } from "../lib/life.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(lifeAdapter, options);

async function pastPath(ctx, choice = "college") {
  const stored = await ctx.store.load(ctx.code);
  const chooser = ctx.seats.find((s) => s.playerId === stored.pending.playerId);
  await ctx.room.act({ roomCode: ctx.code, token: chooser.token, action: "path", args: { path: choice } });
  return ctx.store.load(ctx.code);
}

test("a spin request that carries a number gets the server's own spin", async () => {
  const ctx = await start({ humans: 2 });
  const stored = await pastPath(ctx);
  assert.equal(stored.pending, null);
  const seat = ctx.seats.find((s) => s.playerId === currentLifePlayer(stored).id);
  // The server's own random source decides: with it pinned to 0 the spin is 1, whatever number the request names.
  const realRandom = Math.random;
  Math.random = () => 0;
  let view;
  try {
    view = (await ctx.room.act({ roomCode: ctx.code, token: seat.token, action: "spin", args: { number: 10, forcedSpin: 10, spin: 10 } })).state;
  } finally {
    Math.random = realRandom;
  }
  assert.equal(view.lastSpin.number, 1);
});

test("LIFE tiles, the tile pool and the millionaire bonus are hidden until the game finishes", () => {
  const game = {
    phase: "playing",
    lifeTilePool: [10000, 20000],
    millionaireBonus: [30000, 40000, 50000, 60000],
    pending: null,
    players: [
      { id: "a", lifeTiles: [70000, 80000], career: null },
      { id: "b", lifeTiles: [90000], career: null },
    ],
  };
  const view = lifeView(game, "a");
  assert.deepEqual(view.players[0].lifeTiles, [70000, 80000]);
  assert.deepEqual(view.players[1].lifeTiles, []);
  assert.equal(view.players[1].lifeTileCount, 1);
  assert.deepEqual(view.lifeTilePool, []);
  assert.equal(view.lifeTilePoolCount, 2);
  assert.deepEqual(view.millionaireBonus, []);
  assert.equal(view.millionaireBonusCount, 4);
  assert.equal(JSON.stringify(view).includes("90000"), false);

  const finished = lifeView({ ...game, phase: "finished" }, "a");
  assert.deepEqual(finished.players[1].lifeTiles, [90000]);
  assert.deepEqual(finished.millionaireBonus, game.millionaireBonus);
});

test("career cards on offer are shown only to the seat choosing among them", async () => {
  const ctx = await start({ humans: 2 });
  let stored = await ctx.store.load(ctx.code);
  const chooserId = stored.pending.playerId;
  const chooser = ctx.seats.find((s) => s.playerId === chooserId);
  const other = ctx.seats.find((s) => s.playerId !== chooserId);
  await ctx.room.act({ roomCode: ctx.code, token: chooser.token, action: "path", args: { path: "career" } });
  stored = await ctx.store.load(ctx.code);
  assert.equal(stored.pending.type, "career");
  const offered = stored.pending.options.map((o) => o.id);
  const mine = (await ctx.room.get({ roomCode: ctx.code, token: chooser.token })).state;
  assert.deepEqual(mine.pending.options.map((o) => o.id), offered);
  const theirs = (await ctx.room.get({ roomCode: ctx.code, token: other.token })).state;
  assert.equal(theirs.pending.type, "career", "others still see that a choice is pending");
  assert.deepEqual(theirs.pending.options, []);
  assert.equal(theirs.players.find((p) => p.id === chooserId).careerOptions, undefined);
  assertNoneLeaked(theirs, offered.map((id) => id), "career option");
  await assert.rejects(() => ctx.room.act({ roomCode: ctx.code, token: other.token, action: "career", args: { careerId: offered[0] } }), /not available/);
  await ctx.room.act({ roomCode: ctx.code, token: chooser.token, action: "career", args: { careerId: offered[0] } });
});

test("out-of-turn spins, bad paths and an unknown retirement are rejected", async () => {
  const ctx = await start({ humans: 2 });
  let stored = await ctx.store.load(ctx.code);
  const other = ctx.seats.find((s) => s.playerId !== stored.pending.playerId);
  await assert.rejects(() => ctx.room.act({ roomCode: ctx.code, token: other.token, action: "path", args: { path: "college" } }), /not available/);
  await assert.rejects(() => ctx.room.act({ roomCode: ctx.code, token: other.token, action: "spin" }), /not available/);
  const chooser = ctx.seats.find((s) => s.playerId === stored.pending.playerId);
  await assert.rejects(() => ctx.room.act({ roomCode: ctx.code, token: chooser.token, action: "retirement", args: { destination: "millionaire" } }), /not available/);
});

test("the lobby runs on the server and only the host can start it", async () => {
  const ctx = await start({ humans: 2 });
  assert.equal((await ctx.store.load(ctx.code)).phase, "playing");
  const fresh = await startedRoom(lifeAdapter, { humans: 2, before: async ({ room, code, seats }) => {
    await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "start" }), /Only the host/);
  } });
  assert.equal(fresh.raw.players.length, 2);
});

test("computer steps are host only and computers finish their moves", async () => {
  const ctx = await start({ humans: 2, computers: 1 });
  await assert.rejects(() => ctx.room.computerStep({ roomCode: ctx.code, token: ctx.seats[1].token }), /Only the host/);
  for (let i = 0; i < 300; i += 1) {
    const stored = await ctx.store.load(ctx.code);
    const turn = currentLifePlayer(stored);
    if (stored.phase !== "playing" || !turn?.isComputer) break;
    await ctx.room.computerStep({ roomCode: ctx.code, token: ctx.seats[0].token });
  }
  const settled = await ctx.store.load(ctx.code);
  assert.ok(settled.phase !== "playing" || !currentLifePlayer(settled)?.isComputer);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/life/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
