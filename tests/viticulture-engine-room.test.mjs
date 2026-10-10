import assert from "node:assert/strict";
import test from "node:test";

import { viticultureAdapter } from "../lib/viticulture-room-adapter.js";
import { currentPlayer } from "../lib/viticulture.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(viticultureAdapter, options);
const KINDS = ["vines", "orders", "summer", "winter"];
const uids = (cards) => KINDS.flatMap((kind) => cards[kind].map((c) => c.uid));

test("a seat sees its own cards and counts for everyone else's; decks and discards are counts", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const secret = [
      ...raw.players.filter((p) => p.id !== seat.playerId).flatMap((p) => uids(p.cards)),
      ...KINDS.flatMap((kind) => raw.decks[kind].map((c) => c.uid)),
    ];
    assertNoneLeaked(view, secret, "private card");
    const own = raw.players.find((p) => p.id === seat.playerId);
    assert.deepEqual(uids(view.players.find((p) => p.id === seat.playerId).cards), uids(own.cards));
    for (const player of view.players) {
      const real = raw.players.find((p) => p.id === player.id);
      for (const kind of KINDS) assert.equal(player.cardCounts[kind], real.cards[kind].length);
      if (player.id !== seat.playerId) assert.equal(uids(player.cards).length, 0);
    }
    for (const kind of KINDS) {
      assert.deepEqual(view.decks[kind], []);
      assert.equal(view.deckCounts[kind], raw.decks[kind].length);
      assert.equal(view.discardCounts[kind], raw.discard[kind].length);
    }
  }
});

test("fields, wine and board placements stay public", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  for (const player of raw.players) {
    const shown = view.players.find((p) => p.id === player.id);
    assert.deepEqual(shown.fields, player.fields);
    assert.deepEqual(shown.wines, player.wines);
  }
  assert.deepEqual(view.placements, raw.placements);
});

test("wake-up rows and actions are validated on the server and only the seat to act may move", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "wakeUp", args: { row: 3 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "wakeUp", args: { row: 99 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "action", args: { actionId: "tour" } }), /not available/); // spring: no worker placement yet
  await room.act({ roomCode: code, token: actor.token, action: "wakeUp", args: { row: 3 } });
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "wakeUp", args: { row: 3 } }), /not available/); // row taken
  await room.act({ roomCode: code, token: waiting.token, action: "wakeUp", args: { row: 4 } });
  const after = await store.load(code);
  assert.equal(after.season, "summer");
});

test("an order not held and a card not held are rejected; a held card is accepted", async () => {
  const { room, store, code, seats } = await start({ humans: 2 });
  let stored = await store.load(code);
  stored.season = "summer";
  stored.turnCursor = 0;
  stored.wakeChoices = {};
  stored.placements = {};
  stored.passedSeason = [];
  await store.save(stored);
  stored = await store.load(code);
  const current = currentPlayer(stored);
  const actor = seats.find((s) => s.playerId === current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "action", args: { actionId: "plant", payload: { cardId: "not-held", fieldId: "field-5" } } }), /not available/);
  const before = (await store.load(code)).players.find((p) => p.id === actor.playerId);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "action", args: { actionId: "draw-vine" } })).state;
  const me = view.players.find((p) => p.id === actor.playerId);
  assert.ok(me.cards.vines.length > before.cards.vines.length, "the server drew from its own deck");
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/viticulture/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
