import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { sevenUpAdapter } from "../lib/seven-up-room-adapter.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const act = (api, seat, action, args = {}) => api.room.act({ roomCode: api.code, token: seat.token, action, args });
const view = async (api, seat) => (await api.room.get({ roomCode: api.code, token: seat.token })).state;
const key = (card) => `${card.suit}:${card.rank}`;

function lobby() {
  const store = createSupabaseRoomStore({ namespace: "t-seven-up", memoryKey: `__t${Math.random()}`, environment: {} });
  return { store, room: createEngineRoom({ store, adapter: sevenUpAdapter }) };
}

test("a new room has one seat, the host's, and no seat types chosen", async () => {
  const { room } = lobby();
  const host = await room.create({ name: "Host" });
  assert.equal(host.state.phase, "lobby");
  assert.equal(host.state.players.length, 1);
  assert.equal(host.state.players[0].isComputer, false);
});

test("the host adds computers and others join by code into the next seat", async () => {
  const { room } = lobby();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const guest = await room.join({ roomCode: code, name: "Guest" });
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  const state = (await room.get({ roomCode: code, token: guest.token })).state;
  assert.equal(state.players.length, 4);
  assert.deepEqual(state.players.map((player) => player.isComputer), [false, false, true, true]);
  await assert.rejects(room.act({ roomCode: code, token: guest.token, action: "addComputer" }), /host/i);
});

test("two players with the same name get distinct seats and their own hands", async () => {
  const { room } = lobby();
  const host = await room.create({ name: "Sam" });
  const code = host.state.roomCode;
  const second = await room.join({ roomCode: code, name: "Sam" });
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  await room.act({ roomCode: code, token: host.token, action: "start" });
  const a = (await room.get({ roomCode: code, token: host.token })).state;
  const b = (await room.get({ roomCode: code, token: second.token })).state;
  assert.notEqual(a.players[0].name, a.players[1].name);
  assert.equal(a.hand.length + b.hand.length + a.players[2].handCount, 52);
  const mine = new Set(a.hand.map(key));
  for (const card of b.hand) assert.ok(!mine.has(key(card)), "no card is in both hands");
});

test("a room starts with three to seven seats and not otherwise", async () => {
  const { room } = lobby();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  await assert.rejects(room.act({ roomCode: code, token: host.token, action: "start" }), /not available/, "two seats");
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  assert.equal((await room.act({ roomCode: code, token: host.token, action: "start" })).state.phase, "playing");
});

test("a seat sees its own hand and only counts for the others", async () => {
  const api = await startedRoom(sevenUpAdapter, { humans: 2, computers: 1 });
  for (const seat of api.seats) {
    const state = await view(api, seat);
    const mine = api.raw.game.hands[api.raw.players.find((player) => player.id === seat.playerId).name];
    assert.deepEqual(state.hand.map(key), mine.map(key));
    const secrets = [];
    for (const player of api.raw.players) {
      if (player.id === seat.playerId) continue;
      for (const card of api.raw.game.hands[player.name]) secrets.push(`${card.suit}:${card.rank}`);
    }
    const payload = JSON.stringify(state);
    for (const secret of secrets) {
      const [suit, rank] = secret.split(":");
      assert.equal(payload.includes(`{"suit":"${suit}","rank":${rank}}`), false, `${secret} leaked`);
    }
    state.players.forEach((player) => assert.ok(Number.isInteger(player.handCount)));
  }
  assertNoneLeaked(await view(api, api.seats[0]), [], "none");
});

test("an out-of-turn play, an illegal card and a pass with a legal card are all rejected", async () => {
  const api = await startedRoom(sevenUpAdapter, { humans: 2, computers: 1 });
  const states = await Promise.all(api.seats.map((seat) => view(api, seat)));
  const idle = api.seats[states.findIndex((state) => state.currentPlayerIndex !== state.viewerIndex)];
  const idleState = await view(api, idle);
  await assert.rejects(act(api, idle, "play", { card: idleState.hand[0] }), /not available/, "out of turn");
  await assert.rejects(act(api, idle, "pass"), /not available/, "pass out of turn");

  const mover = api.seats[states.findIndex((state) => state.currentPlayerIndex === state.viewerIndex)];
  if (mover) {
    const state = await view(api, mover);
    const illegal = state.hand.find((card) => !state.legalMoves.some((legal) => key(legal) === key(card)));
    if (illegal) await assert.rejects(act(api, mover, "play", { card: illegal }), /not available/, "illegal card");
    if (state.legalMoves.length) await assert.rejects(act(api, mover, "pass"), /not available/, "pass with a legal card");
  }
});

test("computers and passes play a hand out to a winner, then the host deals again", async () => {
  const api = await startedRoom(sevenUpAdapter, { humans: 1, computers: 2 });
  const host = api.seats[0];
  let state = await view(api, host);
  for (let guard = 0; guard < 600 && state.phase === "playing"; guard += 1) {
    if (state.currentPlayerIndex === state.viewerIndex) {
      state = state.legalMoves.length
        ? (await act(api, host, "play", { card: state.legalMoves[0] })).state
        : (await act(api, host, "pass")).state;
    } else {
      state = (await api.room.computerStep({ roomCode: api.code, token: host.token })).state;
    }
  }
  assert.equal(state.phase, "finished");
  assert.ok(state.winnerName);
  assert.ok(state.players.some((player) => player.name === state.winnerName && player.handCount === 0));
  const again = (await act(api, host, "dealAgain")).state;
  assert.equal(again.phase, "playing");
  assert.equal(again.hand.length + again.players.filter((p) => p.name !== state.players[again.viewerIndex].name).reduce((n, p) => n + p.handCount, 0), 52);
});

test("a non-host cannot step the computers", async () => {
  const api = await startedRoom(sevenUpAdapter, { humans: 2, computers: 1 });
  await assert.rejects(api.room.computerStep({ roomCode: api.code, token: api.seats[1].token }), /host/i);
});

test("a room saved in the earlier whole-state format is not resumed", async () => {
  const { store, room } = lobby();
  await store.save({ roomCode: "OLDRM", players: [], updatedAt: 1 });
  await assert.rejects(room.get({ roomCode: "OLDRM", token: "anything" }), /created before an update/);
});
