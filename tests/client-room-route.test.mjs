import assert from "node:assert/strict";
import test from "node:test";

import { GET as getCatan, PUT as putCatan } from "../app/api/catan/rooms/[code]/route.js";
import { GET as getMonopoly, PUT as putMonopoly } from "../app/api/monopoly/rooms/[code]/route.js";

// Catan and Monopoly are the games that still use whole-state rooms.
const games = [
  { name: "Catan", get: getCatan, put: putCatan, base: "catan" },
  { name: "Monopoly", get: getMonopoly, put: putMonopoly, base: "monopoly" },
];

const ctx = (code) => ({ params: Promise.resolve({ code }) });
const unique = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e4)}`;

for (const game of games) {
  const send = (code, body, raw = false) =>
    game.put(
      new Request(`http://t/api/${game.base}/rooms/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: raw ? body : JSON.stringify(body),
      }),
      ctx(code),
    );
  const read = (code) => game.get(new Request(`http://t/api/${game.base}/rooms/${code}`), ctx(code));

  test(`${game.name}: a stored room is returned as { state } and is not cached`, async () => {
    const code = unique(game.base.slice(0, 3).toUpperCase());
    assert.equal((await send(code, { state: { roomCode: code, updatedAt: 1, phase: "playing" } })).status, 200);
    const response = await read(code);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal((await response.json()).state.phase, "playing");
  });

  test(`${game.name}: codes are matched without regard to case or whitespace`, async () => {
    const code = unique("CS");
    await send(code, { state: { roomCode: code, updatedAt: 1 } });
    const lower = await game.get(new Request("http://t/x"), ctx(`  ${code.toLowerCase()} `));
    assert.equal((await lower.json()).state.roomCode, code);
  });

  test(`${game.name}: a body whose roomCode differs from the URL, or that cannot be read, is a 400`, async () => {
    const code = unique("BAD");
    const mismatch = await send(code, { state: { roomCode: "OTHER", updatedAt: 1 } });
    assert.equal(mismatch.status, 400);
    assert.match((await mismatch.json()).error, /Invalid .* room state/);
    assert.equal((await send(code, "{", true)).status, 400);
    assert.equal((await send(code, {})).status, 400);
    assert.equal((await (await read(code)).json()).state, null, "nothing was stored");
  });

  test(`${game.name}: a write against a stale expectedUpdatedAt is a 409 and changes nothing`, async () => {
    const code = unique("STA");
    await send(code, { state: { roomCode: code, updatedAt: 1, marker: "first" } });
    assert.equal((await send(code, { state: { roomCode: code, updatedAt: 2, marker: "second" }, expectedUpdatedAt: 1 })).status, 200);
    assert.equal((await send(code, { state: { roomCode: code, updatedAt: 3, marker: "third" }, expectedUpdatedAt: 1 })).status, 409);
    assert.equal((await (await read(code)).json()).state.marker, "second");
  });
}
