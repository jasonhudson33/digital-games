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
  playScumRoomCards,
  startScumRoom,
} from "../lib/scum-rooms.js";

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
  // Join checked only that the game had not started, so a room seated 40
  // players and dealt them in — against a catalogue that says 3-10 and a table
  // that cannot draw more than ten seats.
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

test("display names are bounded", async () => {
  const created = await createScumRoom({ name: "x".repeat(5000) });
  assert.ok(created.state.players[0].name.length <= SCUM_MAX_NAME);
});
