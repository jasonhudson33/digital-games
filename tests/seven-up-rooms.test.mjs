import test from "node:test";
import assert from "node:assert/strict";

import { SevenUpGame } from "../lib/game.js";
import {
  MAX_DISPLAY_NAME,
  createRoom,
  getRoomState,
  joinRoom,
  startRoom,
} from "../lib/rooms.js";

/*
 * Every other game has a *-rooms test; 7-Up had none, because lib/rooms.js
 * imported "./game" and "./room-store" without extensions and so could not be
 * loaded by `node --test` at all. Two of the worst defects in the audit lived
 * in that blind spot.
 */

const humans = (count) => Array.from({ length: count }, () => ({ playerType: "human" }));

test("two players choosing the same name are not dealt the same hand", async () => {
  // Previously both seats collapsed onto one entry in playerStates: each was
  // reported holding 35 cards, identical card for card, out of a 52-card deck.
  const created = await createRoom({ players: humans(3), name: "Sam" });
  const roomCode = created.roomCode;
  const second = await joinRoom({ roomCode, seatId: "seat-2", name: "Sam" });
  await joinRoom({ roomCode, seatId: "seat-3", name: "Riley" });
  await startRoom({ roomCode, token: created.playerToken });

  const hostView = await getRoomState({ roomCode, token: created.playerToken });
  const secondView = await getRoomState({ roomCode, token: second.playerToken });

  const hostHand = hostView.players.find((player) => player.isViewer).hand;
  const secondHand = secondView.players.find((player) => player.isViewer).hand;

  assert.notDeepEqual(hostHand, secondHand);
  assert.equal(
    hostView.players.reduce((total, player) => total + player.handCount, 0),
    52,
    "a 52-card deck must deal to exactly 52 cards across the seats",
  );
  const names = hostView.players.map((player) => player.displayName);
  assert.equal(new Set(names).size, names.length, "display names must stay distinct");
});

test("the engine refuses duplicate names rather than corrupting the deal", () => {
  assert.throws(
    () => new SevenUpGame(["Sam", "Sam", "Alex"], 0),
    /distinct name/i,
  );
});

test("createRoom rejects player counts the engine cannot deal", async () => {
  await assert.rejects(() => createRoom({ players: humans(2), name: "A" }), /needs 3–7 players/);
  await assert.rejects(() => createRoom({ players: humans(30), name: "A" }), /needs 3–7 players/);
  await assert.rejects(() => createRoom({ players: [], name: "A" }), /who is playing/);
  await assert.rejects(() => createRoom({ players: undefined, name: "A" }), /who is playing/);
});

test("createRoom rejects a seat that is neither human nor computer", async () => {
  // An unrecognised playerType used to create and start fine, then deadlock the
  // moment the turn reached it: no computer runs it, no token can claim it, and
  // joinRoom refuses it as non-human.
  await assert.rejects(
    () => createRoom({
      players: [{ playerType: "human" }, { playerType: "alien" }, { playerType: "computer" }],
      name: "A",
    }),
    /"human" or "computer"/,
  );
});

test("a room needs at least one human seat", async () => {
  await assert.rejects(
    () => createRoom({ players: [{ playerType: "computer" }, { playerType: "computer" }, { playerType: "computer" }], name: "A" }),
    /has to be human/,
  );
});

test("display names are trimmed and bounded", async () => {
  const created = await createRoom({
    players: [{ playerType: "human" }, { playerType: "computer" }, { playerType: "computer" }],
    name: "   Riley   the   Long   ".padEnd(500, "x"),
  });
  const host = created.roomState.players.find((player) => player.isViewer);
  assert.ok(host.displayName.length <= MAX_DISPLAY_NAME);
  assert.equal(host.displayName, host.displayName.trim());
  assert.ok(!/\s{2,}/.test(host.displayName));
});

test("room codes and seat tokens are unguessable and unique", async () => {
  const codes = new Set();
  const tokens = new Set();
  for (let index = 0; index < 12; index += 1) {
    const created = await createRoom({ players: humans(3), name: "Host" });
    codes.add(created.roomCode);
    tokens.add(created.playerToken);
    assert.match(created.roomCode, /^[A-Z2-9]{6}$/);
    assert.ok(created.playerToken.length >= 28, "seat tokens carry enough entropy to resist guessing");
  }
  assert.equal(codes.size, 12);
  assert.equal(tokens.size, 12);
});

test("a viewer without a token sees hand sizes but never cards", async () => {
  const created = await createRoom({ players: humans(3), name: "Host" });
  const roomCode = created.roomCode;
  await joinRoom({ roomCode, seatId: "seat-2", name: "Bea" });
  await joinRoom({ roomCode, seatId: "seat-3", name: "Cal" });
  await startRoom({ roomCode, token: created.playerToken });

  const anonymous = await getRoomState({ roomCode });
  assert.equal(anonymous.viewerSeatId, null);
  for (const player of anonymous.players) {
    assert.equal(player.hand, null);
    assert.ok(player.handCount > 0);
  }
});
