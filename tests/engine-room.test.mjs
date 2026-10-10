import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";

// A toy engine: players hold a secret number, "bump" adds to your own, "step" moves a computer.
const toy = {
  label: "Toy",
  createLobby: (host, roomCode) => ({
    roomCode, hostId: host.id, phase: "lobby", players: [{ id: host.id, name: host.name, secret: 1 }], deck: [9, 8, 7],
  }),
  addPlayer: (game, player) => game.phase !== "lobby" || game.players.length >= 3
    ? game : { ...game, players: [...game.players, { ...player, secret: 2 }] },
  actions: {
    start: { host: true, run: (game) => ({ ...game, phase: "playing" }) },
    bump: { run: (game, { playerId, args }) => game.phase !== "playing" ? game : ({
      ...game, players: game.players.map((p) => p.id === playerId ? { ...p, secret: p.secret + Number(args.by || 1) } : p),
    }) },
    noop: { run: (game) => game },
    addComputer: { host: true, run: (game) => ({ ...game, players: [...game.players, { id: "bot", name: "Bot", isComputer: true, secret: 0 }] }) },
  },
  computerStep: (game) => {
    const bot = game.players.find((p) => p.isComputer);
    return bot && game.phase === "playing" ? { ...game, players: game.players.map((p) => p === bot ? { ...p, secret: p.secret + 1 } : p) } : game;
  },
  view: (game, viewerId) => ({
    ...game,
    deck: [], deckCount: game.deck.length,
    players: game.players.map((p) => ({ ...p, secret: p.id === viewerId || p.isComputer ? p.secret : undefined, isViewer: p.id === viewerId })),
  }),
};

function setup() {
  const store = createSupabaseRoomStore({ namespace: "engine-test", memoryKey: `__engine${Math.random()}`, environment: {} });
  return { store, room: createEngineRoom({ store, adapter: toy }) };
}

test("create, join and read give each seat only its own view", async () => {
  const { room } = setup();
  const host = await room.create({ name: "  Host  " });
  const guest = await room.join({ roomCode: host.state.roomCode, name: "Guest" });
  assert.equal(host.state.players[0].name, "Host");
  assert.ok(host.token && guest.token && host.token !== guest.token);

  const hostView = (await room.get({ roomCode: host.state.roomCode, token: host.token })).state;
  assert.equal(hostView.viewerId, host.playerId);
  assert.equal(hostView.players.find((p) => p.id === host.playerId).secret, 1);
  assert.equal(hostView.players.find((p) => p.id === guest.playerId).secret, undefined);
  assert.deepEqual(hostView.deck, []);
  assert.equal(hostView.deckCount, 3);
  assert.equal("__seats" in hostView, false);
  assert.equal("engine" in hostView, false);
});

test("a token is required and must belong to the room", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  await assert.rejects(() => room.get({ roomCode: host.state.roomCode }), /not seated/);
  await assert.rejects(() => room.get({ roomCode: host.state.roomCode, token: "nope" }), /not seated/);
  await assert.rejects(() => room.act({ roomCode: host.state.roomCode, token: "nope", action: "start" }), /not seated/);
});

test("illegal actions are rejected and leave the room unchanged", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  await assert.rejects(() => room.act({ roomCode: code, token: host.token, action: "noop" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: host.token, action: "bump" }), /not available/);
  for (const name of ["constructor", "toString", "join", "computerStep", "__proto__", ""]) {
    await assert.rejects(() => room.act({ roomCode: code, token: host.token, action: name }), /Unknown room action/);
  }
  assert.equal((await room.get({ roomCode: code, token: host.token })).state.phase, "lobby");
});

test("host-only actions refuse other seats, and the acting seat comes from the token", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  const guest = await room.join({ roomCode: host.state.roomCode, name: "Guest" });
  const code = host.state.roomCode;
  await assert.rejects(() => room.act({ roomCode: code, token: guest.token, action: "start" }), /Only the host/);
  await room.act({ roomCode: code, token: host.token, action: "start" });
  // A body that names another player cannot change that player's data.
  await room.act({ roomCode: code, token: guest.token, action: "bump", args: { by: 5, playerId: host.playerId } });
  const hostView = (await room.get({ roomCode: code, token: host.token })).state;
  assert.equal(hostView.players.find((p) => p.id === host.playerId).secret, 1);
  const guestView = (await room.get({ roomCode: code, token: guest.token })).state;
  assert.equal(guestView.players.find((p) => p.id === guest.playerId).secret, 7);
});

