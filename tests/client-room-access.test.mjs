import assert from "node:assert/strict";
import test from "node:test";

import { createClientRoomRoute } from "../lib/client-room-route.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";

function makeRoute() {
  const store = createSupabaseRoomStore({
    namespace: "access-test",
    memoryKey: `__accessTestRooms${Math.random()}`,
    environment: {},
  });
  return createClientRoomRoute({ store, label: "Test" });
}

const ctx = (code) => ({ params: Promise.resolve({ code }) });
const get = (route, code, token) =>
  route.GET(new Request(`http://t/${code}`, { headers: token ? { "x-seat-token": token } : {} }), ctx(code));
const put = (route, code, state, { token, expectedUpdatedAt } = {}) =>
  route.PUT(
    new Request(`http://t/${code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { "x-seat-token": token } : {}) },
      body: JSON.stringify({ state, expectedUpdatedAt }),
    }),
    ctx(code),
  );

const lobby = (code, players, extra = {}) => ({ roomCode: code, phase: "lobby", players, updatedAt: 1, ...extra });
const human = (id) => ({ id, name: id });

test("creating a room issues the host a token and never returns the seat map", async () => {
  const route = makeRoute();
  const response = await put(route, "AAAAA", lobby("AAAAA", [human("host")]));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.seatToken);
  assert.equal("__seats" in body.state, false);
  const read = await (await get(route, "AAAAA")).json();
  assert.equal("__seats" in read.state, false);
});

test("a lobby can be read and joined with the code alone, and the join issues a token", async () => {
  const route = makeRoute();
  await put(route, "BBBBB", lobby("BBBBB", [human("host")]));
  const lobbyRead = await get(route, "BBBBB");
  assert.equal(lobbyRead.status, 200);
  const joined = await put(route, "BBBBB", lobby("BBBBB", [human("host"), human("guest")], { updatedAt: 2 }), { expectedUpdatedAt: 1 });
  const body = await joined.json();
  assert.equal(joined.status, 200);
  assert.ok(body.seatToken);
});

test("once a game has started a code alone cannot read or write it", async () => {
  const route = makeRoute();
  const created = await (await put(route, "CCCCC", lobby("CCCCC", [human("host"), human("p2")]))).json();
  const started = { roomCode: "CCCCC", phase: "playing", players: [human("host"), human("p2")], hands: { host: ["a"], p2: ["b"] }, updatedAt: 2 };
  assert.equal((await put(route, "CCCCC", started, { token: created.seatToken, expectedUpdatedAt: 1 })).status, 200);

  assert.equal((await get(route, "CCCCC")).status, 403);
  assert.equal((await get(route, "CCCCC", "wrong")).status, 403);
  assert.equal((await put(route, "CCCCC", { ...started, updatedAt: 3 }, { expectedUpdatedAt: 2 })).status, 401);
  assert.equal((await put(route, "CCCCC", { ...started, updatedAt: 3 }, { token: "wrong", expectedUpdatedAt: 2 })).status, 403);
  assert.equal((await get(route, "CCCCC", created.seatToken)).status, 200);
});

test("a tokenless visitor cannot join a started room or add a computer to a lobby", async () => {
  const route = makeRoute();
  const created = await (await put(route, "DDDDD", lobby("DDDDD", [human("host")]))).json();
  const bot = { id: "bot", name: "Bot", isComputer: true };
  assert.equal((await put(route, "DDDDD", lobby("DDDDD", [human("host"), bot], { updatedAt: 2 }), { expectedUpdatedAt: 1 })).status, 401);
  assert.equal((await put(route, "DDDDD", lobby("DDDDD", [human("host"), bot], { updatedAt: 2 }), { token: created.seatToken, expectedUpdatedAt: 1 })).status, 200);
});

test("a seated player cannot remove another human, but can remove a computer", async () => {
  const route = makeRoute();
  const host = await (await put(route, "EEEEE", lobby("EEEEE", [human("host")]))).json();
  const bot = { id: "bot", name: "Bot", isComputer: true };
  await put(route, "EEEEE", lobby("EEEEE", [human("host"), bot], { updatedAt: 2 }), { token: host.seatToken, expectedUpdatedAt: 1 });
  const guest = await (await put(route, "EEEEE", lobby("EEEEE", [human("host"), bot, human("guest")], { updatedAt: 3 }), { expectedUpdatedAt: 2 })).json();
  assert.ok(guest.seatToken);
  assert.equal((await put(route, "EEEEE", lobby("EEEEE", [bot, human("guest")], { updatedAt: 4 }), { token: guest.seatToken, expectedUpdatedAt: 3 })).status, 403);
  assert.equal((await put(route, "EEEEE", lobby("EEEEE", [human("host"), human("guest")], { updatedAt: 4 }), { token: guest.seatToken, expectedUpdatedAt: 3 })).status, 200);
});

test("rooms stored before tokens existed stay open until they expire", async () => {
  const store = createSupabaseRoomStore({ namespace: "legacy-test", memoryKey: `__legacy${Math.random()}`, environment: {} });
  await store.save({ roomCode: "FFFFF", phase: "playing", players: [human("a")], updatedAt: 1 });
  const route = createClientRoomRoute({ store, label: "Test" });
  assert.equal((await get(route, "FFFFF")).status, 200);
  assert.equal((await put(route, "FFFFF", { roomCode: "FFFFF", phase: "playing", players: [human("a")], updatedAt: 2 }, { expectedUpdatedAt: 1 })).status, 200);
});

test("stale writes still conflict", async () => {
  const route = makeRoute();
  const host = await (await put(route, "GGGGG", lobby("GGGGG", [human("host")]))).json();
  assert.equal((await put(route, "GGGGG", lobby("GGGGG", [human("host")], { updatedAt: 2 }), { token: host.seatToken, expectedUpdatedAt: 1 })).status, 200);
  assert.equal((await put(route, "GGGGG", lobby("GGGGG", [human("host")], { updatedAt: 3 }), { token: host.seatToken, expectedUpdatedAt: 1 })).status, 409);
});

test("the host's token can drive computer seats through a started game", async () => {
  const route = makeRoute();
  const bot = { id: "bot", name: "Bot", isComputer: true };
  const host = await (await put(route, "HHHHH", lobby("HHHHH", [human("host"), bot]))).json();
  const playing = (turn, updatedAt) => ({ roomCode: "HHHHH", phase: "playing", players: [human("host"), bot], turn, updatedAt });
  assert.equal((await put(route, "HHHHH", playing("host", 2), { token: host.seatToken, expectedUpdatedAt: 1 })).status, 200);
  assert.equal((await put(route, "HHHHH", playing("bot", 3), { token: host.seatToken, expectedUpdatedAt: 2 })).status, 200);
  assert.equal((await put(route, "HHHHH", playing("host", 4), { token: host.seatToken, expectedUpdatedAt: 3 })).status, 200);
});
