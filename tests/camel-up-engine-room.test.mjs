import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { camelUpAdapter, camelUpView } from "../lib/camel-up-room-adapter.js";
import { currentPlayer } from "../lib/camel-up.js";
import { adoptVersion, createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { startedRoom } from "./engine-test-helpers.mjs";

test("finish-card colors are visible only to their owner before final scoring", async () => {
  const { room, code, seats } = await startedRoom(camelUpAdapter, { humans: 3 });
  const hostView = (await room.get({ roomCode: code, token: seats[0].token })).state;
  const active = currentPlayer(hostView);
  const actor = seats.find((seat) => seat.playerId === active.id);
  await room.act({ roomCode: code, token: actor.token, action: "placeFinishBet", args: { bet: "winner", camelId: "red" } });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const bet = view.finishBets.winner[0];
    assert.equal(bet.playerId, actor.playerId);
    assert.equal(bet.camelId, seat.playerId === actor.playerId ? "red" : null);
    for (const player of view.players) {
      if (player.id !== seat.playerId) assert.deepEqual(player.finishCards, []);
    }
    // Other seats see that a card was placed and by whom, never which camel it names.
    if (seat.playerId !== actor.playerId) assert.equal(JSON.stringify(view.finishBets).includes('"red"'), false);
  }
});

test("actions are seat-bound, validated, and client-supplied roll fields are ignored", async () => {
  const { room, store, code, seats, raw } = await startedRoom(camelUpAdapter, { humans: 3 });
  const active = currentPlayer(raw);
  const actor = seats.find((seat) => seat.playerId === active.id);
  const waiting = seats.find((seat) => seat.playerId !== active.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "rollPyramid", args: {} }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "takeLegTicket", args: { camelId: "orange" } }), /not available/);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "rollPyramid", args: { dieId: "red", value: 99 } })).state;
  assert.ok(view.lastRoll.value >= 1 && view.lastRoll.value <= 3);
  assert.notEqual(view.lastRoll.value, 99);
  assert.equal((await store.load(code)).pyramidTicketsTaken, 1);
});

test("rooms enforce the seat range and seat tokens", async () => {
  const store = createSupabaseRoomStore({ namespace: "t-camel-cap", memoryKey: `__camelCap${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: camelUpAdapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let index = 1; index < 8; index += 1) seats.push(await room.join({ roomCode: code, name: `P${index}` }));
  await assert.rejects(() => room.join({ roomCode: code, name: "P8" }), /full|started/);
  await assert.rejects(() => room.get({ roomCode: code, token: "wrong" }), /not seated/);
  const started = await room.act({ roomCode: code, token: host.token, action: "start" });
  assert.equal(started.state.players.length, 8);
});

test("computer steps are host-only and apply at most one action", async () => {
  const { room, store, code, seats } = await startedRoom(camelUpAdapter, { humans: 2, computers: 1 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  const before = await store.load(code);
  if (currentPlayer(before).isComputer) {
    await room.computerStep({ roomCode: code, token: seats[0].token });
    const after = await store.load(code);
    assert.notEqual(after.updatedAt, before.updatedAt);
    assert.ok(after.pyramidTicketsTaken - before.pyramidTicketsTaken <= 1);
  }
});

test("an old-format room is rejected and routes expose only GET and POST", async () => {
  const store = createSupabaseRoomStore({ namespace: "t-camel-old", memoryKey: `__camelOld${Math.random()}`, environment: {} });
  await store.save({ roomCode: "OLDIE", phase: "lobby", players: [], updatedAt: 1 });
  const room = createEngineRoom({ store, adapter: camelUpAdapter });
  await assert.rejects(() => room.get({ roomCode: "OLDIE", token: "x" }), /before an update/);
  const collection = await import("../app/api/camel-up/rooms/route.js");
  const item = await import("../app/api/camel-up/rooms/[code]/route.js");
  assert.equal(typeof collection.POST, "function");
  assert.equal(typeof item.GET, "function");
  assert.equal(typeof item.POST, "function");
  assert.equal(item.PUT, undefined);
});

test("the standalone view masks hidden cards without mutating the game", () => {
  const game = {
    phase: "playing",
    players: [
      { id: "a", finishCards: ["blue"] },
      { id: "b", finishCards: ["red"] },
    ],
    finishBets: { winner: [{ playerId: "b", camelId: "red" }], loser: [] },
  };
  const view = camelUpView(game, "a");
  assert.deepEqual(view.players[1].finishCards, []);
  assert.equal(view.finishBets.winner[0].camelId, null);
  assert.deepEqual(game.players[1].finishCards, ["red"]);
});

test("the fifth roll's recap reaches every seat, hides finish cards, and leaves the next leg playable", async () => {
  const { room, store, code, seats } = await startedRoom(camelUpAdapter, { humans: 3 });
  const seatFor = (state) => seats.find((seat) => seat.playerId === currentPlayer(state).id);
  let raw = await store.load(code);
  await room.act({ roomCode: code, token: seatFor(raw).token, action: "placeFinishBet", args: { bet: "winner", camelId: "red" } });
  raw = await store.load(code);
  await store.save(adoptVersion({ ...raw, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"], updatedAt: raw.updatedAt + 1 }, raw));
  raw = await store.load(code);
  await room.act({ roomCode: code, token: seatFor(raw).token, action: "rollPyramid", args: {} });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    assert.equal(view.leg, 2);
    assert.equal(view.legRecap.leg, 1);
    assert.equal(view.legRecap.rolls.length, 1);
    assert.equal(view.legRecap.finish, null);
    for (const player of view.players) if (player.id !== seat.playerId) assert.deepEqual(player.finishCards, []);
  }
  const next = (await store.load(code));
  const view = (await room.act({ roomCode: code, token: seatFor(next).token, action: "takeLegTicket", args: { camelId: "green" } })).state;
  assert.equal(view.players.find((player) => player.id === currentPlayer(next).id).legTickets.length, 1);
});
