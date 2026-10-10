import assert from "node:assert/strict";
import test from "node:test";

import { dominionAdapter } from "../lib/dominion-room-adapter.js";
import { currentPlayer } from "../lib/dominion.js";
import { startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(dominionAdapter, options);

test("a seat sees only its own hand; no draw pile is sent, not even its own; discards stay public", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    for (const player of view.players) {
      const real = raw.players.find((p) => p.id === player.id);
      assert.deepEqual(player.deck, [], "no draw pile contents");
      assert.equal(player.deckCount, real.deck.length);
      assert.equal(player.handCount, real.hand.length);
      assert.equal(player.cardTotal, real.deck.length + real.hand.length + real.discard.length + real.inPlay.length);
      if (player.id === seat.playerId) assert.deepEqual(player.hand, real.hand);
      else assert.deepEqual(player.hand, []);
      assert.deepEqual(player.discard, real.discard);
      assert.deepEqual(player.inPlay, real.inPlay);
    }
    assert.deepEqual(view.supply, raw.supply);
  }
});

test("a play from a missing hand index, a buy without coins or in the wrong phase, and out-of-turn moves are rejected", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "toBuy" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "endTurn" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { handIndex: 99 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "buy", args: { cardId: "province" } }), /not available/); // not in the buy phase
  await room.act({ roomCode: code, token: actor.token, action: "toBuy" });
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "buy", args: { cardId: "province" } }), /not available/); // 8 coins needed
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "buy", args: { cardId: "not-a-card" } }), /not available/);
});

test("a full turn: enter the buy phase, buy what is affordable, end the turn", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "toBuy" })).state;
  const me = view.players.find((p) => p.id === actor.playerId);
  assert.equal(view.turnPhase, "buy");
  if (me.coins >= 0 && view.supply.copper > 0) {
    await room.act({ roomCode: code, token: actor.token, action: "buy", args: { cardId: "copper" } });
    assert.equal((await store.load(code)).players.find((p) => p.id === actor.playerId).discard.includes("copper"), true);
  }
  const after = (await room.act({ roomCode: code, token: actor.token, action: "endTurn" })).state;
  assert.notEqual(currentPlayer(after).id, actor.playerId);
  assert.equal(after.players.find((p) => p.id === actor.playerId).handCount, 5, "drew a new hand of five");
});

test("a pending choice is resolved against the real hand", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const stored = await store.load(code);
  const me = stored.players.find((p) => p.id === current.id);
  me.hand = ["cellar", "estate", "estate", "copper", "copper"];
  me.actions = 1;
  stored.turnPhase = "action";
  await store.save(stored);
  await room.act({ roomCode: code, token: actor.token, action: "play", args: { handIndex: 0 } });
  assert.equal((await store.load(code)).pendingChoice.type, "cellar");
  // Only the chooser can answer.
  const other = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: other.token, action: "resolve", args: { indices: [0] } }), /not available/);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "resolve", args: { indices: [1, 2] } })).state;
  assert.equal(view.pendingChoice, null);
  assert.equal(view.players.find((p) => p.id === actor.playerId).hand.length, 4, "kept three, drew two");
});

test("computer steps are host only and play a whole computer turn", async () => {
  const { room, store, code, seats } = await start({ humans: 2, computers: 1 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  const before = await store.load(code);
  await room.computerStep({ roomCode: code, token: seats[0].token });
  const after = await store.load(code);
  const bot = before.players.find((p) => p.isComputer);
  if (currentPlayer(before).id === bot.id) assert.notEqual(currentPlayer(after).id, bot.id);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/dominion/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
