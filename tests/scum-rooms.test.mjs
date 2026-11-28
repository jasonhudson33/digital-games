import test from "node:test";
import assert from "node:assert/strict";
import { getLegalScumPlays } from "../lib/scum.js";
import {
  SCUM_MAX_NAME,
  SCUM_MAX_PLAYERS,
  addScumComputer,
  createScumRoom,
  getScumRoom,
  joinScumRoom,
  leaveScumRoom,
  playScumRoomCards,
  setScumComputerSpeed,
  setScumRoomOptions,
  startNextScumRoomRound,
  startScumRoom,
  stepScumComputer,
} from "../lib/scum-rooms.js";
import { computerRoomTests } from "./room-computer-helpers.mjs";

test("players can join a Scum room and only see their own hand", async () => {
  const created = await createScumRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  const joined = await joinScumRoom({ roomCode, name: "Guest" });
  await addScumComputer({ roomCode, token: created.token });
  const started = await startScumRoom({ roomCode, token: created.token, random: () => 0 });

  assert.equal(started.state.phase, "playing");
  assert.equal(started.state.players.length, 3);
  assert.equal(started.state.viewerPlayerIndex, 0);
  assert.ok(started.state.players[0].hand.length > 0);
  assert.equal(started.state.players[1].hand.length, 0);
  assert.ok(started.state.players[1].handCount > 0);

  const guestView = await getScumRoom({ roomCode, token: joined.token });
  assert.equal(guestView.state.viewerPlayerIndex, 1);
  assert.equal(guestView.state.players[0].hand.length, 0);
  assert.ok(guestView.state.players[1].hand.length > 0);

  const play = getLegalScumPlays(started.state, 0)[0];
  const afterPlay = await playScumRoomCards({
    roomCode,
    token: created.token,
    cardIds: play.map((card) => card.id),
  });
  assert.equal(afterPlay.state.currentPlayerIndex, 1);
});

test("only the host can add computer seats", async () => {
  const created = await createScumRoom({ name: "Host" });
  const joined = await joinScumRoom({ roomCode: created.state.roomCode, name: "Guest" });

  await assert.rejects(
    addScumComputer({ roomCode: created.state.roomCode, token: joined.token }),
    /Only the host/
  );
});

test("a Scum room stops seating players at its advertised maximum", async () => {
  // Join checked only that the game had not started, so a room once seated 40
  // players and dealt them in. The catalogue advertises 3-20.
  const created = await createScumRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  for (let index = 2; index <= SCUM_MAX_PLAYERS; index += 1) {
    await joinScumRoom({ roomCode, name: `P${index}` });
  }
  await assert.rejects(() => joinScumRoom({ roomCode, name: "one too many" }), /room is full/);
  await assert.rejects(
    () => addScumComputer({ roomCode, token: created.token }),
    /room is full/,
  );
});

test("a Scum room caps class passing at four groups", async () => {
  const created = await createScumRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  for (let index = 2; index <= 10; index += 1) {
    await addScumComputer({ roomCode, token: created.token });
  }
  const { state } = await setScumRoomOptions({ roomCode, token: created.token, passGroupCount: 5 });
  assert.equal(state.passGroupCount, 4);
});

test("display names are bounded", async () => {
  const created = await createScumRoom({ name: "x".repeat(5000) });
  assert.ok(created.state.players[0].name.length <= SCUM_MAX_NAME);
});

/* ── Host-stepped computers and the room speed (platform/computer-pacing) ───── */

computerRoomTests({
  name: "Scum",
  create: createScumRoom,
  join: joinScumRoom,
  addComputer: addScumComputer,
  start: startScumRoom,
  get: getScumRoom,
  step: stepScumComputer,
  setSpeed: setScumComputerSpeed,
  computers: 3,
});


/* ── Joining a game in progress (scum-join-mid-game) ─────────────────────── */

async function startedRoom(computers = 3) {
  const created = await createScumRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  for (let index = 0; index < computers; index += 1) await addScumComputer({ roomCode, token: created.token });
  await startScumRoom({ roomCode, token: created.token, random: () => 0 });
  return { roomCode, hostToken: created.token };
}

const { loadScumRoom, saveScumRoom } = await import("../lib/scum-room-store.js");

async function finishRound(roomCode) {
  const room = await loadScumRoom(roomCode);
  const count = room.game.players.length;
  room.game = {
    ...room.game,
    phase: "finished",
    standings: Array.from({ length: count }, (_, index) => index),
    players: room.game.players.map((player, index) => ({ ...player, hand: [], place: index + 1 })),
  };
  await saveScumRoom(room);
}

test("someone can join a game in progress and waits without cards", async () => {
  const { roomCode, hostToken } = await startedRoom();
  const late = await joinScumRoom({ roomCode, name: "Eve" });
  assert.equal(late.state.phase, "waiting");
  assert.equal(late.state.players.length, 4);
  assert.deepEqual(late.state.waitingPlayers.map((player) => player.name), ["Eve"]);
  assert.ok(!JSON.stringify(late.state).includes('"hand"'), "the waiting view must not carry hands");

  const host = await getScumRoom({ roomCode, token: hostToken });
  assert.equal(host.state.players.length, 4, "a waiting player is not dealt into the current round");
  assert.deepEqual(host.state.waitingPlayers.map((player) => player.name), ["Eve"]);
});

test("waiting players count toward the twenty seats", async () => {
  const { roomCode } = await startedRoom(SCUM_MAX_PLAYERS - 2);
  await joinScumRoom({ roomCode, name: "Twentieth" });
  await assert.rejects(() => joinScumRoom({ roomCode, name: "one too many" }), /room is full/);
});

test("computers cannot be added once the game has started", async () => {
  const { roomCode, hostToken } = await startedRoom();
  await assert.rejects(() => addScumComputer({ roomCode, token: hostToken }), /already started/);
});

test("the next round deals a waiting player in as Scum", async () => {
  const { roomCode, hostToken } = await startedRoom();
  const late = await joinScumRoom({ roomCode, name: "Eve" });
  await finishRound(roomCode);
  await startNextScumRoomRound({ roomCode, token: hostToken });

  const seen = await getScumRoom({ roomCode, token: late.token });
  assert.notEqual(seen.state.phase, "waiting");
  assert.equal(seen.state.players.length, 5);
  const eve = seen.state.players[seen.state.viewerPlayerIndex];
  assert.equal(eve.name, "Eve");
  assert.equal(eve.title, "Scum");
  assert.ok(eve.hand.length > 0);
  assert.equal(seen.state.turnOrder.at(-1), seen.state.viewerPlayerIndex);
  assert.deepEqual(seen.state.waitingPlayers, []);
});

test("a waiting player can leave and is not dealt in", async () => {
  const { roomCode, hostToken } = await startedRoom();
  const late = await joinScumRoom({ roomCode, name: "Eve" });
  await leaveScumRoom({ roomCode, token: late.token });
  await finishRound(roomCode);
  const next = await startNextScumRoomRound({ roomCode, token: hostToken });
  assert.equal(next.state.players.length, 4);
  await assert.rejects(() => getScumRoom({ roomCode, token: late.token }), /Join the room/);
});

test("a seated player cannot leave mid-game", async () => {
  const { roomCode, hostToken } = await startedRoom();
  await assert.rejects(() => leaveScumRoom({ roomCode, token: hostToken }), /waiting for the next round/);
});
