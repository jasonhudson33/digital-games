import assert from "node:assert/strict";
import test from "node:test";

import { whatIfAdapter } from "../lib/what-if-room-adapter.js";
import { startedRoom } from "./engine-test-helpers.mjs";

const start = (humans = 4) => startedRoom(whatIfAdapter, { humans });

const submit = (room, code, seat, ifText, thenText) =>
  room.act({ roomCode: code, token: seat.token, action: "submit", args: { if: ifText, then: thenText } });

test("while writing, a seat sees only its own text and who has submitted", async () => {
  const { room, code, seats } = await start(4);
  await submit(room, code, seats[0], "SECRET-IF-ANA", "SECRET-THEN-ANA");
  const own = (await room.get({ roomCode: code, token: seats[0].token })).state;
  assert.deepEqual(own.myEntry, { if: "SECRET-IF-ANA", then: "SECRET-THEN-ANA" });
  for (const seat of seats.slice(1)) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    const payload = JSON.stringify(view);
    assert.equal(payload.includes("SECRET-"), false, "another player's text leaked");
    assert.deepEqual(view.submitted, [seats[0].playerId]);
    assert.equal(view.myEntry, null);
    assert.equal("entries" in view, false);
  }
});

test("the reveal sends only the pairs reached so far", async () => {
  const { room, code, seats, store } = await start(5);
  for (const [index, seat] of seats.entries()) await submit(room, code, seat, `IF-${index}`, `THEN-${index}`);
  const raw = await store.load(code);
  assert.equal(raw.phase, "reveal");
  const hidden = raw.pairs.slice(1);
  for (const seat of seats) {
    const view = (await room.get({ roomCode: code, token: seat.token })).state;
    assert.equal(view.pairs.length, 1);
    assert.equal(view.pairCount, 5);
    const payload = JSON.stringify(view);
    for (const pair of hidden) {
      const shownFirst = view.pairs[0];
      if (pair.ifText !== shownFirst.ifText) assert.equal(payload.includes(`"${pair.ifText}"`), false, "unrevealed IF leaked");
      if (pair.thenText !== shownFirst.thenText) assert.equal(payload.includes(`"${pair.thenText}"`), false, "unrevealed THEN leaked");
    }
  }
  await room.act({ roomCode: code, token: seats[0].token, action: "next" });
  const second = (await room.get({ roomCode: code, token: seats[3].token })).state;
  assert.equal(second.pairs.length, 2);
  assert.deepEqual(second.pairs[1], raw.pairs[1]);
});

test("only the host can mix early, advance, and play again", async () => {
  const { room, code, seats } = await start(4);
  for (const seat of seats.slice(0, 3)) await submit(room, code, seat, "if", "then");
  await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "mixNow" }), /Only the host/);
  const mixed = (await room.act({ roomCode: code, token: seats[0].token, action: "mixNow" })).state;
  assert.equal(mixed.phase, "reveal");
  assert.equal(mixed.pairCount, 3);
  await assert.rejects(() => room.act({ roomCode: code, token: seats[2].token, action: "next" }), /Only the host/);
  for (let index = 0; index < 3; index += 1) await room.act({ roomCode: code, token: seats[0].token, action: "next" });
  await assert.rejects(() => room.act({ roomCode: code, token: seats[1].token, action: "playAgain" }), /Only the host/);
  const again = (await room.act({ roomCode: code, token: seats[0].token, action: "playAgain" })).state;
  assert.equal(again.phase, "writing");
  assert.equal(again.round, 2);
});

test("a blank half is rejected with a readable message", async () => {
  const { room, code, seats } = await start(3);
  await assert.rejects(() => submit(room, code, seats[1], "cats could vote", ""), /both/);
});
