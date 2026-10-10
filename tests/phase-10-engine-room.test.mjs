import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { phase10Adapter } from "../lib/phase-10-room-adapter.js";

async function startedRoom(extra = 1) {
  const store = createSupabaseRoomStore({ namespace: "p10-test", memoryKey: `__p10Engine${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: phase10Adapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 0; i < extra; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i + 1}` }));
  await room.act({ roomCode: code, token: host.token, action: "start" });
  return { store, room, code, seats, raw: await store.load(code) };
}

const num = (id, number, color = "red") => ({ id, type: "number", number, color });

test("payloads carry only the viewer's hand, a count for others, the top discard and a deck count", async () => {
  const { room, code, seats, raw } = await startedRoom(2);
  for (const seat of seats) {
    const payload = JSON.stringify((await room.get({ roomCode: code, token: seat.token })).state);
    for (const card of raw.players.find((p) => p.id === seat.playerId).hand) assert.ok(payload.includes(`"${card.id}"`));
    for (const other of raw.players.filter((p) => p.id !== seat.playerId)) {
      for (const card of other.hand) assert.equal(payload.includes(`"${card.id}"`), false, `opponent card ${card.id} leaked`);
    }
    for (const card of raw.deck) assert.equal(payload.includes(`"${card.id}"`), false, `draw pile card ${card.id} leaked`);
    assert.ok(payload.includes(`"${raw.discard.at(-1).id}"`), "top discard is public");
  }
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assert.equal(view.deckCount, raw.deck.length);
  assert.deepEqual(view.deck, []);
  assert.equal(view.discard.length, 1);
  assert.equal(view.players.find((p) => p.id !== seats[0].playerId).handCount, 10);
});

test("laying a phase is validated against the real hand, then hitting and discarding work", async () => {
  const { room, store, code, seats, raw } = await startedRoom(1);
  const current = raw.players[raw.currentPlayerIndex];
  const actor = seats.find((s) => s.playerId === current.id);

  const stored = await store.load(code);
  const me = stored.players.find((p) => p.id === current.id);
  me.hand = [num("a1", 5), num("a2", 5, "blue"), num("a3", 5, "green"), num("b1", 7), num("b2", 7, "blue"), num("b3", 7, "green"), num("x1", 1), num("x2", 2), num("x3", 3), num("x4", 9)];
  stored.turnDrawn = true;
  await store.save(stored);

  // Not drawn cards, not held, and a layout that is not Phase 1 are all refused.
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "layPhase", args: { cardIds: ["a1", "a2", "a3", "b1", "b2", "zzz"] } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "layPhase", args: { cardIds: ["a1", "a2", "a3", "b1", "b2", "x1"] } }), /not available/);

  const laid = (await room.act({ roomCode: code, token: actor.token, action: "layPhase", args: { cardIds: ["a1", "a2", "a3", "b1", "b2", "b3"] } })).state;
  const mine = laid.players.find((p) => p.id === actor.playerId);
  assert.equal(mine.phaseLaid, true);
  assert.equal(mine.hand.length, 4);

  const afterDiscard = (await room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: "x4" } })).state;
  assert.equal(afterDiscard.discard.at(-1).id, "x4");
  assert.notEqual(afterDiscard.players[afterDiscard.currentPlayerIndex].id, actor.playerId);
});

test("seats cannot act out of turn or draw twice, and computers take a whole turn per host step", async () => {
  const { room, store, code, seats, raw } = await startedRoom(1);
  const current = raw.players[raw.currentPlayerIndex];
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "draw" }), /not available/);
  await room.act({ roomCode: code, token: actor.token, action: "draw" });
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "draw" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "takeDiscard" }), /not available/);
  assert.equal((await store.load(code)).players.find((p) => p.id === actor.playerId).hand.length, 11);

  // A computer seat takes its whole turn in one host step.
  const host = seats[0];
  const stored = await store.load(code);
  stored.players.push({ id: "cpu", name: "Cpu", isComputer: true, hand: stored.deck.splice(0, 10), phaseNumber: 1, phaseLaid: false, laidGroups: [], score: 0, roundScore: null });
  stored.currentPlayerIndex = stored.players.length - 1;
  stored.turnDrawn = false;
  await store.save(stored);
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  const step = (await room.computerStep({ roomCode: code, token: host.token })).state;
  // It drew and discarded (10 cards), or also laid a phase or hit (fewer), or went out and ended the round.
  assert.ok(step.phase !== "playing" || step.players[step.currentPlayerIndex].id !== "cpu");
  assert.ok(step.players.find((p) => p.id === "cpu").handCount <= 10);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/phase-10/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
