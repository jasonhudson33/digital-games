import assert from "node:assert/strict";
import test from "node:test";

import { GET, PUT } from "../app/api/catan/rooms/[code]/route.js";
import { GET as GET_MONOPOLY, PUT as PUT_MONOPOLY } from "../app/api/monopoly/rooms/[code]/route.js";

function putRoom(code, state, expectedUpdatedAt) {
  return PUT(new Request(`http://localhost/api/catan/rooms/${code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, expectedUpdatedAt }),
  }), { params: Promise.resolve({ code }) });
}

test("room compare-and-set allows only the first update from a shared revision", async () => {
  const code = `CAS${Date.now().toString(36).toUpperCase()}`;
  const initial = { roomCode: code, updatedAt: 1, pendingTrade: { fromPlayerId: "p1" } };
  assert.equal((await putRoom(code, initial)).status, 200);

  const firstAcceptance = { ...initial, updatedAt: 2, pendingTrade: null, acceptedBy: "p2" };
  const secondAcceptance = { ...initial, updatedAt: 3, pendingTrade: null, acceptedBy: "p3" };
  assert.equal((await putRoom(code, firstAcceptance, 1)).status, 200);
  assert.equal((await putRoom(code, secondAcceptance, 1)).status, 409);

  const loaded = await GET(new Request(`http://localhost/api/catan/rooms/${code}`), { params: Promise.resolve({ code }) });
  assert.equal((await loaded.json()).state.acceptedBy, "p2");
});

test("Monopoly local rooms use the same compare-and-set protection", async () => {
  const code = `MON${Date.now().toString(36).toUpperCase()}`;
  const context = { params: Promise.resolve({ code }) };
  const put = (state, expectedUpdatedAt) => PUT_MONOPOLY(new Request(`http://localhost/api/monopoly/rooms/${code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, expectedUpdatedAt }),
  }), context);
  assert.equal((await put({ roomCode: code, updatedAt: 1 })).status, 200);
  assert.equal((await put({ roomCode: code, updatedAt: 2 }, 1)).status, 200);
  assert.equal((await put({ roomCode: code, updatedAt: 3 }, 1)).status, 409);
  const loaded = await GET_MONOPOLY(new Request(`http://localhost/api/monopoly/rooms/${code}`), context);
  assert.equal((await loaded.json()).state.updatedAt, 2);
});
