import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createEngineRoomRoutes } from "../lib/engine-room-route.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { createEngineRoomService, EngineRoomError } from "../components/engine-room-service.js";

const adapter = {
  label: "Toy",
  createLobby: (host, roomCode) => ({ roomCode, hostId: host.id, phase: "lobby", players: [{ id: host.id, name: host.name, hand: ["h"] }], deck: [1, 2] }),
  addPlayer: (game, player) => game.phase !== "lobby" ? game : { ...game, players: [...game.players, { ...player, hand: ["g"] }] },
  actions: { start: { host: true, run: (game) => ({ ...game, phase: "playing" }) } },
  computerStep: (game) => game,
  view: (game, viewerId) => ({ ...game, deck: [], deckCount: game.deck.length, players: game.players.map((p) => ({ ...p, hand: p.id === viewerId ? p.hand : [], handCount: p.hand.length })) }),
};

function storage() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}

function install() {
  const store = createSupabaseRoomStore({ namespace: "svc2", memoryKey: `__svc2${Math.random()}`, environment: {} });
  const routes = createEngineRoomRoutes(createEngineRoom({ store, adapter }));
  const browsers = [storage(), storage(), storage()];
  globalThis.window = { localStorage: browsers[0] };
  globalThis.fetch = async (url, init = {}) => {
    const parts = String(url).split("/");
    const request = new Request(`http://t${url}`, { method: init.method || "GET", headers: init.headers, body: init.body });
    if (parts.length === 4) return routes.collection.POST(request);
    const context = { params: Promise.resolve({ code: parts[4] }) };
    return init.method === "POST" ? routes.item.POST(request, context) : routes.item.GET(request, context);
  };
  return (index) => { globalThis.window.localStorage = browsers[index]; };
}

test("host and guest each see only their own hand; a stranger has no seat", async () => {
  const as = install();
  const service = createEngineRoomService("svc2", "Toy");

  as(0);
  const created = await service.create("Host");
  const code = created.state.roomCode;
  assert.equal(service.hasSeat(code), true);

  as(1);
  assert.equal(service.hasSeat(code), false);
  const joined = await service.join(code, "Guest");
  assert.equal(joined.state.players.find((p) => p.id === joined.playerId).hand[0], "g");

  as(0);
  const started = await service.action(code, "start");
  assert.equal(started.phase, "playing");
  const hostView = await service.load(code);
  assert.deepEqual(hostView.players.find((p) => p.id !== created.playerId).hand, []);
  assert.deepEqual(hostView.deck, []);

  as(2);
  await assert.rejects(() => service.load(code), (e) => e instanceof EngineRoomError && e.status === 403);
  await assert.rejects(() => service.action(code, "start"), EngineRoomError);
  assert.equal(await service.load("ZZZZZ"), null);
});
