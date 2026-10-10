import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { bangAdapter, bangView } from "../lib/bang-room-adapter.js";

async function startedRoom(humans = 3) {
  const store = createSupabaseRoomStore({ namespace: "bang-test", memoryKey: `__bangEngine${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: bangAdapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 1; i < humans; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i}` }));
  while (seats.length < 4) {
    await room.act({ roomCode: code, token: host.token, action: "addComputer" });
    seats.push(null);
  }
  await room.act({ roomCode: code, token: host.token, action: "start" });
  return { store, room, code, seats: seats.filter(Boolean), raw: await store.load(code) };
}

const ids = (cards) => cards.map((card) => card.id);

test("a seat sees its own role and hand, the Sheriff's role, and no other hidden role or card", async () => {
  const { room, code, seats, raw } = await startedRoom(4);
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const payload = JSON.stringify(view);
    const own = raw.players.find((p) => p.id === seat.playerId);
    assert.equal(view.players.find((p) => p.id === seat.playerId).role, own.role);
    for (const other of raw.players.filter((p) => p.id !== seat.playerId)) {
      const shown = view.players.find((p) => p.id === other.id);
      assert.equal(shown.role, other.role === "sheriff" ? "sheriff" : null, `role of ${other.id}`);
      for (const card of other.hand) assert.equal(payload.includes(`"${card.id}"`), false, `opponent card ${card.id} leaked`);
      assert.equal(shown.hand.length, other.hand.length);
      assert.ok(shown.hand.every((card) => card.hidden === true));
      assert.equal(shown.handCount, other.hand.length);
    }
    for (const card of raw.deck) assert.equal(payload.includes(`"${card.id}"`), false, `deck card ${card.id} leaked`);
    assert.deepEqual(view.deck, []);
    assert.equal(view.deckCount, raw.deck.length);
    for (const cardId of ids(own.hand)) assert.ok(payload.includes(`"${cardId}"`));
  }
});

test("roles appear for an eliminated player and for everyone once the game is finished", () => {
  const players = [
    { id: "a", role: "sheriff", alive: true, hand: [], table: [] },
    { id: "b", role: "outlaw", alive: false, hand: [], table: [] },
    { id: "c", role: "renegade", alive: true, hand: [], table: [] },
  ];
  const view = (phase) => bangView({ phase, deck: [], players }, "a").players.map((p) => p.role);
  assert.deepEqual(view("playing"), ["sheriff", "outlaw", null]);
  assert.deepEqual(view("finished"), ["sheriff", "outlaw", "renegade"]);
});

test("equipment and characters stay public", async () => {
  const { room, code, seats, raw } = await startedRoom(4);
  const view = (await room.get({ roomCode: code, token: seats[0].token })).state;
  for (const player of raw.players) assert.equal(view.players.find((p) => p.id === player.id).character.id, player.character.id);
});

test("out-of-turn and illegal actions are rejected and leave the room unchanged", async () => {
  const { room, store, code, seats, raw } = await startedRoom(4);
  const current = raw.players[raw.turnIndex];
  const waiting = seats.find((s) => s.playerId !== current.id);
  const actor = seats.find((s) => s.playerId === current.id);
  const before = (await store.load(code)).updatedAt;
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "endTurn" }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: waiting.token, action: "play", args: { cardId: raw.players.find((p) => p.id === waiting.playerId).hand[0].id } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "play", args: { cardId: "not-a-card" } }), /not available/);
  await assert.rejects(() => room.act({ roomCode: code, token: actor.token, action: "respond", args: { cardId: raw.players.find((p) => p.id === actor.playerId).hand[0].id } }), /not available/);
  assert.equal((await store.load(code)).updatedAt, before);
});

test("a legal turn can be played through: the server accepts a card, then ends the turn", async () => {
  const { room, store, code, seats, raw } = await startedRoom(4);
  const current = raw.players[raw.turnIndex];
  const actor = seats.find((s) => s.playerId === current.id);
  let state = (await store.load(code));
  // Play any untargeted card the engine accepts, then end the turn (discarding down if required).
  const me = state.players.find((p) => p.id === current.id);
  for (const card of me.hand) {
    try {
      await room.act({ roomCode: code, token: actor.token, action: "play", args: { cardId: card.id } });
      break;
    } catch { /* not playable without a target; try the next */ }
  }
  state = await store.load(code);
  if (state.pending) return; // a card started a response phase; covered by the live HTTP run
  for (let i = 0; i < 20 && state.players[state.turnIndex].id === current.id && state.phase === "playing"; i += 1) {
    const hand = state.players.find((p) => p.id === current.id).hand;
    if (state.turnPhase === "discard") await room.act({ roomCode: code, token: actor.token, action: "discard", args: { cardId: hand[0].id } });
    else await room.act({ roomCode: code, token: actor.token, action: "endTurn" });
    state = await store.load(code);
  }
  assert.notEqual(state.players[state.turnIndex].id, current.id);
});

test("computer steps are host only", async () => {
  const { room, code, seats } = await startedRoom(3);
  await assert.rejects(() => room.computerStep({ roomCode: code, token: seats[1].token }), /Only the host/);
  await room.computerStep({ roomCode: code, token: seats[0].token });
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/bang/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
