import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { unoAdapter, unoView } from "../lib/uno-room-adapter.js";

function setup() {
  const store = createSupabaseRoomStore({ namespace: "uno-test", memoryKey: `__unoEngine${Math.random()}`, environment: {} });
  return { store, room: createEngineRoom({ store, adapter: unoAdapter }) };
}

async function startedRoom(ruleset = "classic", extra = 2) {
  const { store, room } = setup();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 0; i < extra; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i + 1}` }));
  if (ruleset === "flip") await room.act({ roomCode: code, token: host.token, action: "setRuleset", args: { ruleset: "flip" } });
  await room.act({ roomCode: code, token: host.token, action: "start" });
  const raw = await store.load(code);
  return { store, room, code, seats, raw };
}

const cardIds = (cards) => cards.map((card) => card.id);

test("a seat's payload carries its own hand and no id of any other hand or the draw pile", async () => {
  const { room, code, seats, raw } = await startedRoom("classic", 2);
  for (const seat of seats) {
    const payload = JSON.stringify((await room.get({ roomCode: code, token: seat.token })).state);
    const own = raw.players.find((p) => p.id === seat.playerId);
    for (const card of own.cards) assert.ok(payload.includes(`"${card.id}"`), `own card ${card.id} present`);
    for (const other of raw.players.filter((p) => p.id !== seat.playerId)) {
      for (const card of other.cards) {
        if (card.id === raw.discard.at(-1).id) continue;
        assert.equal(payload.includes(`"${card.id}"`), false, `opponent card ${card.id} leaked`);
      }
    }
    for (const card of raw.deck) assert.equal(payload.includes(`"${card.id}"`), false, `draw pile card ${card.id} leaked`);
  }
});

test("opponent hands and the draw pile come back as counts", async () => {
  const { room, code, seats, raw } = await startedRoom("classic", 2);
  const view = (await room.get({ roomCode: code, token: seats[1].token })).state;
  assert.equal(view.deckCount, raw.deck.length);
  assert.deepEqual(view.deck, []);
  for (const player of view.players) {
    const real = raw.players.find((p) => p.id === player.id).cards.length;
    if (player.id === seats[1].playerId) assert.equal(player.cards.length, real);
    else {
      assert.deepEqual(player.cards, []);
      assert.equal(player.cardCount, real);
    }
  }
});

test("a Wild Draw Four's legality is not sent while it is pending", () => {
  const game = {
    ruleset: "classic", side: null, deck: [], discard: [],
    pendingDrawFour: { offenderId: "a", victimId: "b", wasLegal: true, kind: "cards", amount: 4, extra: 2, type: "wild4" },
    players: [{ id: "a", cards: [] }, { id: "b", cards: [] }],
  };
  const victimView = unoView(game, "b");
  assert.equal("wasLegal" in victimView.pendingDrawFour, false);
  assert.equal(victimView.pendingDrawFour.victimId, "b");
  assert.equal(game.pendingDrawFour.wasLegal, true, "the stored game is untouched");
});

test("UNO Flip views carry only the face that is showing", async () => {
  const { room, code, seats } = await startedRoom("flip", 2);
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  const showing = view.side;
  const hidden = showing === "dark" ? "light" : "dark";
  for (const card of [...view.discard, ...view.players.find((p) => p.id === seats[0].playerId).cards]) {
    assert.equal(card[hidden].type, "hidden");
    assert.notEqual(card[showing].type, "hidden");
  }
});

test("the server validates moves: out of turn, card not held and wrong phase are rejected", async () => {
  const { room, code, seats, raw } = await startedRoom("classic", 2);
  const current = raw.players[raw.currentPlayerIndex];
  const waiting = seats.find((s) => s.playerId !== current.id);
  const other = raw.players.find((p) => p.id !== current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "play", args: { cardId: raw.players.find((p) => p.id === waiting.playerId).cards[0].id } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "draw" }), /not available/);
  const actor = seats.find((s) => s.playerId === current.id);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { cardId: other.cards[0].id } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "start" }), /Only the host|not available/);
});

test("a legal draw is applied and saved for the acting seat", async () => {
  const started = await startedRoom("classic", 2);
  const { room, code, seats, store } = started;
  let raw = started.raw;
  if (raw.pendingOpeningWild) {
    // An opening Wild must be given a color before anyone can draw.
    const chooser = seats.find((s) => s.playerId === raw.pendingOpeningWild);
    await room.act({ roomCode: code, token: chooser.token, action: "chooseOpeningColor", args: { color: "red" } });
    raw = await store.load(code);
  }
  const current = raw.players[raw.currentPlayerIndex];
  const actor = seats.find((s) => s.playerId === current.id);
  if (!actor) return; // a computer would be due; not the case here (all humans)
  const before = current.cards.length;
  const view = (await room.act({ roomCode: code, token: actor.token, action: "draw" })).state;
  const me = view.players.find((p) => p.id === actor.playerId);
  assert.equal(me.cards.length, before + 1);
  assert.equal(view.deckCount, raw.deck.length - 1);
  assert.equal((await store.load(code)).players.find((p) => p.id === actor.playerId).cards.length, before + 1);
});

test("computers move one step per host call and a non-host cannot trigger them", async () => {
  const { store, room } = setup();
  const host = await room.create({ name: "Host" });
  const guest = await room.join({ roomCode: host.state.roomCode, name: "Guest" });
  const code = host.state.roomCode;
  await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  await room.act({ roomCode: code, token: host.token, action: "start" });
  await assert.rejects(() => room.computerStep({ roomCode: code, token: guest.token }), /Only the host/);
  // Step until the table is waiting on a human, one move per call.
  let steps = 0;
  for (; steps < 200; steps += 1) {
    const before = await store.load(code);
    const after = (await room.computerStep({ roomCode: code, token: host.token })).state;
    if (after.updatedAt === before.updatedAt) break;
  }
  assert.ok(steps < 200, "computer steps settle on a human");
  const settled = await store.load(code);
  const due = settled.players[settled.currentPlayerIndex];
  assert.equal(Boolean(due.isComputer) && !settled.pendingOpeningWild && !settled.pendingDrawFour, false);
});

test("the UNO route exposes GET and POST only, so a whole-state PUT is refused", async () => {
  const item = await import("../app/api/uno/rooms/[code]/route.js");
  const collection = await import("../app/api/uno/rooms/route.js");
  assert.equal(typeof item.GET, "function");
  assert.equal(typeof item.POST, "function");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof collection.POST, "function");
});

test("a Wild Draw Four challenge is decided on the server from the real hands", async () => {
  const { room, store, code, seats } = await startedRoom("classic", 2);
  const stored = await store.load(code);
  const offender = stored.players[stored.currentPlayerIndex];
  const victimIndex = (stored.currentPlayerIndex + 1) % stored.players.length;
  const victim = stored.players[victimIndex];
  stored.pendingDrawFour = { offenderId: offender.id, victimId: victim.id, wasLegal: false, kind: "cards", color: "red", amount: 4, extra: 2, type: "wild4" };
  await store.save(stored);

  const victimSeat = seats.find((s) => s.playerId === victim.id);
  const before = offender.cards.length;
  const view = (await room.act({ roomCode: code, token: victimSeat.token, action: "resolveDrawFour", args: { challenge: true } })).state;
  assert.equal(view.pendingDrawFour, null);
  assert.equal((await store.load(code)).players.find((p) => p.id === offender.id).cards.length, before + 4);
  // Only the victim may resolve it.
  const again = await store.load(code);
  again.pendingDrawFour = { offenderId: offender.id, victimId: victim.id, wasLegal: true, kind: "cards", color: "red", amount: 4, extra: 2, type: "wild4" };
  await store.save(again);
  const bystander = seats.find((s) => s.playerId === offender.id);
  await assert.rejects(() => room.act({ roomCode: code, token: bystander.token, action: "resolveDrawFour", args: { challenge: true } }), /not available/);
});
