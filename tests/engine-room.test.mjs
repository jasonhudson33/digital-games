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

// Create and join options: only an adapter that asks for them receives them.
function optionAdapter(accepts) {
  const seen = { create: null, join: null };
  const adapter = {
    ...toy,
    acceptsOptions: accepts,
    createLobby: (host, roomCode) => { seen.create = host; return toy.createLobby(host, roomCode); },
    addPlayer: (game, player) => {
      seen.join = player;
      if (player.options?.piece === "taken") throw new Error("That piece is already taken.");
      return toy.addPlayer(game, player);
    },
  };
  const store = createSupabaseRoomStore({ namespace: "engine-opt", memoryKey: `__opt${Math.random()}`, environment: {} });
  return { seen, room: createEngineRoom({ store, adapter }), routes: createEngineRoomRoutes(createEngineRoom({ store, adapter })) };
}

test("options reach createLobby and addPlayer for an adapter that accepts them", async () => {
  const { seen, room } = optionAdapter(true);
  const host = await room.create({ name: "Host", options: { piece: "car" } });
  assert.deepEqual(seen.create.options, { piece: "car" });
  await room.join({ roomCode: host.state.roomCode, name: "Guest", options: { piece: "hat" } });
  assert.deepEqual(seen.join.options, { piece: "hat" });
});

test("an adapter that does not accept options never sees them, and non-objects are dropped", async () => {
  const { seen, room } = optionAdapter(false);
  const host = await room.create({ name: "Host", options: { piece: "car" } });
  assert.equal("options" in seen.create, false);
  await room.join({ roomCode: host.state.roomCode, name: "Guest", options: { piece: "hat" } });
  assert.equal("options" in seen.join, false);
  const accepting = optionAdapter(true);
  const other = await accepting.room.create({ name: "Host", options: ["not", "an", "object"] });
  assert.equal("options" in accepting.seen.create, false);
  void other;
});

test("an adapter's own error message reaches the client as a 400", async () => {
  const { room, routes } = optionAdapter(true);
  const created = await (await routes.collection.POST(new Request("http://t/x", json({ name: "Host", options: { piece: "car" } })))).json();
  void room;
  const code = created.state.roomCode;
  const response = await routes.item.POST(new Request("http://t/x", json({ action: "join", name: "G", options: { piece: "taken" } })), ctx(code));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "That piece is already taken.");
});

/* ── Room computer speed (platform/computer-pacing) ─────────────────────────── */

test("a new room, and a room saved without a speed, read as Normal", async () => {
  const { room, store } = setup();
  const host = await room.create({ name: "Host" });
  assert.equal(host.state.computerDelayMs, 600);
  const stored = await store.load(host.state.roomCode);
  assert.equal("__computerMs" in stored, false, "nothing is stored until someone changes it");
  const view = (await room.get({ roomCode: host.state.roomCode, token: host.token })).state;
  assert.equal(view.computerDelayMs, 600);
});

test("any seated player changes the speed and every seat sees it", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  const guest = await room.join({ roomCode: host.state.roomCode, name: "Guest" });
  const changed = (await room.act({ roomCode: host.state.roomCode, token: guest.token, action: "setComputerSpeed", args: { ms: 1000 } })).state;
  assert.equal(changed.computerDelayMs, 1000);
  for (const seat of [host, guest]) {
    assert.equal((await room.get({ roomCode: host.state.roomCode, token: seat.token })).state.computerDelayMs, 1000);
  }
});

test("only a seat may change it, and only to a listed speed", async () => {
  const { room } = setup();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  await assert.rejects(() => room.act({ roomCode: code, action: "setComputerSpeed", args: { ms: 300 } }), /not seated/);
  await assert.rejects(() => room.act({ roomCode: code, token: "nope", action: "setComputerSpeed", args: { ms: 300 } }), /not seated/);
  for (const ms of [5, 0, 2000, "fast-ish", null, undefined]) {
    await assert.rejects(() => room.act({ roomCode: code, token: host.token, action: "setComputerSpeed", args: { ms } }), /listed computer speeds/, String(ms));
  }
  assert.equal((await room.get({ roomCode: code, token: host.token })).state.computerDelayMs, 600, "unchanged");
});

test("the speed survives a reload, a join and a move, and asking for the current speed saves nothing", async () => {
  const { room, store } = setup();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  await room.act({ roomCode: code, token: host.token, action: "setComputerSpeed", args: { ms: 300 } });
  const guest = await room.join({ roomCode: code, name: "Guest" });
  assert.equal(guest.state.computerDelayMs, 300, "a join does not lose it");
  await room.act({ roomCode: code, token: host.token, action: "start" });
  await room.act({ roomCode: code, token: guest.token, action: "bump" });
  const stored = await store.load(code);
  assert.equal(stored.__computerMs, 300);
  assert.equal((await room.get({ roomCode: code, token: guest.token })).state.computerDelayMs, 300);
  const before = (await store.load(code)).updatedAt;
  await room.act({ roomCode: code, token: host.token, action: "setComputerSpeed", args: { ms: 300 } });
  assert.equal((await store.load(code)).updatedAt, before, "the same speed is not a change");
});

test("the speed is bookkeeping: the adapter never sees it, and it works in the lobby and in play", async () => {
  const { room } = setup();
  let seen = null;
  const spy = { ...toy, view: (game, viewerId) => { seen = game; return toy.view(game, viewerId); } };
  const store = createSupabaseRoomStore({ namespace: "engine-test", memoryKey: `__engine${Math.random()}`, environment: {} });
  const spied = createEngineRoom({ store, adapter: spy });
  const host = await spied.create({ name: "Host" });
  await spied.act({ roomCode: host.state.roomCode, token: host.token, action: "setComputerSpeed", args: { ms: 1500 } }); // lobby
  assert.equal("__computerMs" in seen, false);
  await spied.act({ roomCode: host.state.roomCode, token: host.token, action: "start" });
  assert.equal((await spied.act({ roomCode: host.state.roomCode, token: host.token, action: "setComputerSpeed", args: { ms: 300 } })).state.computerDelayMs, 300); // in play
  void room;
});

test("setComputerSpeed is a reserved action name", () => {
  assert.throws(() => createEngineRoom({ store: {}, adapter: { ...toy, actions: { setComputerSpeed: { run: (g) => g } } } }), /reserved/);
});
