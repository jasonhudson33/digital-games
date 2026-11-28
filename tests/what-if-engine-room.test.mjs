import assert from "node:assert/strict";
import test from "node:test";

import { whatIfAdapter } from "../lib/what-if-room-adapter.js";
import { startedRoom } from "./engine-test-helpers.mjs";

const start = (humans = 4, computers = 0) => startedRoom(whatIfAdapter, { humans, computers });
const submit = (room, code, seat, text) => room.act({ roomCode: code, token: seat.token, action: "submit", args: { text } });
const view = async (room, code, seat) => (await room.get({ roomCode: code, token: seat.token })).state;

test("writing IFs: a seat sees its own IF and who has written, nothing else", async () => {
  const { room, code, seats } = await start(4);
  await submit(room, code, seats[0], "SECRET-IF-ANA");
  assert.equal((await view(room, code, seats[0])).myText, "SECRET-IF-ANA");
  for (const seat of seats.slice(1)) {
    const state = await view(room, code, seat);
    assert.equal(JSON.stringify(state).includes("SECRET-"), false, "another player's IF leaked");
    assert.deepEqual(state.submitted, [seats[0].playerId]);
    assert.equal(state.phase, "ifs");
  }
});

test("writing THENs: a seat sees only the IF it drew, not who wrote it, and no one's THEN", async () => {
  const { room, code, seats, store } = await start(4);
  for (const [index, seat] of seats.entries()) await submit(room, code, seat, `IF-${index}`);
  const raw = await store.load(code);
  assert.equal(raw.phase, "thens");
  for (const seat of seats) {
    const state = await view(room, code, seat);
    const drewAuthor = raw.draws[seat.playerId];
    assert.equal(state.myDraw.ifText, raw.ifs[drewAuthor]);
    const payload = JSON.stringify(state);
    for (const [author, text] of Object.entries(raw.ifs)) {
      if (author !== drewAuthor) assert.equal(payload.includes(`"${text}"`), false, "an undrawn IF leaked");
    }
    assert.equal("draws" in state, false);
    assert.deepEqual(Object.keys(state.myDraw), ["ifText"], "the draw must not say who wrote it");
  }
  await submit(room, code, seats[1], "SECRET-THEN-BEN");
  const other = await view(room, code, seats[2]);
  assert.equal(JSON.stringify(other).includes("SECRET-THEN"), false);
  assert.deepEqual(other.submitted, [seats[1].playerId]);
});

test("the reveal sends only the pairs reached so far", async () => {
  const { room, code, seats, store } = await start(5);
  for (const [index, seat] of seats.entries()) await submit(room, code, seat, `IF-${index}`);
  for (const [index, seat] of seats.entries()) await submit(room, code, seat, `THEN-${index}`);
  const raw = await store.load(code);
  assert.equal(raw.phase, "reveal");
  for (const seat of seats) {
    const state = await view(room, code, seat);
    assert.equal(state.pairs.length, 1);
    assert.equal(state.pairCount, 5);
    const payload = JSON.stringify(state);
    const shown = state.pairs[0];
    for (const pair of raw.pairs.slice(1)) {
      if (pair.ifText !== shown.ifText) assert.equal(payload.includes(`"${pair.ifText}"`), false);
      if (pair.thenText !== shown.thenText) assert.equal(payload.includes(`"${pair.thenText}"`), false);
    }
  }
  await room.act({ roomCode: code, token: seats[0].token, action: "next" });
  assert.deepEqual((await view(room, code, seats[3])).pairs[1], raw.pairs[1]);
});

test("only the host can continue early, advance, and play again", async () => {
  const { room, code, seats } = await start(4);
  for (const seat of seats.slice(0, 3)) await submit(room, code, seat, "an if");
  await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "continueNow" }), /Only the host/);
  const dealt = (await room.act({ roomCode: code, token: seats[0].token, action: "continueNow" })).state;
  assert.equal(dealt.phase, "thens");
  assert.equal(dealt.writers.length, 3);
  for (const seat of seats.slice(0, 3)) await submit(room, code, seat, "a then");
  const revealed = await view(room, code, seats[3]);
  assert.equal(revealed.phase, "reveal");
  await assert.rejects(() => room.act({ roomCode: code, token: seats[2].token, action: "next" }), /Only the host/);
  for (let index = 0; index < 3; index += 1) await room.act({ roomCode: code, token: seats[0].token, action: "next" });
  await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "playAgain" }), /Only the host/);
  const again = (await room.act({ roomCode: code, token: seats[0].token, action: "playAgain" })).state;
  assert.equal(again.phase, "ifs");
  assert.equal(again.round, 2);
});

test("the host steps computers through both writing steps", async () => {
  const { room, code, seats } = await start(1, 2);
  const host = seats[0];
  await submit(room, code, host, "I could fly");
  await room.computerStep({ roomCode: code, token: host.token });
  let state = (await room.computerStep({ roomCode: code, token: host.token })).state;
  assert.equal(state.phase, "thens");
  assert.ok(state.myDraw.ifText);
  await submit(room, code, host, "I'd never take the bus again");
  await room.computerStep({ roomCode: code, token: host.token });
  state = (await room.computerStep({ roomCode: code, token: host.token })).state;
  assert.equal(state.phase, "reveal");
  assert.equal(state.pairCount, 3);
});