test("computerStep is host only, applies one move, and is a no-op when nothing is due", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  const guest = await room.join({ roomCode: host.state.roomCode, name: "Guest" });
  const code = host.state.roomCode;
  const idle = (await room.computerStep({ roomCode: code, token: host.token })).state;
  assert.equal(idle.updatedAt, (await room.get({ roomCode: code, token: host.token })).state.updatedAt);
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  await room.act({ roomCode: code, token: host.token, action: "start" });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: guest.token }), /Only the host/);
  const step = (await room.computerStep({ roomCode: code, token: host.token })).state;
  assert.equal(step.players.find((p) => p.isComputer).secret, 1);
  const again = (await room.computerStep({ roomCode: code, token: host.token })).state;
  assert.equal(again.players.find((p) => p.isComputer).secret, 2);
});

test("the room refuses a join once it is full or started", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  await room.join({ roomCode: code, name: "B" });
  await room.join({ roomCode: code, name: "C" });
  await assert.rejects(() => room.join({ roomCode: code, name: "D" }), /full or has already started/);
});

test("a room stored before the change answers that a new room is needed", async () => {
  const { store, room } = setup();
  await store.save({ roomCode: "OLDRM", phase: "playing", players: [{ id: "a", name: "A" }], updatedAt: 1 });
  await assert.rejects(
    () => room.get({ roomCode: "OLDRM", token: "x" }),
    (error) => error.status === 410 && /Start a new room/.test(error.message),
  );
  await assert.rejects(() => room.join({ roomCode: "NOPE1", name: "x" }), (error) => error.status === 404);
});

test("reserved action names cannot be registered", () => {
  const store = createSupabaseRoomStore({ namespace: "engine-test2", memoryKey: `__engine${Math.random()}`, environment: {} });
  assert.throws(() => createEngineRoom({ store, adapter: { ...toy, actions: { join: { run: (g) => g } } } }), /reserved/);
});

import { createEngineRoomRoutes } from "../lib/engine-room-route.js";

function routes() {
  const { room } = setup();
  return createEngineRoomRoutes(room);
}
const json = (body, token) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...(token ? { "x-seat-token": token } : {}) },
  body: JSON.stringify(body),
});
const ctx = (code) => ({ params: Promise.resolve({ code }) });

test("routes: create, join and act over HTTP shapes, with no PUT handler", async () => {
  const r = routes();
  assert.equal("PUT" in r.item, false);
  assert.equal("PUT" in r.collection, false);

  const created = await (await r.collection.POST(new Request("http://t/x", json({ name: "Host" })))).json();
  const code = created.state.roomCode;
  const joined = await (await r.item.POST(new Request("http://t/x", json({ action: "join", name: "Guest" })), ctx(code))).json();
  assert.ok(joined.token);

  const start = await r.item.POST(new Request("http://t/x", json({ action: "start" }, created.token)), ctx(code));
  assert.equal(start.status, 200);
  const read = await r.item.GET(new Request("http://t/x", { headers: { "x-seat-token": joined.token } }), ctx(code));
  assert.equal((await read.json()).state.phase, "playing");
});

test("routes: bad bodies, unknown actions, missing tokens and old rooms get the right status", async () => {
  const r = routes();
  assert.equal((await r.collection.POST(new Request("http://t/x", { method: "POST", body: "{" }))).status, 400);
  const created = await (await r.collection.POST(new Request("http://t/x", json({ name: "H" })))).json();
  const code = created.state.roomCode;
  for (const action of ["constructor", "toString", "__proto__"]) {
    assert.equal((await r.item.POST(new Request("http://t/x", json({ action }, created.token)), ctx(code))).status, 400, action);
  }
  assert.equal((await r.item.GET(new Request("http://t/x"), ctx(code))).status, 403);
  assert.equal((await r.item.GET(new Request("http://t/x", { headers: { "x-seat-token": created.token } }), ctx("ZZZZZ"))).status, 404);
});
