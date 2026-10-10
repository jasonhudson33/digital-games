import assert from "node:assert/strict";
import test from "node:test";

import { fiveCrownsAdapter } from "../lib/five-crowns-room-adapter.js";
import { currentPlayer } from "../lib/five-crowns.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const start = (options) => startedRoom(fiveCrownsAdapter, options);

test("a seat sees its own hand and no other hand, draw-pile or buried discard card", async () => {
  const { room, code, seats, raw } = await start({ humans: 3 });
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const secret = [
      ...raw.players.filter((p) => p.id !== seat.playerId).flatMap((p) => p.hand.map((c) => c.id)),
      ...raw.deck.map((c) => c.id),
      ...raw.discard.slice(0, -1).map((c) => c.id),
    ];
    assertNoneLeaked(view, secret, "private card");
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).hand.map((c) => c.id), raw.players.find((p) => p.id === seat.playerId).hand.map((c) => c.id));
    assert.equal(view.deckCount, raw.deck.length);
    assert.equal(view.discard.at(-1).id, raw.discard.at(-1).id, "the top discard is public");
  }
});

test("draw, discard and going out are checked against the server's hands and turn order", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const waiting = seats.find((s) => s.playerId !== current.id);
  const waitingHand = raw.players.find((p) => p.id === waiting.playerId).hand;
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "draw" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: raw.players.find((p) => p.id === actor.playerId).hand[0].id } }), /not available/); // not drawn yet
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "goOut" }), /not available/);

  await room.act({ roomCode: code, token: actor.token, action: "draw" });
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "draw" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: waitingHand[0].id } }), /not available/);
  const mine = (await store.load(code)).players.find((p) => p.id === actor.playerId).hand;
  await room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: mine[0].id } });
  const after = await store.load(code);
  assert.notEqual(currentPlayer(after).id, actor.playerId);
});

test("going out is accepted only for a fully meldable real hand", async () => {
  const { room, store, code, seats, raw } = await start({ humans: 2 });
  const current = currentPlayer(raw);
  const actor = seats.find((s) => s.playerId === current.id);
  const stored = await store.load(code);
  const me = stored.players.find((p) => p.id === current.id);
  const wild = stored.wildRank;
  // A three-card hand of one rank (a book) is meldable in round 1; the drawn card is any extra.
  me.hand = [
    { id: "t1", type: "normal", suit: "hearts", rank: wild === 9 ? 10 : 9 },
    { id: "t2", type: "normal", suit: "clubs", rank: wild === 9 ? 10 : 9 },
    { id: "t3", type: "normal", suit: "spades", rank: wild === 9 ? 10 : 9 },
    { id: "t4", type: "normal", suit: "stars", rank: wild === 9 ? 10 : 9 },
  ];
  stored.turnDrawn = true;
  stored.outPlayerId = null;
  await store.save(stored);
  const view = (await room.act({ roomCode: code, token: actor.token, action: "goOut" })).state;
  assert.equal(view.outPlayerId, actor.playerId);
  assert.ok((view.players.find((p) => p.id === actor.playerId).melds || []).length >= 1);
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await start({ humans: 2, computers: 1 });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/five-crowns/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});

test("no card exists twice after a deal (the opening discard is not also on top of the draw pile)", async () => {
  const { raw } = await start({ humans: 3 });
  const everyCard = [...raw.deck, ...raw.discard, ...raw.players.flatMap((p) => p.hand)];
  assert.equal(new Set(everyCard.map((c) => c.id)).size, everyCard.length);
  const roundOne = raw.round + 2;
  assert.equal(raw.players[0].hand.length, roundOne);
  assert.equal(everyCard.length, 2 * (5 * 11 + 3));
});
