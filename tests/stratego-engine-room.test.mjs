import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { strategoAdapter } from "../lib/stratego-room-adapter.js";
import { STRATEGO_ARMY_SIZE, currentStrategoPlayer, legalStrategoMoves } from "../lib/stratego.js";

async function twoPlayerRoom() {
  const store = createSupabaseRoomStore({ namespace: "stratego-test", memoryKey: `__strat${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: strategoAdapter });
  const red = await room.create({ name: "Red" });
  const code = red.state.roomCode;
  const blue = await room.join({ roomCode: code, name: "Blue" });
  return { store, room, code, red, blue };
}

const view = async ({ room, code }, seat) => (await room.get({ roomCode: code, token: seat.token })).state;

async function deployBoth(ctx) {
  for (const seat of [ctx.red, ctx.blue]) {
    await ctx.room.act({ roomCode: ctx.code, token: seat.token, action: "autoPlace" });
    await ctx.room.act({ roomCode: ctx.code, token: seat.token, action: "ready", args: { ready: true } });
  }
}

test("during setup a seat sees only its own placement and the opponent's ready flag", async () => {
  const ctx = await twoPlayerRoom();
  await ctx.room.act({ roomCode: ctx.code, token: ctx.red.token, action: "autoPlace" });
  const raw = await ctx.store.load(ctx.code);
  const blueView = await view(ctx, ctx.blue);
  const redPieceIds = Object.values(raw.pieces).filter((p) => p.ownerId === ctx.red.playerId).map((p) => p.id);
  const payload = JSON.stringify(blueView);
  for (const id of redPieceIds) assert.equal(payload.includes(`"${id}"`), false, `red piece ${id} leaked during setup`);
  for (const [square, pieceId] of Object.entries(blueView.board)) assert.equal(blueView.pieces[pieceId].ownerId, ctx.blue.playerId, `square ${square}`);
  assert.equal(blueView.players.find((p) => p.id === ctx.red.playerId).ready, false);
  await ctx.room.act({ roomCode: ctx.code, token: ctx.red.token, action: "ready", args: { ready: true } });
  assert.equal((await view(ctx, ctx.blue)).players.find((p) => p.id === ctx.red.playerId).ready, true);
});

test("once play starts opponent pieces are unknown: no id, kind, rank, label or icon", async () => {
  const ctx = await twoPlayerRoom();
  await deployBoth(ctx);
  const raw = await ctx.store.load(ctx.code);
  assert.equal(raw.phase, "playing");
  for (const [seat, other] of [[ctx.red, ctx.blue], [ctx.blue, ctx.red]]) {
    const v = await view(ctx, seat);
    const payload = JSON.stringify(v);
    const theirs = Object.values(raw.pieces).filter((p) => p.ownerId === other.playerId);
    for (const piece of theirs) assert.equal(payload.includes(`"${piece.id}"`), false, `opponent id ${piece.id} leaked`);
    for (const kind of ["marshal", "general", "spy", "bomb", "flag", "scout", "miner"]) {
      // The viewer's own pieces carry these words; no square holding an opponent piece may.
      for (const [square, id] of Object.entries(v.board)) {
        const piece = v.pieces[id];
        if (piece.ownerId === other.playerId) assert.equal(JSON.stringify(piece).includes(kind), false, `${kind} at ${square}`);
      }
    }
    const opposing = Object.entries(v.board).filter(([, id]) => v.pieces[id].ownerId === other.playerId);
    assert.equal(opposing.length, STRATEGO_ARMY_SIZE);
    for (const [, id] of opposing) {
      assert.equal(v.pieces[id].hidden, true);
      assert.equal(v.pieces[id].kind, undefined);
      assert.equal(v.pieces[id].rank, undefined);
    }
    assert.ok(v.moveHistory.every((move) => move.playerId === seat.playerId));
  }
});

test("moves and battles are decided on the server and reveal only what a battle reveals", async () => {
  const ctx = await twoPlayerRoom();
  await deployBoth(ctx);
  let raw = await ctx.store.load(ctx.code);
  const mover = currentStrategoPlayer(raw);
  const seat = mover.id === ctx.red.playerId ? ctx.red : ctx.blue;
  const other = seat === ctx.red ? ctx.blue : ctx.red;

  // Wrong seat, wrong piece, and an illegal square are all refused.
  await assert.rejects(() => ctx.room.act({ roomCode: ctx.code, token: other.token, action: "move", args: { pieceId: Object.values(raw.pieces).find((p) => p.ownerId === other.playerId && !p.immobile).id, row: 4, column: 0 } }), /not available/);
  const theirPiece = Object.values(raw.pieces).find((p) => p.ownerId === other.playerId);
  await assert.rejects(() => ctx.room.act({ roomCode: ctx.code, token: seat.token, action: "move", args: { pieceId: theirPiece.id, row: 5, column: 0 } }), /not available/);

  const movable = Object.values(raw.pieces).find((p) => p.ownerId === seat.playerId && legalStrategoMoves(raw, seat.playerId, p.id).length);
  const target = legalStrategoMoves(raw, seat.playerId, movable.id)[0];
  const after = (await ctx.room.act({ roomCode: ctx.code, token: seat.token, action: "move", args: { pieceId: movable.id, row: target.row, column: target.column } })).state;
  assert.notEqual(currentStrategoPlayer(after).id, seat.playerId);
  raw = await ctx.store.load(ctx.code);
  if (!target.attack) assert.equal(after.lastBattle, null);
});

test("when the game is over every piece is revealed", async () => {
  const ctx = await twoPlayerRoom();
  await deployBoth(ctx);
  const stored = await ctx.store.load(ctx.code);
  stored.phase = "finished";
  stored.winnerId = ctx.red.playerId;
  await ctx.store.save(stored);
  const v = await view(ctx, ctx.blue);
  const redPieces = Object.values(stored.pieces).filter((p) => p.ownerId === ctx.red.playerId);
  assert.ok(redPieces.every((p) => v.pieces[p.id]?.kind === p.kind));
});

test("captured pieces are revealed to both seats", async () => {
  const ctx = await twoPlayerRoom();
  await deployBoth(ctx);
  const stored = await ctx.store.load(ctx.code);
  const redPiece = Object.values(stored.pieces).find((p) => p.ownerId === ctx.red.playerId);
  stored.captured = [redPiece.id];
  delete stored.board[Object.entries(stored.board).find(([, id]) => id === redPiece.id)[0]];
  await ctx.store.save(stored);
  const v = await view(ctx, ctx.blue);
  assert.equal(v.pieces[redPiece.id].kind, redPiece.kind);
});

test("computer steps are host only", async () => {
  const ctx = await twoPlayerRoom();
  await assert.rejects(() => ctx.room.computerStep({ roomCode: ctx.code, token: ctx.blue.token }), /Only the host/);
});

test("the route exposes GET and POST only", async () => {
  const item = await import("../app/api/stratego/rooms/[code]/route.js");
  assert.equal(item.PUT, undefined);
  assert.equal(typeof item.POST, "function");
});
