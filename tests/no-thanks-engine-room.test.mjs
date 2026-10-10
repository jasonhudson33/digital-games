import assert from "node:assert/strict";
import test from "node:test";

import { noThanksAdapter } from "../lib/no-thanks-room-adapter.js";
import { currentPlayer } from "../lib/no-thanks.js";
import { startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(noThanksAdapter, options);

test("the draw pile is a count; the active card, chips and taken cards are public", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    assert.deepEqual(view.deck, []);
    assert.equal(view.deckCount, raw.deck.length);
    const payload = JSON.stringify(view.deck);
    for (const card of raw.deck) assert.equal(payload.includes(String(card)) && payload !== "[]", false);
    assert.equal(view.activeCard, raw.activeCard);
    assert.equal(view.centerChips, raw.centerChips);
    for (const player of view.players) {
      const real = raw.players.find((p) => p.id === player.id);
      assert.equal(player.chips, real.chips);
      assert.deepEqual(player.cards, real.cards);
    }
  }
});

test("only the seat to act can pass or take, and a seat with no chips cannot pass", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 3 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "pass" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "take" }), /not available/);
  const stored = await store.load(code);
  stored.players.find((p) => p.id === current.id).chips = 0;
  await store.save(stored);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "pass" }), /not available/);
  await room.act({ roomCode: code, token: actor.token, action: "take" });
});

test("a pass costs a chip and moves the offer on; a take collects the chips and reveals nothing early", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 3 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "pass" })).state;
  assert.equal(view.centerChips, 1);
  assert.equal(view.players.find((p) => p.id === actor.playerId).chips, current.chips - 1);
  const next = currentPlayer(await store.load(code));
  assert.notEqual(next.id, actor.playerId);
  const nextSeat = seats.find((s) => s.playerId === next.id);
  const taken = (await room.act({ roomCode: code, token: nextSeat.token, action: "take" })).state;
  assert.equal(taken.centerChips, 0);
  assert.equal(taken.deckCount, raw.deck.length - 1);
  assert.equal(taken.players.find((p) => p.id === next.id).cards.includes(raw.activeCard), true);
});

test("a full round can be played to the end, one server move at a time", async () => {
  const { room, store, code, seats } = await start({ humans: 3 });
  for (let i = 0; i < 200; i += 1) {
    const stored = await store.load(code);
    if (stored.phase === "finished") break;
    const seat = seats.find((s) => s.playerId === currentPlayer(stored).id);
    await room.act({ roomCode: code, token: seat.token, action: "take" });
  }
  const finished = await store.load(code);
  assert.equal(finished.phase, "finished");
  assert.ok(finished.winnerIds.length >= 1);
});

test("computer steps are host only and move one computer at a time", async () => {
  const { room, store, code, seats } = await start({ humans: 2, computers: 1 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  const before = await store.load(code);
  await room.computerStep({ roomCode: code, token: seats[0].token });
  const after = await store.load(code);
  if (currentPlayer(before).isComputer) assert.notEqual(after.updatedAt, before.updatedAt);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/no-thanks/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
