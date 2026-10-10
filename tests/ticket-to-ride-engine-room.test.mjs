import assert from "node:assert/strict";
import test from "node:test";

import { ticketToRideAdapter } from "../lib/ticket-to-ride-room-adapter.js";
import { currentPlayer } from "../lib/ticket-to-ride.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(ticketToRideAdapter, options);

async function pastOpening(ctx) {
  for (const seat of ctx.seats) {
    const stored = await ctx.store.load(ctx.code);
    const mine = stored.players.find((p) => p.id === seat.playerId);
    await ctx.room.act({ roomCode: ctx.code, token: seat.token, action: "chooseOpening", args: { destinationIds: mine.pendingDestinations.slice(0, 2).map((d) => d.id) } });
  }
  return ctx.store.load(ctx.code);
}

test("a seat sees its own cards and tickets; other cards, tickets, choices and all decks are counts", async () => {
  const ctx = await start({ humans: 3 });
  const { room, code, seats, raw } = ctx;
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const others = raw.players.filter((p) => p.id !== seat.playerId);
    assertNoneLeaked(view, [
      ...others.flatMap((p) => p.cards.map((c) => c.id)),
      ...others.flatMap((p) => p.pendingDestinations.map((d) => d.id)),
      ...raw.trainDeck.map((c) => c.id),
      ...raw.destinationDeck.map((d) => d.id),
    ], "private card or ticket");
    const own = raw.players.find((p) => p.id === seat.playerId);
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).cards.map((c) => c.id), own.cards.map((c) => c.id));
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).pendingDestinations.map((d) => d.id), own.pendingDestinations.map((d) => d.id));
    assert.deepEqual(view.trainDeck, []);
    assert.equal(view.trainDeckCount, raw.trainDeck.length);
    assert.equal(view.destinationDeckCount, raw.destinationDeck.length);
    for (const other of others) {
      const shown = view.players.find((p) => p.id === other.id);
      assert.equal(shown.cardCount, other.cards.length);
      assert.equal(shown.pendingDestinationCount, other.pendingDestinations.length);
    }
    assert.deepEqual(view.faceUp, raw.faceUp, "face-up cards are public");
  }
});

test("opening ticket choices are validated: too few, not offered, and out-of-phase picks are rejected", async () => {
  const ctx = await start({ humans: 2 });
  const { room, code, seats, raw } = ctx;
  const mine = raw.players.find((p) => p.id === seats[0].playerId);
  const theirs = raw.players.find((p) => p.id === seats[1].playerId);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[0].token, action: "chooseOpening", args: { destinationIds: [mine.pendingDestinations[0].id] } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[0].token, action: "chooseOpening", args: { destinationIds: [theirs.pendingDestinations[0].id, theirs.pendingDestinations[1].id] } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[0].token, action: "drawTrain", args: { source: "deck" } }), /not available/);
});

test("a ticket choice in progress is private to the chooser, and tickets are revealed when the game finishes", async () => {
  const ctx = await start({ humans: 2 });
  const { room, store, code, seats } = ctx;
  let stored = await pastOpening(ctx);
  const current = currentPlayer(stored);
  const actor = seats.find((s) => s.playerId === current.id);
  const other = seats.find((s) => s.playerId !== current.id);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "drawDestinations" })).state;
  assert.equal(view.pendingDestinationChoice.choices.length, 3);
  stored = await store.load(code);
  const offered = stored.pendingDestinationChoice.choices.map((d) => d.id);
  const otherView = (await room.get({ roomCode: code, token: other.token })).state;
  assertNoneLeaked(otherView, offered, "offered ticket");
  assert.equal(otherView.pendingDestinationChoice.choiceCount, 3);
  await assert.rejects(() => room.act({ roomCode: code, token: other.token, action: "chooseDrawn", args: { destinationIds: [offered[0]] } }), /not available/);
  await room.act({ roomCode: code, token: actor.token, action: "chooseDrawn", args: { destinationIds: [offered[0]] } });

  stored = await store.load(code);
  stored.phase = "finished";
  await store.save(stored);
  const finished = (await room.get({ roomCode: code, token: seats[0].token })).state;
  for (const player of stored.players) {
    assert.deepEqual(finished.players.find((p) => p.id === player.id).destinations.map((d) => d.id), player.destinations.map((d) => d.id));
  }
});

test("drawing and claiming are checked against the real cards, the turn and the draw count", async () => {
  const ctx = await start({ humans: 2 });
  const { room, store, code, seats } = ctx;
  let stored = await pastOpening(ctx);
  const current = currentPlayer(stored);
  const actor = seats.find((s) => s.playerId === current.id);
  const other = seats.find((s) => s.playerId !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: other.token, action: "drawTrain", args: { source: "deck" } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "claim", args: { routeId: "not-a-route", paymentColor: "red" } }), /not available/);
  const before = stored.players.find((p) => p.id === actor.playerId).cards.length;
  await room.act({ roomCode: code, token: actor.token, action: "drawTrain", args: { source: "deck" } });
  await room.act({ roomCode: code, token: actor.token, action: "drawTrain", args: { source: "deck" } });
  stored = await store.load(code);
  assert.equal(stored.players.find((p) => p.id === actor.playerId).cards.length, before + 2);
  assert.notEqual(currentPlayer(stored).id, actor.playerId);
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/ticket-to-ride/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
