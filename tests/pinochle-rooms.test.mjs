import test from "node:test";
import assert from "node:assert/strict";
import { getLegalPinochleCards } from "../lib/pinochle.js";
import {
  addPinochleComputer,
  bidPinochleRoom,
  choosePinochleRoomTrump,
  clearPinochleRoomTrick,
  createPinochleRoom,
  discardPinochleRoomKitty,
  getPinochleRoom,
  joinPinochleRoom,
  passPinochleRoom,
  passPinochleRoomPartnerCards,
  playPinochleRoomCard,
  skipTwoPlayerPinochleRoomMeld,
  startPinochleRoom,
  takeRestOfPinochleRoomTricks,
} from "../lib/pinochle-rooms.js";
import { loadPinochleRoom, savePinochleRoom } from "../lib/pinochle-room-store.js";

const startWithSeatOne = (values) => startPinochleRoom({ ...values, random: (playerCount) => 1.1 / playerCount });

test("Pinochle rooms support human players and keep hands private", async () => {
  const created = await createPinochleRoom({ name: "Host" });
  const roomCode = created.state.roomCode;
  const joined = await joinPinochleRoom({ roomCode, name: "Guest" });
  const started = await startWithSeatOne({ roomCode, token: created.token });

  assert.equal(started.state.players.length, 2);
  assert.equal(started.state.viewerPlayerIndex, 0);
  assert.ok(started.state.players[0].hand.length > 0);
  assert.equal(started.state.players[1].hand.length, 0);
  assert.ok(started.state.players[1].handCount > 0);
  assert.deepEqual(started.state.kitty, []);
  assert.deepEqual(started.state.stock, []);
  assert.equal(started.state.stockCount, 24);
  assert.ok(started.state.stockTrumpCard);

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
  const started = await startWithSeatOne({ roomCode: created.state.roomCode, token: created.token });
  assert.equal(started.state.players.length, 6);
  assert.equal(started.state.partnershipGame, true);
  assert.deepEqual(started.state.players.map((player) => player.teamId), [0, 1, 0, 1, 0, 1]);
});

test("a five-player room deals nine private cards and a hidden three-card kitty", async () => {
  const created = await createPinochleRoom({ name: "Host" });
  for (let index = 0; index < 4; index += 1) {
    await addPinochleComputer({ roomCode: created.state.roomCode, token: created.token });
  }
  const started = await startWithSeatOne({ roomCode: created.state.roomCode, token: created.token });
  assert.equal(started.state.playerCount, 5);
  assert.equal(started.state.minimumBid, 150);
  assert.equal(started.state.kittySize, 3);
  assert.deepEqual(started.state.kitty, []);
  assert.equal(started.state.players[0].hand.length, 9);
  assert.ok(started.state.players.slice(1).every((player) => player.hand.length === 0 && player.handCount === 9));
});

