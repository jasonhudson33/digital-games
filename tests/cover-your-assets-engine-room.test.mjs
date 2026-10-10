import assert from "node:assert/strict";
import test from "node:test";

import { coverYourAssetsAdapter } from "../lib/cover-your-assets-room-adapter.js";
import { eligibleTurnActions, currentPlayer } from "../lib/cover-your-assets.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(coverYourAssetsAdapter, options);

test("a seat sees its own hand and no other hand or draw-pile card", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const secret = [
      ...raw.players.filter((p) => p.id !== seat.playerId).flatMap((p) => p.hand.map((c) => c.id)),
      ...raw.deck.map((c) => c.id),
    ];
    assertNoneLeaked(view, secret, "private card");
    const own = raw.players.find((p) => p.id === seat.playerId);
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).hand.map((c) => c.id), own.hand.map((c) => c.id));
    assert.equal(view.deckCount, raw.deck.length);
    assert.equal(view.players.find((p) => p.id !== seat.playerId).handCount, raw.players.find((p) => p.id !== seat.playerId).hand.length);
  }
});

test("the top discard is public and the rest of the discard pile is a count", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assert.equal(view.discard.length, raw.discard.length ? 1 : 0);
  if (raw.discard.length) assert.equal(view.discard[0].id, raw.discard.at(-1).id);
});

test("only the seat to act can move, and a card not held is rejected", async () => {
  const { room, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  const waitingHand = raw.players.find((p) => p.id === waiting.playerId).hand;
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "discard", args: { cardId: waitingHand[0].id } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: waitingHand[0].id } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "startChallenge", args: { defenderId: waiting.playerId, cardId: waitingHand[0].id } }), /not available/);
});

test("a legal move is applied on the server: banking a pair or discarding", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const actions = eligibleTurnActions(raw, current.id);
  const before = raw.players.find((p) => p.id === current.id).hand.length;
  if (actions.pairs.length) {
    await room.act({ roomCode: code, token: actor.token, action: "pairFromHand", args: { cardIds: actions.pairs[0] } });
    const after = (await store.load(code)).players.find((p) => p.id === current.id);
    assert.equal(after.stack.length, 1);
  } else {
    const card = raw.players.find((p) => p.id === current.id).hand[0];
    await room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: card.id } });
    const after = await store.load(code);
    assert.equal(after.discard.at(-1).id, card.id);
  }
  assert.ok(before > 0);
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2, computers: 1 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/cover-your-assets/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
