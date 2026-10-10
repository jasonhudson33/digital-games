import assert from "node:assert/strict";
import test from "node:test";

import { splendorAdapter } from "../lib/splendor-room-adapter.js";
import { currentPlayer, canPurchase } from "../lib/splendor.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(splendorAdapter, options);

test("the three decks are counts, markets stay public", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assertNoneLeaked(view, [1, 2, 3].flatMap((level) => raw.decks[level].map((c) => c.id)), "deck card");
  assert.deepEqual(view.decks, { 1: [], 2: [], 3: [] });
  for (const level of [1, 2, 3]) {
    assert.equal(view.deckCounts[level], raw.decks[level].length);
    assert.deepEqual(view.market[level], raw.market[level]);
  }
});

test("a reservation is private to its owner and a count for everyone else", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const other = seats.find((s) => s.playerId !== current.id);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "reserve", args: { source: { kind: "deck", level: 2 } } })).state;
  const stored = await store.load(code);
  const reserved = stored.players.find((p) => p.id === actor.playerId).reserved[0];
  assert.equal(view.players.find((p) => p.id === actor.playerId).reserved[0].id, reserved.id);
  const otherView = (await room.get({ roomCode: code, token: other.token })).state;
  assertNoneLeaked(otherView, [reserved.id], "reserved development");
  const shown = otherView.players.find((p) => p.id === actor.playerId);
  assert.deepEqual(shown.reserved, []);
  assert.equal(shown.reservedCount, 1);
  assert.equal(otherView.deckCounts[2], raw.decks[2].length - 1);
});

test("an unaffordable purchase, a move out of turn and a bad source are rejected", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  const card = raw.market[3][0];
  assert.equal(canPurchase(current, card), false);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "purchase", args: { source: { kind: "market", level: 3, index: 0 } } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "purchase", args: { source: { kind: "market", level: 9, index: 0 } } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "takeDifferent", args: { colors: ["white", "blue", "green"] } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "takeDifferent", args: { colors: ["white", "white", "blue"] } }), /not available/);
});

test("taking tokens moves them from the bank to the acting seat", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const colors = ["white", "blue", "green"].filter((c) => raw.bank[c] > 0).slice(0, 3);
  if (colors.length < 3) return;
  const view = (await room.act({ roomCode: code, token: actor.token, action: "takeDifferent", args: { colors } })).state;
  for (const color of colors) assert.equal(view.bank[color], raw.bank[color] - 1);
  assert.equal((await store.load(code)).players.find((p) => p.id === actor.playerId).tokens[colors[0]], 1);
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/splendor/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
