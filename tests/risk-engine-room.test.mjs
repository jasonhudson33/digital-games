import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { riskAdapter } from "../lib/risk-room-adapter.js";
import { TERRITORIES } from "../lib/risk.js";

function setup(random) {
  const store = createSupabaseRoomStore({ namespace: "risk-test", memoryKey: `__risk${Math.random()}`, environment: {} });
  return { store, room: createEngineRoom({ store, adapter: riskAdapter, ...(random ? { random } : {}) }) };
}

async function lobbyWith(count, random) {
  const ctx = setup(random);
  const host = await ctx.room.create({ name: "Host" });
  const seats = [host];
  for (let i = 1; i < count; i += 1) seats.push(await ctx.room.join({ roomCode: host.state.roomCode, name: `P${i}` }));
  return { ...ctx, code: host.state.roomCode, host, seats };
}

async function started(count = 3, random) {
  const ctx = await lobbyWith(count, random);
  await ctx.room.act({ roomCode: ctx.code, token: ctx.host.token, action: "start" });
  return { ...ctx, raw: await ctx.store.load(ctx.code) };
}

const act = (ctx, seat, action, args = {}) => ctx.room.act({ roomCode: ctx.code, token: seat.token, action, args });
const seatOf = (ctx, playerId) => ctx.seats.find((s) => s.playerId === playerId);

test("lobby: hosts, joins to six, colors, trade mode and computers all run on the server", async () => {
  const ctx = await lobbyWith(2);
  assert.equal((await ctx.room.get({ roomCode: ctx.code, token: ctx.host.token })).state.players.length, 2);
  const colors = new Set((await ctx.store.load(ctx.code)).players.map((p) => p.color));
  assert.equal(colors.size, 2, "each commander gets a different color");
  await act(ctx, ctx.host, "addComputer");
  await act(ctx, ctx.host, "addComputer");
  await act(ctx, ctx.host, "addComputer");
  await act(ctx, ctx.host, "addComputer");
  assert.equal((await ctx.store.load(ctx.code)).players.length, 6);
  await assert.rejects(() => act(ctx, ctx.host, "addComputer"), /not available/);
  await assert.rejects(() => ctx.room.join({ roomCode: ctx.code, name: "late" }), /full or has already started/);
  await assert.rejects(() => act(ctx, ctx.seats[1], "addComputer"), /Only the host/);
  await assert.rejects(() => act(ctx, ctx.seats[1], "tradeMode", { mode: "normal" }), /Only the host/);
  await act(ctx, ctx.host, "tradeMode", { mode: "normal" });
  assert.equal((await ctx.store.load(ctx.code)).cardTradeMode, "normal");
  const taken = (await ctx.store.load(ctx.code)).players[0].color;
  await assert.rejects(() => act(ctx, ctx.seats[1], "color", { color: taken }), /not available/);
  const computer = (await ctx.store.load(ctx.code)).players.find((p) => p.isBot);
  await act(ctx, ctx.host, "removeComputer", { playerId: computer.id });
  assert.equal((await ctx.store.load(ctx.code)).players.length, 5);
});

test("start needs two to six commanders and is host only", async () => {
  const solo = await lobbyWith(1);
  await assert.rejects(() => act(solo, solo.host, "start"), /2.6 commanders/);
  const duo = await lobbyWith(2);
  await assert.rejects(() => act(duo, duo.seats[1], "start"), /Only the host/);
  const view = (await act(duo, duo.host, "start")).state;
  assert.equal(view.phase, "reinforce");
  assert.equal(Object.keys(view.territories).length, Object.keys(TERRITORIES).length);
});

test("a seat sees its own cards; others' cards and the card deck are counts", async () => {
  const ctx = await started(3);
  const stored = await ctx.store.load(ctx.code);
  stored.players[0].cards = [{ id: "c-a", type: "infantry", territory: "alaska" }];
  stored.players[1].cards = [{ id: "c-b", type: "cavalry", territory: "peru" }, { id: "c-c", type: "artillery", territory: "congo" }];
  await ctx.store.save(stored);
  const raw = await ctx.store.load(ctx.code);
  for (const seat of ctx.seats) {
    const view = (await ctx.room.get({ roomCode: ctx.code, token: seat.token })).state;
    const payload = JSON.stringify(view);
    for (const other of raw.players.filter((p) => p.id !== seat.playerId)) {
      for (const card of other.cards) assert.equal(payload.includes(`"${card.id}"`), false, `card ${card.id} leaked`);
      assert.equal(view.players.find((p) => p.id === other.id).cardCount, other.cards.length);
    }
    for (const card of raw.deck) assert.equal(payload.includes(`"${card.id}"`), false, `deck card ${card.id} leaked`);
    assert.deepEqual(view.deck, []);
    assert.equal(view.deckCount, raw.deck.length);
    assert.deepEqual(view.players.find((p) => p.id === seat.playerId).cards.map((c) => c.id), raw.players.find((p) => p.id === seat.playerId).cards.map((c) => c.id));
  }
});

