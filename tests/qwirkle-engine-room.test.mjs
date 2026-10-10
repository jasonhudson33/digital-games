import assert from "node:assert/strict";
import test from "node:test";

import { qwirkleAdapter } from "../lib/qwirkle-room-adapter.js";
import { currentPlayer, openingGroups } from "../lib/qwirkle.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(qwirkleAdapter, options);

test("a seat sees its own rack and no other rack or bag tile", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const secret = [
      ...raw.players.filter((p) => p.id !== seat.playerId).flatMap((p) => p.hand.map((t) => t.id)),
      ...raw.bag.map((t) => t.id),
    ];
    assertNoneLeaked(view, secret, "private tile");
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).hand.map((t) => t.id), raw.players.find((p) => p.id === seat.playerId).hand.map((t) => t.id));
    assert.deepEqual(view.bag, []);
    assert.equal(view.bagCount, raw.bag.length);
    for (const other of view.players.filter((p) => p.id !== seat.playerId)) assert.equal(other.handCount, 6);
  }
});

test("tiles not held, the wrong seat, and an opening play of the wrong size are rejected", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  const waitingTile = raw.players.find((p) => p.id === waiting.playerId).hand[0];
  const mine = raw.players.find((p) => p.id === actor.playerId).hand;
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "play", args: { placements: [{ x: 0, y: 0, tileId: waitingTile.id }] } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { placements: [{ x: 0, y: 0, tileId: waitingTile.id }] } }), /not available/);
  if (raw.openingRequiredCount > 1) {
    await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { placements: [{ x: 0, y: 0, tileId: mine[0].id }] } }), /not available/);
  }
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "exchange", args: { tileIds: [waitingTile.id] } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { placements: "nope" } }), /not available/);
});

test("a legal opening play is scored on the server and the rack is refilled", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const hand = raw.players.find((p) => p.id === actor.playerId).hand;
  const group = openingGroups(hand)[0].slice(0, raw.openingRequiredCount);
  const placements = group.map((tile, index) => ({ x: index, y: 0, tileId: tile.id }));
  const view = (await room.act({ roomCode: code, token: actor.token, action: "play", args: { placements } })).state;
  assert.equal(Object.keys(view.board).length, group.length);
  const me = view.players.find((p) => p.id === actor.playerId);
  assert.ok(me.score >= group.length);
  assert.equal(me.hand.length, 6, "rack refilled from the bag");
  assert.equal((await store.load(code)).bag.length, raw.bag.length - group.length);
});

test("exchanging tiles swaps them with the bag on the server", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const tile = raw.players.find((p) => p.id === actor.playerId).hand[0];
  const view = (await room.act({ roomCode: code, token: actor.token, action: "exchange", args: { tileIds: [tile.id] } })).state;
  assert.equal(view.bagCount, raw.bag.length);
  const after = await store.load(code);
  assert.equal(after.players.find((p) => p.id === actor.playerId).hand.length, 6);
  assert.ok(after.bag.some((t) => t.id === tile.id), "the exchanged tile went into the bag");
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/qwirkle/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
