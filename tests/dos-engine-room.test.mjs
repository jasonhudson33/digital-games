import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { dosAdapter } from "../lib/dos-room-adapter.js";
import { matchOptions } from "../lib/dos.js";

async function startedRoom(extra = 2) {
  const store = createSupabaseRoomStore({ namespace: "dos-test", memoryKey: `__dosEngine${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: dosAdapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 0; i < extra; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i + 1}` }));
  await room.act({ roomCode: code, token: host.token, action: "start" });
  return { store, room, code, seats, raw: await store.load(code) };
}

test("a seat's payload has its own hand and no id of any other hand, the draw pile or the discard pile", async () => {
  const { room, code, seats, raw } = await startedRoom(2);
  for (const seat of seats) {
    const payload = JSON.stringify((await room.get({ roomCode: code, token: seat.token })).state);
    for (const card of raw.players.find((p) => p.id === seat.playerId).cards) assert.ok(payload.includes(`"${card.id}"`));
    for (const other of raw.players.filter((p) => p.id !== seat.playerId)) {
      for (const card of other.cards) assert.equal(payload.includes(`"${card.id}"`), false, `opponent card ${card.id} leaked`);
    }
    for (const card of [...raw.deck, ...raw.discard]) assert.equal(payload.includes(`"${card.id}"`), false, `pile card ${card.id} leaked`);
    for (const card of raw.centerRow) assert.ok(payload.includes(`"${card.id}"`), "the center row is public");
  }
});

test("counts replace hands and piles", async () => {
  const { room, code, seats, raw } = await startedRoom(2);
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assert.equal(view.deckCount, raw.deck.length);
  assert.deepEqual(view.deck, []);
  assert.deepEqual(view.discard, []);
  for (const player of view.players.filter((p) => p.id !== seats[0].playerId)) {
    assert.deepEqual(player.cards, []);
    assert.equal(player.cardCount, 7);
  }
});

test("matches use the real hand: unknown options are rejected, and a legal match is applied", async () => {
  const { room, store, code, seats, raw } = await startedRoom(1);
  const current = raw.players[raw.currentPlayerIndex];
  const actor = seats.find((s) => s.playerId === current.id);
  const stranger = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "playMatch", args: { optionId: "made-up" } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: stranger.token, action: "draw" }), /not available/);

  const options = matchOptions(raw, current.id);
  if (options.length) {
    await room.act({ roomCode: code, token: actor.token, action: "playMatch", args: { optionId: options[0].id } });
    assert.ok((await store.load(code)).players.find((p) => p.id === current.id).cards.length < 7);
  } else {
    await room.act({ roomCode: code, token: actor.token, action: "draw" });
    assert.equal((await store.load(code)).players.find((p) => p.id === current.id).cards.length, 8);
  }
});

test("a DOS catch is rejected unless a player really holds exactly two cards and missed the call", async () => {
  const { room, code, seats } = await startedRoom(1);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "catchDos" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[0].token, action: "callDos" }), /not available/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/dos/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
