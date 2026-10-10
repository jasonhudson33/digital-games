import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { flip7Adapter } from "../lib/flip-7-room-adapter.js";
import { currentPlayer, riskPercent } from "../lib/flip-7.js";

async function startedRoom(extra = 2) {
  const store = createSupabaseRoomStore({ namespace: "f7-test", memoryKey: `__f7Engine${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: flip7Adapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 0; i < extra; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i + 1}` }));
  await room.act({ roomCode: code, token: host.token, action: "start" });
  return { store, room, code, seats, raw: await store.load(code) };
}

test("the draw pile never reaches a seat; the table cards and a count do", async () => {
  const { room, code, seats, raw } = await startedRoom(2);
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const payload = JSON.stringify(view);
    for (const card of raw.deck) assert.equal(payload.includes(`"${card.id}"`), false, `draw pile card ${card.id} leaked`);
    assert.deepEqual(view.deck, []);
    assert.equal(view.deckCount, raw.deck.length);
    // Cards flipped onto a table are public to everyone.
    for (const player of raw.players) for (const card of player.cards) assert.ok(payload.includes(`"${card.id}"`), `table card ${card.id} missing`);
  }
});

test("each seat gets the bust-risk percentage the engine computes on the real draw pile", async () => {
  const { room, code, seats, raw } = await startedRoom(2);
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const real = riskPercent(raw, raw.players.find((p) => p.id === seat.playerId));
    assert.equal(view.riskPercent, real);
  }
});

test("only the seat to act can flip or stay, and the server draws the card", async () => {
  const { room, store, code, seats, raw } = await startedRoom(2);
  if (raw.pendingTarget || raw.stage !== "turns") return; // an opening action card is pending; covered by the target test
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "flip" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "stay" }), /not available/);
  const before = raw.deck.length;
  await room.act({ roomCode: code, token: actor.token, action: "flip" });
  const after = await store.load(code);
  assert.ok(after.deck.length < before, "the server drew from the real deck");
  if (currentPlayer(after).id !== actor.playerId) {
    await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "flip" }), /not available/);
  }
});

test("choosing an action target is limited to the chooser and to valid targets", async () => {
  const { room, store, code, seats } = await startedRoom(2);
  const stored = await store.load(code);
  const [a, b] = stored.players;
  stored.stage = "turns";
  stored.pendingTarget = { action: "freeze", chooserId: a.id, resume: { kind: "advance", fromIndex: 0 } };
  await store.save(stored);
  const chooserSeat = seats.find((s) => s.playerId === a.id);
  const otherSeat = seats.find((s) => s.playerId === b.id);
  await assert.rejects(() => room.act({ roomCode: code, token: otherSeat.token, action: "chooseTarget", args: { targetId: a.id } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: chooserSeat.token, action: "chooseTarget", args: { targetId: "nobody" } }), /not available/);
  const view = (await room.act({ roomCode: code, token: chooserSeat.token, action: "chooseTarget", args: { targetId: b.id } })).state;
  assert.equal(view.players.find((p) => p.id === b.id).status, "stayed");
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await startedRoom(2);
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  await room.computerStep({ roomCode: code, token: seats[0].token });
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/flip-7/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
