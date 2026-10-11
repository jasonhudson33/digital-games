import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { boardForGame } from "../lib/catan-board.js";
import { catanAdapter, catanView, edgeIsLegal, legalVertexIds } from "../lib/catan-room-adapter.js";

function setup() {
  const store = createSupabaseRoomStore({ namespace: "catan-test", memoryKey: `__catanEngine${Math.random()}`, environment: {} });
  return { store, room: createEngineRoom({ store, adapter: catanAdapter }) };
}

async function lobby(extra = 2) {
  const { store, room } = setup();
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 0; i < extra; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i + 1}` }));
  return { store, room, code, seats, host };
}

const act = (ctx, seat, action, args = {}) => ctx.room.act({ roomCode: ctx.code, token: seat.token, action, args });

/** Place every starting settlement and road, returning the finished setup. */
async function finishSetup(ctx) {
  for (let guard = 0; guard < 40; guard += 1) {
    const raw = await ctx.store.load(ctx.code);
    if (!raw.setup) return raw;
    const active = raw.players[raw.currentPlayerIndex];
    const seat = ctx.seats.find((s) => s.playerId === active.id);
    const board = boardForGame(raw);
    if (raw.setup.step === "settlement") {
      const vertex = [...legalVertexIds(raw, active.id, "settlement")][0];
      await act(ctx, seat, "place", { kind: "settlement", targetId: vertex });
    } else {
      const edge = board.edges.find((e) => edgeIsLegal(raw, active.id, "road", e.id));
      await act(ctx, seat, "place", { kind: "road", targetId: edge.id });
    }
  }
  throw new Error("setup did not finish");
}

async function started(extra = 2) {
  const ctx = await lobby(extra);
  await act(ctx, ctx.host, "start");
  return ctx;
}

test("a seat's payload carries its own cards only; opponents and decks are counts", async () => {
  const ctx = await started();
  await finishSetup(ctx);
  const raw = await ctx.store.load(ctx.code);
  assert.ok(raw.players.some((p) => Object.values(p.resources).some((n) => n > 0)), "second settlements pay out");
  for (const seat of ctx.seats) {
    const view = (await ctx.room.get({ roomCode: ctx.code, token: seat.token })).state;
    assert.deepEqual(view.developmentDeck, []);
    assert.equal(view.developmentDeckCount, raw.developmentDeck.length);
    for (const player of view.players) {
      const real = raw.players.find((p) => p.id === player.id);
      if (player.id === seat.playerId) assert.deepEqual(player.resources, real.resources);
      else {
        assert.equal(Object.values(player.resources).reduce((a, b) => a + b, 0), 0);
        assert.equal(player.resourceCount, Object.values(real.resources).reduce((a, b) => a + b, 0));
      }
    }
  }
});

test("view hides other seats' development cards and progress decks", () => {
  const game = {
    winnerId: null, developmentDeck: [{ id: "d1", type: "knight" }],
    players: [
      { id: "a", resources: { wood: 1 }, developmentCards: [{ id: "x", type: "victoryPoint" }], progressCards: [{ id: "p" }], hiddenVictoryPoints: 1 },
      { id: "b", resources: { wood: 2 }, developmentCards: [], progressCards: [], hiddenVictoryPoints: 0 },
    ],
    citiesKnights: { progressDecks: { trade: ["spy"], science: [], politics: [] } },
  };
  const view = catanView(game, "b");
  const a = view.players.find((p) => p.id === "a");
  assert.deepEqual(a.developmentCards, []);
  assert.equal(a.developmentCardCount, 1);
  assert.equal(a.hiddenVictoryPoints, 0);
  assert.deepEqual(view.citiesKnights.progressDecks.trade, []);
  assert.equal(view.citiesKnights.progressDeckCounts.trade, 1);
  assert.equal(game.players[0].hiddenVictoryPoints, 1, "stored game untouched");
});

test("lobby actions are host-only where they should be", async () => {
  const ctx = await lobby(1);
  const guest = ctx.seats[1];
  await assert.rejects(() => act(ctx, guest, "start"), /Only the host/);
  await assert.rejects(() => act(ctx, guest, "setRuleset", { ruleset: "seafarers" }), /Only the host/);
  await assert.rejects(() => act(ctx, guest, "addComputer"), /Only the host/);
  const view = (await act(ctx, ctx.host, "addComputer")).state;
  assert.equal(view.players.length, 3);
});

test("out-of-turn and illegal actions are rejected and change nothing", async () => {
  const ctx = await started();
  const raw = await ctx.store.load(ctx.code);
  const active = raw.players[raw.currentPlayerIndex];
  const waiting = ctx.seats.find((s) => s.playerId !== active.id);
  const actor = ctx.seats.find((s) => s.playerId === active.id);
  const vertex = [...legalVertexIds(raw, active.id, "settlement")][0];
  await assert.rejects(() => act(ctx, waiting, "place", { kind: "settlement", targetId: vertex }), /not available/);
  await assert.rejects(() => act(ctx, actor, "roll"), /not available/); // still in setup
  await assert.rejects(() => act(ctx, actor, "place", { kind: "settlement", targetId: "nope" }), /not available/);
  await assert.rejects(() => act(ctx, actor, "endTurn"), /not available/);
  assert.deepEqual((await ctx.store.load(ctx.code)).settlements, {});
});

test("the server rolls the dice and an unaffordable build is refused", async () => {
  const ctx = await started();
  const raw = await finishSetup(ctx);
  const active = raw.players[raw.currentPlayerIndex];
  const seat = ctx.seats.find((s) => s.playerId === active.id);
  const other = ctx.seats.find((s) => s.playerId !== active.id);
  await assert.rejects(() => act(ctx, other, "roll"), /not available/);
  await assert.rejects(() => act(ctx, seat, "endTurn"), /not available/); // not rolled yet
  const view = (await act(ctx, seat, "roll", { dice: [6, 6] })).state;
  assert.ok(view.rolled);
  const after = await ctx.store.load(ctx.code);
  assert.ok(after.dice.every((d) => d >= 1 && d <= 6));
  await assert.rejects(() => act(ctx, seat, "roll"), /not available/);
  // A client-supplied roll is ignored: nothing in the adapter reads `dice`.
  const me = after.players.find((p) => p.id === active.id);
  const broke = after;
  broke.players = broke.players.map((p) => (p.id === me.id ? { ...p, resources: { ...p.resources, wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p));
  broke.pendingSeven = null;
  broke.pendingGold = null;
  broke.rolled = true;
  await ctx.store.save(broke);
  const edge = boardForGame(broke).edges.find((e) => edgeIsLegal(broke, me.id, "road", e.id));
  await assert.rejects(() => act(ctx, seat, "place", { kind: "road", targetId: edge.id }), /not available/);
});

test("computers move one step per host call and a non-host cannot trigger them", async () => {
  const ctx = await lobby(1);
  await act(ctx, ctx.host, "addComputer");
  await act(ctx, ctx.host, "start");
  await assert.rejects(() => ctx.room.computerStep({ roomCode: ctx.code, token: ctx.seats[1].token }), /Only the host/);
  let steps = 0;
  for (; steps < 300; steps += 1) {
    const raw = await ctx.store.load(ctx.code);
    const due = raw.players[raw.currentPlayerIndex];
    if (!due.isComputer || raw.winnerId) break;
    const before = raw.updatedAt;
    const after = (await ctx.room.computerStep({ roomCode: ctx.code, token: ctx.host.token })).state;
    if (after.updatedAt === before) break;
  }
  assert.ok(steps < 300);
});

test("the Catan route exposes GET and POST only", async () => {
  const item = await import("../app/api/catan/rooms/[code]/route.js");
  const collection = await import("../app/api/catan/rooms/route.js");
  assert.equal(typeof item.GET, "function");
  assert.equal(typeof item.POST, "function");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof collection.POST, "function");
});

test("every play action refuses a seat that holds nothing to act on", async () => {
  const ctx = await started();
  await finishSetup(ctx);
  const raw = await ctx.store.load(ctx.code);
  const idle = ctx.seats.find((s) => s.playerId !== raw.players[raw.currentPlayerIndex].id);
  const lobbyOnly = new Set(["addComputer", "removeComputer", "color", "setRuleset", "start", "restart"]);
  const junk = { kind: "road", targetId: "e0", vertexId: "v0", cardId: "x", choice: "1", resource: "wood", tileId: 0, token: "robber", playerId: ctx.host.playerId, give: "wood", get: "brick", accepted: true, track: "trade", from: "e0", to: "e1", resources: {}, offer: { wood: 1 }, request: { brick: 1 } };
  const before = JSON.stringify(await ctx.store.load(ctx.code));
  for (const name of Object.keys(catanAdapter.actions)) {
    if (lobbyOnly.has(name)) continue;
    await assert.rejects(() => act(ctx, idle, name, junk), /not available|Only the host/, `${name} accepted from an idle seat`);
  }
  assert.equal(JSON.stringify(await ctx.store.load(ctx.code)), before);
});

for (const ruleset of ["original", "combined"]) {
  test(`a computer-only ${ruleset} game plays to a winner on the server`, async () => {
    const ctx = await lobby(0);
    await act(ctx, ctx.host, "addComputer");
    await act(ctx, ctx.host, "addComputer");
    if (ruleset !== "original") await act(ctx, ctx.host, "setRuleset", { ruleset });
    await act(ctx, ctx.host, "start");
    const raw = await ctx.store.load(ctx.code);
    raw.players = raw.players.map((p) => ({ ...p, isComputer: true }));
    await ctx.store.save(raw);
    let winner = null;
    for (let step = 0; step < 4000 && !winner; step += 1) {
      const before = (await ctx.store.load(ctx.code)).updatedAt;
      const state = (await ctx.room.computerStep({ roomCode: ctx.code, token: ctx.host.token })).state;
      winner = state.winnerId;
      assert.notEqual(state.updatedAt, before, `computer stalled at step ${step}`);
    }
    assert.ok(winner, "a winner is declared");
  });
}
