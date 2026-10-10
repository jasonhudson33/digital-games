import assert from "node:assert/strict";
import test from "node:test";

import { createClientRoomRoute } from "../lib/client-room-route.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { createCardGameRoomService, RoomAccessError } from "../components/card-game-room-service.js";
import { createLobby as createUnoLobby, addPlayer as addUnoPlayer, startGame as startUno } from "../lib/uno.js";

function makeStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function install() {
  const store = createSupabaseRoomStore({ namespace: "svc", memoryKey: `__svc${Math.random()}`, environment: {} });
  const route = createClientRoomRoute({ store, label: "Test" });
  globalThis.window = { localStorage: makeStorage() };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init = {}) => {
    const code = String(url).split("/").pop();
    const request = new Request(`http://t${url}`, { method: init.method || "GET", headers: init.headers, body: init.body });
    const context = { params: Promise.resolve({ code }) };
    return init.method === "PUT" ? route.PUT(request, context) : route.GET(request, context);
  };
  const browsers = [makeStorage(), makeStorage(), makeStorage()];
  const as = (index) => {
    globalThis.window.localStorage = browsers[index];
    globalThis.localStorage = browsers[index];
  };
  return { as };
}

test("a host and guest play through the shared service, and a stranger is kept out once the game starts", async () => {
  const { as } = install();
  const service = createCardGameRoomService("svc", "Test");

  as(0);
  const code = await service.createCode();
  await service.save(createUnoLobby({ id: "host", name: "Host" }, code));

  as(1);
  const joined = await service.update(code, (room) => addUnoPlayer(room, { id: "guest", name: "Guest" }));
  assert.equal(joined.players.length, 2);

  as(0);
  const started = await service.update(code, (room) => startUno(room));
  assert.equal(started.phase !== "lobby", true);

  as(1);
  assert.ok(await service.load(code), "seated guest can read");

  as(2);
  await assert.rejects(() => service.load(code), RoomAccessError);
  await assert.rejects(
    () => service.update(code, (room) => room),
    RoomAccessError,
  );
});
