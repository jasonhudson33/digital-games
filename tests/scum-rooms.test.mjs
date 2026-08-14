import test from "node:test";
import assert from "node:assert/strict";
import { getLegalScumPlays } from "../lib/scum.js";
import {
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