test("five-player trump-jack teammates stay private until each jack is played", async () => {
  const host = await createPinochleRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const seats = [host];
  for (const name of ["Bidder", "Jack One", "Observer", "Jack Two"]) {
    seats.push(await joinPinochleRoom({ roomCode, name }));
  }
  await startWithSeatOne({ roomCode, token: host.token });

  const room = await loadPinochleRoom(roomCode);
  room.game.players = room.game.players.map((player, playerIndex) => ({
    ...player,
    hand: player.hand.map((card, cardIndex) => {
      if (card.suit === "hearts" && card.rank === 11) return { ...card, rank: 9 };
      if ((playerIndex === 2 || playerIndex === 4) && cardIndex === 0) return { ...card, suit: "hearts", rank: 11 };
      return card;
    }),
  }));
  room.game.kitty = room.game.kitty.map((card) => card.suit === "hearts" && card.rank === 11 ? { ...card, rank: 9 } : card);
  await savePinochleRoom(room);

  await bidPinochleRoom({ roomCode, token: seats[1].token, amount: 150 });
  for (const playerIndex of [2, 3, 4, 0]) {
    await passPinochleRoom({ roomCode, token: seats[playerIndex].token });
  }
  await choosePinochleRoomTrump({ roomCode, token: seats[1].token, trump: "hearts" });
  const bidderView = await getPinochleRoom({ roomCode, token: seats[1].token });
  const discards = bidderView.state.players[1].hand
    .filter((card) => card.suit !== "hearts" || card.rank !== 11)
    .slice(0, 3)
    .map((card) => card.id);
  await discardPinochleRoomKitty({ roomCode, token: seats[1].token, cardIds: discards });

  assert.deepEqual((await getPinochleRoom({ roomCode, token: seats[1].token })).state.contractPlayerIndexes, [1]);
  assert.deepEqual((await getPinochleRoom({ roomCode, token: seats[2].token })).state.contractPlayerIndexes, [1, 2]);
  assert.deepEqual((await getPinochleRoom({ roomCode, token: seats[3].token })).state.contractPlayerIndexes, [1]);
  assert.deepEqual((await getPinochleRoom({ roomCode, token: seats[4].token })).state.contractPlayerIndexes, [1, 4]);

  const playingRoom = await loadPinochleRoom(roomCode);
  const firstJack = playingRoom.game.players[2].hand.find((card) => card.suit === "hearts" && card.rank === 11);
  playingRoom.game = { ...playingRoom.game, currentPlayerIndex: 2, leadPlayerIndex: 2, trick: [] };
  await savePinochleRoom(playingRoom);
  await playPinochleRoomCard({ roomCode, token: seats[2].token, cardId: firstJack.id });

  assert.deepEqual((await getPinochleRoom({ roomCode, token: seats[3].token })).state.contractPlayerIndexes, [1, 2]);
  assert.deepEqual((await getPinochleRoom({ roomCode, token: seats[4].token })).state.contractPlayerIndexes, [1, 2, 4]);
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
  await startWithSeatOne({ roomCode, token: host.token });
  await bidPinochleRoom({ roomCode, token: bidder.token, amount: 200 });
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

test("any human can clear a completed room trick after reviewing it", async () => {
  const host = await createPinochleRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guest = await joinPinochleRoom({ roomCode, name: "Guest" });
  let state = (await startWithSeatOne({ roomCode, token: host.token })).state;
  const tokens = [host.token, guest.token];
  while (state.phase === "playing") {
    const playerIndex = state.currentPlayerIndex;
    const view = (await getPinochleRoom({ roomCode, token: tokens[playerIndex] })).state;
    const card = getLegalPinochleCards(view, playerIndex)[0];
    state = (await playPinochleRoomCard({ roomCode, token: tokens[playerIndex], cardId: card.id })).state;
  }
  assert.equal(state.phase, "trick-complete");
  assert.equal(state.trick.length, 2);
  const winnerIndex = state.lastTrick.winnerPlayerIndex;
  const cleared = await clearPinochleRoomTrick({ roomCode, token: tokens[(winnerIndex + 1) % 2] });
  assert.equal(cleared.state.phase, "two-player-melding");
  assert.equal(cleared.state.currentPlayerIndex, winnerIndex);
  assert.equal(cleared.state.trick.length, 0);
  const afterDraw = await skipTwoPlayerPinochleRoomMeld({ roomCode, token: tokens[winnerIndex] });
  assert.equal(afterDraw.state.phase, "playing");
  assert.equal(afterDraw.state.currentPlayerIndex, winnerIndex);
  assert.equal(afterDraw.state.stockCount, 22);
});

test("only an eligible room viewer sees and can use take the rest", async () => {
  const host = await createPinochleRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guest = await joinPinochleRoom({ roomCode, name: "Guest" });
  await startWithSeatOne({ roomCode, token: host.token });
  const room = await loadPinochleRoom(roomCode);
  room.game = {
    ...room.game,
    phase: "playing",
    currentPlayerIndex: 0,
    leadPlayerIndex: 0,
    trump: "hearts",
    trick: [],
    stock: [],
    stockTrumpCard: null,
    players: room.game.players.map((player, index) => ({
      ...player,
      hand: index === 0
        ? [{ id: "trump-nine", copy: 0, suit: "hearts", rank: 9 }, { id: "club-ace", copy: 0, suit: "clubs", rank: 14 }]
        : [{ id: "club-king", copy: 0, suit: "clubs", rank: 13 }, { id: "diamond-ten", copy: 0, suit: "diamonds", rank: 10 }],
    })),
  };
  await savePinochleRoom(room);

  assert.equal((await getPinochleRoom({ roomCode, token: host.token })).state.canTakeRest, true);
  assert.equal((await getPinochleRoom({ roomCode, token: guest.token })).state.canTakeRest, false);
  await assert.rejects(takeRestOfPinochleRoomTricks({ roomCode, token: guest.token }), /not guaranteed/);
  const finished = await takeRestOfPinochleRoomTricks({ roomCode, token: host.token });
  assert.equal(finished.state.phase, "round-over");
  assert.equal(finished.state.tookRestTrickCount, 2);
  assert.equal(finished.state.teams[0].score, 40);
});