test("every in-game action is refused for a seat that does not hold the turn", async () => {
  const ctx = await started(3);
  const turnId = ctx.raw.players[ctx.raw.currentPlayerIndex].id;
  const waiting = ctx.seats.find((s) => s.playerId !== turnId);
  const mine = Object.entries(ctx.raw.territories).filter(([, t]) => t.ownerId === turnId).map(([id]) => id);
  const before = (await ctx.store.load(ctx.code)).updatedAt;
  const attempts = [
    ["reinforce", { territoryId: Object.entries(ctx.raw.territories).find(([, t]) => t.ownerId === waiting.playerId)[0], count: 1 }],
    ["trade", {}],
    ["attack", { from: mine[0], to: mine[1] }],
    ["conquestMove", { count: 1 }],
    ["advance", {}],
    ["fortify", { from: mine[0], to: mine[1], count: 1 }],
  ];
  for (const [action, args] of attempts) await assert.rejects(() => act(ctx, waiting, action, args), /not available/, action);
  assert.equal((await ctx.store.load(ctx.code)).updatedAt, before);
});

test("the seat on the turn can reinforce, and reinforcing someone else's territory is refused", async () => {
  const ctx = await started(3);
  const turnId = ctx.raw.players[ctx.raw.currentPlayerIndex].id;
  const actor = seatOf(ctx, turnId);
  const own = Object.entries(ctx.raw.territories).find(([, t]) => t.ownerId === turnId)[0];
  const foreign = Object.entries(ctx.raw.territories).find(([, t]) => t.ownerId !== turnId)[0];
  await assert.rejects(() => act(ctx, actor, "reinforce", { territoryId: foreign, count: 1 }), /not available/);
  const view = (await act(ctx, actor, "reinforce", { territoryId: own, count: 1 })).state;
  assert.equal(view.territories[own].armies, ctx.raw.territories[own].armies + 1);
  assert.equal(view.reinforcements, ctx.raw.reinforcements - 1);
});

test("battle dice come from the server: a client-supplied rng is ignored", async () => {
  // Setup uses real randomness; the battle then rolls three sixes for the attacker and two ones for the defender.
  let script = null;
  const ctx = await started(2, () => (script ? script.shift() ?? 0 : Math.random()));
  const turnId = ctx.raw.players[ctx.raw.currentPlayerIndex].id;
  const actor = seatOf(ctx, turnId);
  const stored = await ctx.store.load(ctx.code);
  let from, to;
  for (const [id] of Object.entries(stored.territories).filter(([, t]) => t.ownerId === turnId)) {
    const neighbor = TERRITORIES[id].neighbors.find((n) => stored.territories[n].ownerId !== turnId);
    if (neighbor) { from = id; to = neighbor; break; }
  }
  assert.ok(from, "found an attackable border");
  stored.territories[from].armies = 10;
  stored.territories[to].armies = 5;
  stored.phase = "attack";
  stored.reinforcements = 0;
  await ctx.store.save(stored);
  script = [0.999, 0.999, 0.999, 0, 0];
  // A client that tries to choose its own dice (rng 0 would make every attacker die a 1) changes nothing.
  const view = (await act(ctx, actor, "attack", { from, to, attackDice: 3, rng: 0 })).state;
  assert.equal(view.territories[from].armies, 10, "attacker's sixes beat the defender's ones: no attacker losses");
  assert.equal(view.territories[to].armies, 3, "the defender lost two armies");
  await assert.rejects(() => act(ctx, actor, "attack", { from, to, attackDice: 9 }), /not available/);
});

test("computer steps are host only and a computer's turn is one step", async () => {
  const ctx = await lobbyWith(2);
  await act(ctx, ctx.host, "addComputer");
  await act(ctx, ctx.host, "start");
  await assert.rejects(() => ctx.room.computerStep({ roomCode: ctx.code, token: ctx.seats[1].token }), /Only the host/);
  const raw = await ctx.store.load(ctx.code);
  const before = raw.players[raw.currentPlayerIndex];
  await ctx.room.computerStep({ roomCode: ctx.code, token: ctx.host.token });
  const after = await ctx.store.load(ctx.code);
  if (before.isBot) assert.notEqual(after.players[after.currentPlayerIndex].id, before.id);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/risk/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});

import { readFileSync } from "node:fs";
import { runComputerTurn } from "../lib/risk.js";

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

test("a computer that conquers the last rival while holding cards finishes its turn instead of looping forever", () => {
  // This position (a computer owning 39 territories against 3, holding a trade set) hung runComputerTurn for every seed.
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/risk-bot-about-to-win.json", import.meta.url), "utf8"));
  for (let seed = 1; seed <= 20; seed += 1) {
    const result = runComputerTurn(structuredClone(fixture), mulberry(seed));
    assert.ok(result, `seed ${seed} returned a game`);
  }
});
