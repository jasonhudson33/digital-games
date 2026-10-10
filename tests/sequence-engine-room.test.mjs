import assert from "node:assert/strict";
import test from "node:test";

import { sequenceAdapter } from "../lib/sequence-room-adapter.js";
import { currentPlayer, legalTargetsForCard } from "../lib/sequence.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(sequenceAdapter, options);

test("a seat sees its own hand, a public board, and no other hand or draw-pile card", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const secret = [
      ...raw.players.filter((p) => p.id !== seat.playerId).flatMap((p) => p.hand.map((c) => c.id)),
      ...raw.deck.map((c) => c.id),
    ];
    assertNoneLeaked(view, secret, "private card");
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).hand.map((c) => c.id), raw.players.find((p) => p.id === seat.playerId).hand.map((c) => c.id));
    assert.deepEqual(view.chips, raw.chips);
    assert.equal(view.deckCount, raw.deck.length);
  }
});

test("a card not held, a play out of turn and an illegal square are rejected", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  const waitingCard = raw.players.find((p) => p.id === waiting.playerId).hand[0];
  const mine = raw.players.find((p) => p.id === actor.playerId).hand;
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "play", args: { cardId: waitingCard.id, row: 0, column: 1 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { cardId: waitingCard.id, row: 0, column: 1 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { cardId: mine[0].id, row: 99, column: 99 } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "exchange", args: { cardId: waitingCard.id } }), /not available/);
});

test("a legal play puts a chip on the board and passes the turn", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const hand = raw.players.find((p) => p.id === actor.playerId).hand;
  const playable = hand.map((card) => ({ card, targets: legalTargetsForCard(raw, card, actor.playerId) })).find((entry) => entry.targets.length);
  assert.ok(playable, "some card has a legal square");
  const [row, column] = Array.isArray(playable.targets[0]) ? playable.targets[0] : [playable.targets[0].row, playable.targets[0].column];
  const view = (await room.act({ roomCode: code, token: actor.token, action: "play", args: { cardId: playable.card.id, row, column } })).state;
  assert.ok(Object.keys(view.chips).length >= 1);
  const after = await store.load(code);
  assert.notEqual(currentPlayer(after).id, actor.playerId);
});

test("team count is host only and computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2, computers: 2 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "setTeamCount", args: { teamCount: 3 } }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/sequence/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
