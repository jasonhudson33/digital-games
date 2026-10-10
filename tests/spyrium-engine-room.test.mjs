import assert from "node:assert/strict";
import test from "node:test";

import { spyriumAdapter } from "../lib/spyrium-room-adapter.js";
import { currentPlayer, marketSlots } from "../lib/spyrium.js";
import { startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(spyriumAdapter, options);

test("the three period decks and events beyond the next are counts; market and current and next events are public", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    assert.deepEqual(view.decks, { A: [], B: [], C: [] });
    for (const period of ["A", "B", "C"]) assert.equal(view.deckCounts[period], raw.decks[period].length);
    assert.deepEqual(view.events, []);
    assert.equal(view.eventsRemaining, raw.events.length);
    assert.deepEqual(view.currentEvent, raw.currentEvent);
    assert.deepEqual(view.futureEvent, raw.futureEvent);
    assert.deepEqual(view.market, raw.market);
    const payload = JSON.stringify(view);
    for (const event of raw.events.slice(2)) assert.equal(payload.includes(`"${event.id ?? event.slug ?? event.name}"`), false, `event ${event.id ?? event.slug ?? event.name} leaked`);
    for (const card of [...raw.decks.A, ...raw.decks.B, ...raw.decks.C]) assert.equal(payload.includes(`"${card.id}"`), false, `deck card ${card.id} leaked`);
  }
});

test("a worker can be placed only by the seat to act, on a real slot", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  const slot = marketSlots()[0].id;
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "place", args: { slotId: slot } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "place", args: { slotId: "nowhere" } }), /not available/);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "place", args: { slotId: slot } })).state;
  assert.equal(view.workerSlots[slot].length, 1);
  const after = await store.load(code);
  assert.equal(after.players.find((p) => p.id === actor.playerId).activeWorkers, current.activeWorkers - 1);
});

test("activation, money, buildings, events and bonuses are refused out of turn or in the wrong phase", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  for (const [action, args] of [["beginActivation", {}], ["gainMoney", { workerId: "w", cardIndex: 0 }], ["useEvent", {}], ["bonus", { choice: "money" }], ["pass", {}]]) {
    await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action, args }), /not available/, `${action} by the waiting seat`);
  }
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "activate", args: { workerId: "ghost", cardIndex: 0, options: {} } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "useBuilding", args: { buildingId: "none", actionIndex: 0 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "bonus", args: { choice: "money" } }), /not available/);
});

test("unknown option keys are dropped before they reach the engine", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const before = (await store.load(code)).updatedAt;
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "activate", args: { workerId: "ghost", cardIndex: 0, options: { money: 99, __proto__: { admin: true } } } }), /not available/);
  assert.equal((await store.load(code)).updatedAt, before);
});

test("computer steps are host only and a computer finishes its turn", async () => {
  const { room, store, code, seats } = await start({ humans: 2, computers: 1 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  for (let i = 0; i < 400; i += 1) {
    const stored = await store.load(code);
    if (stored.phase !== "playing" || !currentPlayer(stored).isComputer) break;
    await room.computerStep({ roomCode: code, token: seats[0].token });
  }
  const settled = await store.load(code);
  assert.ok(settled.phase !== "playing" || !currentPlayer(settled).isComputer, "computers hand the turn back");
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/spyrium/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
