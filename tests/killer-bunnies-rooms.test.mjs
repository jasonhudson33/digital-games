import assert from "node:assert/strict";
import test from "node:test";

import {
  addKillerBunniesComputer,
  chooseInitialKillerBunniesRoomRun,
  createKillerBunniesRoom,
  getKillerBunniesRoom,
  joinKillerBunniesRoom,
  setKillerBunniesExpansions,
  startKillerBunniesRoom,
} from "../lib/killer-bunnies-rooms.js";

test("rooms accept humans and computer players while keeping programmed runs private", async () => {
  const host = await createKillerBunniesRoom({ name: "Host" });
  const guest = await joinKillerBunniesRoom({ roomCode: host.state.roomCode, name: "Guest" });
  await addKillerBunniesComputer({ roomCode: host.state.roomCode, token: host.token });
  const started = await startKillerBunniesRoom({ roomCode: host.state.roomCode, token: host.token, random: () => 0 });

  assert.equal(started.state.players.length, 3);
  assert.equal(started.state.players.filter((player) => player.isComputer).length, 1);
  assert.equal(started.state.phase, "setupRun");
  assert.equal(started.state.players[0].hand.length, 7);
  assert.equal(started.state.players[1].hand.length, 0);
  assert.equal(started.state.players[1].handCount, 7);
  assert.equal(started.state.players[1].topRun, null);

  const hostCards = started.state.players[0].hand;
  await chooseInitialKillerBunniesRoomRun({
    roomCode: host.state.roomCode,
    token: host.token,
    topCardId: hostCards[0].id,
    bottomCardId: hostCards[1].id,
  });

  const guestView = await getKillerBunniesRoom({ roomCode: host.state.roomCode, token: guest.token });
  assert.equal(guestView.state.viewerPlayerIndex, 1);
  assert.equal(guestView.state.players[0].hand.length, 0);
  assert.equal(guestView.state.players[0].topRun.hidden, true);
  assert.equal(guestView.state.players[0].bottomRun.hidden, true);
  assert.equal(guestView.state.players[1].hand.length, 7);

  const guestCards = guestView.state.players[1].hand;
  const ready = await chooseInitialKillerBunniesRoomRun({
    roomCode: host.state.roomCode,
    token: guest.token,
    topCardId: guestCards[2].id,
    bottomCardId: guestCards[4].id,
  });
  assert.equal(ready.state.phase, "play");
  assert.equal(ready.state.players[1].hand.length, 5);
  assert.equal(guestView.state.magicCarrotDeck.every((card) => card.hidden), true);
});

test("only the host can select expansion packs and every player sees the selection", async () => {
  const host = await createKillerBunniesRoom({ name: "Host" });
  const guest = await joinKillerBunniesRoom({ roomCode: host.state.roomCode, name: "Guest" });

  await assert.rejects(
    setKillerBunniesExpansions({ roomCode: host.state.roomCode, token: guest.token, expansionIds: ["red"] }),
    /Only the host/,
  );

  const configured = await setKillerBunniesExpansions({
    roomCode: host.state.roomCode,
    token: host.token,
    expansionIds: ["red", "green", "not-a-pack"],
  });
  assert.deepEqual(configured.state.expansionIds, ["red", "green"]);
  assert.equal(configured.state.expansionCatalog.length, 18);
  assert.equal(configured.state.expansionSummary.totalCards, 224);

  const guestView = await getKillerBunniesRoom({ roomCode: host.state.roomCode, token: guest.token });
  assert.deepEqual(guestView.state.expansionIds, ["red", "green"]);

  const started = await startKillerBunniesRoom({ roomCode: host.state.roomCode, token: host.token, random: () => 0 });
  assert.deepEqual(started.state.expansionIds, ["red", "green"]);
  assert.equal(started.state.cardCounts.total, 224);
});
