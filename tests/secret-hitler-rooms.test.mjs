import test from "node:test";
import assert from "node:assert/strict";
import {
  addSecretHitlerComputer,
  acknowledgeSecretHitlerRoomRole,
  createSecretHitlerRoom,
  getSecretHitlerRoom,
  joinSecretHitlerRoom,
  startSecretHitlerRoom,
} from "../lib/secret-hitler-rooms.js";
import { loadSecretHitlerRoom } from "../lib/secret-hitler-room-store.js";

test("a room can mix a human host with computers and keeps every role private", async () => {
  const created = await createSecretHitlerRoom({ name: "Host" });
  const { roomCode } = created.state;
  for (let index = 0; index < 4; index += 1) {
    await addSecretHitlerComputer({ roomCode, token: created.token });
  }
  const started = await startSecretHitlerRoom({ roomCode, token: created.token });
  assert.equal(started.state.players.length, 5);
  assert.equal(started.state.phase, "role_reveal");
  assert.ok(started.state.privateRole.role);
  assert.equal(started.state.players.some((player) => "role" in player), false);

  const afterAcknowledging = await acknowledgeSecretHitlerRoomRole({ roomCode, token: created.token });
  assert.notEqual(afterAcknowledging.state.phase, "role_reveal");
});

test("Fascists see Hitler and one another, while a 7-player Hitler starts without team knowledge", async () => {
  const created = await createSecretHitlerRoom({ name: "One" });
  const joins = [];
  for (let index = 2; index <= 7; index += 1) {
    joins.push(await joinSecretHitlerRoom({ roomCode: created.state.roomCode, name: `Player ${index}` }));
  }
  await startSecretHitlerRoom({ roomCode: created.state.roomCode, token: created.token });
  const room = await loadSecretHitlerRoom(created.state.roomCode);
  const tokens = [created.token, ...joins.map((join) => join.token)];
  const fascistIndex = room.game.players.findIndex((player) => player.role === "fascist");
  const hitlerIndex = room.game.players.findIndex((player) => player.role === "hitler");

  const fascistView = await getSecretHitlerRoom({ roomCode: created.state.roomCode, token: tokens[fascistIndex] });
  assert.ok(fascistView.state.privateRole.knownTeam.some((member) => member.role === "hitler"));
  assert.equal(fascistView.state.players.some((player) => "role" in player), false);

  const hitlerView = await getSecretHitlerRoom({ roomCode: created.state.roomCode, token: tokens[hitlerIndex] });
  assert.deepEqual(hitlerView.state.privateRole.knownTeam, []);
});
