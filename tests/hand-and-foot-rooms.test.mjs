import assert from "node:assert/strict";
import test from "node:test";

import {
  addHandFootComputer,
  buildHandFootTeamPairs,
  chooseHandFootTeammate,
  createHandFootRoom,
  discardHandFootRoomCard,
  drawHandFootRoomCards,
  getHandFootRoom,
  joinHandFootRoom,
  startHandFootRoom,
} from "../lib/hand-and-foot-rooms.js";

test("room players choose teammates, start opposite, and only see their own hand", async () => {
  const created = await createHandFootRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  const joined = await joinHandFootRoom({ roomCode, name: "Guest" });
  let hostLobby = await addHandFootComputer({ roomCode, token: created.token });
  hostLobby = await addHandFootComputer({ roomCode, token: created.token });
  const guestId = joined.state.viewerPlayerId;
  const hostId = created.state.viewerPlayerId;
  await chooseHandFootTeammate({ roomCode, token: created.token, teammateId: guestId });
  await chooseHandFootTeammate({ roomCode, token: joined.token, teammateId: hostId });

  const started = await startHandFootRoom({ roomCode, token: created.token, random: () => 0 });
  assert.equal(started.state.phase, "playing");
  assert.equal(started.state.viewerPlayerIndex, 0);
  assert.equal(started.state.players[0].hand.length, 13);
  assert.equal(started.state.players[0].foot.length, 0);
  assert.equal(started.state.players[1].hand.length, 0);
  assert.equal(started.state.players[1].handCount, 13);
  assert.equal(started.state.players[2].playerId, guestId);
  assert.equal(started.state.players[0].teamId, started.state.players[2].teamId);

  const guestView = await getHandFootRoom({ roomCode, token: joined.token });
  assert.equal(guestView.state.viewerPlayerIndex, 2);
  assert.equal(guestView.state.players[0].hand.length, 0);
  assert.equal(guestView.state.players[2].hand.length, 13);
  assert.ok(guestView.state.drawPile.every((card) => card === null));
  assert.ok(guestView.state.drawPiles.flat().every((card) => card === null));

  const afterFirstDraw = await drawHandFootRoomCards({ roomCode, token: created.token, pileIndex: 0, cardCount: 1 });
  assert.equal(afterFirstDraw.state.players[0].handCount, 14);
  assert.equal(afterFirstDraw.state.cardsDrawnThisTurn, 1);
  assert.equal(afterFirstDraw.state.turnStage, "draw");
  const afterDraw = await drawHandFootRoomCards({ roomCode, token: created.token, pileIndex: 1, cardCount: 1 });
  assert.equal(afterDraw.state.players[0].handCount, 15);
  assert.equal(afterDraw.state.cardsDrawnThisTurn, 2);
  assert.equal(afterDraw.state.turnStage, "play");
  const discardedId = afterDraw.state.players[0].hand[0].id;
  const afterDiscard = await discardHandFootRoomCard({ roomCode, token: created.token, cardId: discardedId });
  assert.equal(afterDiscard.state.currentPlayerIndex, 2);
});

test("mutual teammate preferences take priority when room teams are built", () => {
  const players = ["a", "b", "c", "d", "e", "f"].map((playerId) => ({ playerId, name: playerId, isComputer: false }));
  const pairs = buildHandFootTeamPairs(players, { a: "d", d: "a", b: "c", e: "f" });

  assert.deepEqual(pairs.map((pair) => pair.map((player) => player.playerId)), [["a", "d"], ["b", "c"], ["e", "f"]]);
});

test("room players privately draw ahead in a clockwise chain", async () => {
  const created = await createHandFootRoom({ name: "Host" });
  const joinedPlayers = [];
  for (const name of ["One", "Two", "Three"]) {
    joinedPlayers.push(await joinHandFootRoom({ roomCode: created.state.roomCode, name }));
  }
  let hostView = await startHandFootRoom({ roomCode: created.state.roomCode, token: created.token, random: () => 0 });
  hostView = await drawHandFootRoomCards({ roomCode: created.state.roomCode, token: created.token });

  const nextPlayerId = hostView.state.players[1].playerId;
  const nextPlayer = joinedPlayers.find((joined) => joined.state.viewerPlayerId === nextPlayerId);
  const followingPlayerId = hostView.state.players[2].playerId;
  const followingPlayer = joinedPlayers.find((joined) => joined.state.viewerPlayerId === followingPlayerId);
  assert.ok(nextPlayer);
  assert.ok(followingPlayer);

  await assert.rejects(
    drawHandFootRoomCards({ roomCode: created.state.roomCode, token: followingPlayer.token }),
    /player before.*drawn two cards/i
  );

  const aheadView = await drawHandFootRoomCards({ roomCode: created.state.roomCode, token: nextPlayer.token });
  assert.equal(aheadView.state.viewerPlayerIndex, 1);
  assert.equal(aheadView.state.players[1].hand.length, 13);
  assert.equal(aheadView.state.players[1].pendingDraw.length, 2);

  const followingView = await drawHandFootRoomCards({ roomCode: created.state.roomCode, token: followingPlayer.token });
  assert.equal(followingView.state.viewerPlayerIndex, 2);
  assert.equal(followingView.state.players[2].hand.length, 13);
  assert.equal(followingView.state.players[2].pendingDraw.length, 2);

  hostView = await getHandFootRoom({ roomCode: created.state.roomCode, token: created.token });
  assert.equal(hostView.state.players[1].pendingDrawCount, 2);
  assert.deepEqual(hostView.state.players[1].pendingDraw, []);
  assert.equal(hostView.state.players[2].pendingDrawCount, 2);
  assert.deepEqual(hostView.state.players[2].pendingDraw, []);

  const discardId = hostView.state.players[0].hand[0].id;
  await discardHandFootRoomCard({ roomCode: created.state.roomCode, token: created.token, cardId: discardId });
  const promotedView = await getHandFootRoom({ roomCode: created.state.roomCode, token: nextPlayer.token });
  assert.equal(promotedView.state.currentPlayerIndex, 1);
  assert.equal(promotedView.state.turnStage, "play");
  assert.equal(promotedView.state.players[1].hand.length, 15);
  assert.deepEqual(promotedView.state.players[1].pendingDraw, []);

  const followingWaitingView = await getHandFootRoom({ roomCode: created.state.roomCode, token: followingPlayer.token });
  assert.equal(followingWaitingView.state.players[2].hand.length, 13);
  assert.equal(followingWaitingView.state.players[2].pendingDraw.length, 2);
});

test("only the host can add computers or start a room", async () => {
  const created = await createHandFootRoom({ name: "Host" });
  const joined = await joinHandFootRoom({ roomCode: created.state.roomCode, name: "Guest" });

  await assert.rejects(
    addHandFootComputer({ roomCode: created.state.roomCode, token: joined.token }),
    /Only the host/
  );
  await assert.rejects(
    startHandFootRoom({ roomCode: created.state.roomCode, token: joined.token }),
    /Only the host/
  );
});

test("a Hand and Foot room supports sixteen players in eight opposite teams", async () => {
  const created = await createHandFootRoom({ name: "Host" });
  for (let index = 0; index < 15; index += 1) {
    await addHandFootComputer({ roomCode: created.state.roomCode, token: created.token });
  }

  const started = await startHandFootRoom({ roomCode: created.state.roomCode, token: created.token, random: () => 0 });
  assert.equal(started.state.players.length, 16);
  assert.equal(started.state.teams.length, 8);
  assert.ok(started.state.teams.every((team) => team.memberIds.length === 2));
  assert.equal(started.state.drawPile.length, 17 * 54 - 16 * 26);
});
