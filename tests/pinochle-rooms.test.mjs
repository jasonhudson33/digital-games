import test from "node:test";
import assert from "node:assert/strict";
import {
  addPinochleComputer,
  bidPinochleRoom,
  choosePinochleRoomTrump,
  createPinochleRoom,
  getPinochleRoom,
  joinPinochleRoom,
  passPinochleRoom,
  passPinochleRoomPartnerCards,
  startPinochleRoom,
} from "../lib/pinochle-rooms.js";

test("Pinochle rooms support human players and keep hands private", async () => {
  const created = await createPinochleRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  const joined = await joinPinochleRoom({ roomCode, name: "Guest" });
  const started = await startPinochleRoom({ roomCode, token: created.token });

  assert.equal(started.state.players.length, 2);
  assert.equal(started.state.viewerPlayerIndex, 0);
  assert.ok(started.state.players[0].hand.length > 0);
  assert.equal(started.state.players[1].hand.length, 0);
  assert.ok(started.state.players[1].handCount > 0);
  assert.deepEqual(started.state.kitty, []);

  const guest = await getPinochleRoom({ roomCode, token: joined.token });
  assert.equal(guest.state.viewerPlayerIndex, 1);
  assert.equal(guest.state.players[0].hand.length, 0);
  assert.ok(guest.state.players[1].hand.length > 0);
});

test("a host can fill a Pinochle room with computers up to six seats", async () => {
  const created = await createPinochleRoom({ name: "Host" });
  for (let index = 0; index < 5; index += 1) {
    await addPinochleComputer({ roomCode: created.state.roomCode, token: created.token });
  }
  const room = await getPinochleRoom({ roomCode: created.state.roomCode, token: created.token });
  assert.equal(room.state.players.length, 6);
  await assert.rejects(
    addPinochleComputer({ roomCode: created.state.roomCode, token: created.token }),
    /at most six/,
  );
  const started = await startPinochleRoom({ roomCode: created.state.roomCode, token: created.token });
  assert.equal(started.state.players.length, 6);
  assert.equal(started.state.partnershipGame, true);
  assert.deepEqual(started.state.players.map((player) => player.teamId), [0, 1, 0, 1, 0, 1]);
});

test("only the host can manage Pinochle computer seats", async () => {
  const created = await createPinochleRoom({ name: "Host" });
  const joined = await joinPinochleRoom({ roomCode: created.state.roomCode, name: "Guest" });
  await assert.rejects(
    addPinochleComputer({ roomCode: created.state.roomCode, token: joined.token }),
    /Only the host/,
  );
});

test("partnership exchange cards remain private in room views", async () => {
  const host = await createPinochleRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const bidder = await joinPinochleRoom({ roomCode, name: "Bidder" });
  const opponent = await joinPinochleRoom({ roomCode, name: "Opponent" });
  const partner = await joinPinochleRoom({ roomCode, name: "Partner" });
  await startPinochleRoom({ roomCode, token: host.token });
  await bidPinochleRoom({ roomCode, token: bidder.token, amount: 20 });
  await passPinochleRoom({ roomCode, token: opponent.token });
  await passPinochleRoom({ roomCode, token: partner.token });
  await passPinochleRoom({ roomCode, token: host.token });
  await choosePinochleRoomTrump({ roomCode, token: bidder.token, trump: "hearts" });

  const partnerView = await getPinochleRoom({ roomCode, token: partner.token });
  const cardIds = partnerView.state.players[3].hand.slice(0, 4).map((card) => card.id);
  const afterPass = await passPinochleRoomPartnerCards({ roomCode, token: partner.token, cardIds });
  assert.equal(afterPass.state.phase, "bidder-returning");
  assert.equal(afterPass.state.players[3].hand.length, 8);
  assert.deepEqual(afterPass.state.partnerPasses, { 3: true });

  const bidderView = await getPinochleRoom({ roomCode, token: bidder.token });
  assert.equal(bidderView.state.players[1].hand.length, 16);
  assert.equal(bidderView.state.players[3].hand.length, 0);
});
