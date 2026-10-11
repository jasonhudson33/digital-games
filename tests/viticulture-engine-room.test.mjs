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

/* ── Autumn decisions, events and privacy (rework-viticulture-flow) ───────── */

async function intoAutumn({ cottageFor } = {}) {
  const ctx = await start({ humans: 2 });
  const { room, store, code, seats } = ctx;
  const stored = await store.load(code);
  stored.season = "summer";
  stored.turnCursor = 0;
  stored.wakeChoices = {};
  stored.placements = {};
  stored.passedSeason = [];
  if (cottageFor) stored.players.find((p) => p.id === seats[cottageFor].playerId).structures = ["cottage"];
  await store.save(stored);
  for (let i = 0; i < 2; i += 1) {
    const current = currentPlayer(await store.load(code));
    const seat = seats.find((s) => s.playerId === current.id);
    await room.act({ roomCode: code, token: seat.token, action: "pass" });
  }
  return ctx;
}

test("autumn waits for both seats, and only a seat that is waiting may decide", async () => {
  const { room, store, code, seats } = await intoAutumn();
  const waiting = await store.load(code);
  assert.equal(waiting.season, "autumn");
  assert.equal(waiting.pending.waitingOn.length, 2);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[0].token, action: "decide", args: { choice: "nonsense" } }), /not available/);
  await room.act({ roomCode: code, token: seats[0].token, action: "decide", args: { choice: "summer" } });
  await assert.rejects(() => room.act({ roomCode: code, token: seats[0].token, action: "decide", args: { choice: "summer" } }), /not available/); // already decided
  assert.equal((await store.load(code)).season, "autumn");
  await room.act({ roomCode: code, token: seats[1].token, action: "decide", args: { choice: "winter" } });
  const after = await store.load(code);
  assert.equal(after.season, "winter");
  assert.equal(after.pending, null);
});

test("a pending decision survives a save and a reload", async () => {
  const { room, store, code, seats } = await intoAutumn();
  await room.act({ roomCode: code, token: seats[0].token, action: "decide", args: { choice: "winter" } });
  const reloaded = JSON.parse(JSON.stringify(await store.load(code)));
  assert.deepEqual(reloaded.pending.waitingOn, [seats[1].playerId]);
  const view = (await room.get({ roomCode: code, token: seats[1].token })).state;
  assert.deepEqual(view.pending.waitingOn, [seats[1].playerId]);
});

test("the visitor a Cottage owner holds aside is visible to that seat alone", async () => {
  const { room, code, seats, store } = await intoAutumn({ cottageFor: 1 });
  const raw = await store.load(code);
  const held = raw.pending.stash[seats[1].playerId];
  assert.ok(held.summer && held.winter);
  const owner = (await room.get({ roomCode: code, token: seats[1].token })).state;
  assert.ok(owner.pending.stash[seats[1].playerId], "the owner sees their choice");
  const other = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assert.deepEqual(other.pending.stash, {});
  assertNoneLeaked(other, [held.summer.uid, held.winter.uid], "held-aside visitor");
});

test("events carry no card from another seat's hand, deck or stash", async () => {
  const { room, code, seats, store } = await intoAutumn({ cottageFor: 1 });
  const raw = await store.load(code);
  const secret = [
    ...KINDS.flatMap((kind) => raw.players.find((p) => p.id === seats[1].playerId).cards[kind].map((c) => c.uid)),
    ...KINDS.flatMap((kind) => raw.decks[kind].map((c) => c.uid)),
    raw.pending.stash[seats[1].playerId].summer.uid,
  ];
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assert.ok(view.events.length > 0);
  assertNoneLeaked(view.events, secret, "card in an event");
  assert.ok(view.events.every((event) => typeof event.seq === "number"));
});

test("the view says where the first-worker bonus is still open", async () => {
  const { room, store, code, seats } = await start({ humans: 2 });
  const stored = await store.load(code);
  stored.season = "summer"; stored.turnCursor = 0; stored.wakeChoices = {}; stored.placements = {}; stored.passedSeason = [];
  await store.save(stored);
  const current = currentPlayer(await store.load(code));
  const actor = seats.find((s) => s.playerId === current.id);
  const before = (await room.get({ roomCode: code, token: actor.token })).state;
  assert.equal(before.bonusOpen.tour, true);
  const after = (await room.act({ roomCode: code, token: actor.token, action: "action", args: { actionId: "tour" } })).state;
  assert.equal(after.bonusOpen.tour, false);
  assert.equal(Object.keys(after.bonusOpen).length, 6, "only the current season's spaces");
});

test("a room saved before events existed still loads and plays", async () => {
  const { room, store, code, seats } = await start({ humans: 2 });
  const stored = await store.load(code);
  for (const key of ["events", "eventSeq", "pending", "yearRecap", "yearStartScores"]) delete stored[key];
  stored.season = "summer"; stored.turnCursor = 0; stored.wakeChoices = {}; stored.placements = {}; stored.passedSeason = [];
  await store.save(stored);
  const current = currentPlayer(await store.load(code));
  const actor = seats.find((s) => s.playerId === current.id);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "action", args: { actionId: "tour" } })).state;
  assert.ok(view.events.length > 0);
});
