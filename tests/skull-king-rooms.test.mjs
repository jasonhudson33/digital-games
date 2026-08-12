import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseBotPirateAbility,
  chooseBotSkullKingPlay,
  getLegalSkullKingCards,
  getSkullKingActingPlayerIndex,
} from "../lib/skull-king.js";

import {
  addSkullKingComputer,
  bidSkullKingRoom,
  collectSkullKingRoomTrick,
  createSkullKingRoom,
  getSkullKingRoom,
  joinSkullKingRoom,
  playSkullKingRoomCard,
  resolveSkullKingRoomPirateAbility,
  resolveSkullKingRoomWalkThePlank,
  startNextSkullKingRoomRound,
  startSkullKingRoom,
} from "../lib/skull-king-rooms.js";

test("Skull King rooms support human players and keep hands private", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guestOne = await joinSkullKingRoom({ roomCode, name: "Guest One" });
  await joinSkullKingRoom({ roomCode, name: "Guest Two" });
  const started = await startSkullKingRoom({ roomCode, token: host.token });

  assert.equal(started.state.players.length, 3);
  assert.equal(started.state.viewerPlayerIndex, 0);
  assert.equal(started.state.players[0].hand.length, 1);
  assert.equal(started.state.players[1].hand.length, 0);
  assert.equal(started.state.players[1].handCount, 1);
  assert.deepEqual(started.state.drawPile, []);

  const guestView = await getSkullKingRoom({ roomCode, token: guestOne.token });
  assert.equal(guestView.state.viewerPlayerIndex, 1);
  assert.equal(guestView.state.players[0].hand.length, 0);
  assert.equal(guestView.state.players[1].hand.length, 1);
});

test("a two-player room hides Graybeard's hand and flips only its top card", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guest = await joinSkullKingRoom({ roomCode, name: "Guest" });
  let hostState = (await startSkullKingRoom({ roomCode, token: host.token })).state;
  const ghostIndex = hostState.players.findIndex((player) => player.isGhost);

  assert.equal(hostState.captainCount, 2);
  assert.equal(hostState.players.length, 3);
  assert.equal(ghostIndex, 2);
  assert.equal(hostState.players[ghostIndex].hand.length, 0);
  assert.equal(hostState.players[ghostIndex].handCount, 1);
  const guestState = (await getSkullKingRoom({ roomCode, token: guest.token })).state;
  assert.deepEqual(guestState.players[ghostIndex].hand, []);
  assert.equal(guestState.players[ghostIndex].handCount, 1);
  assert.equal(guestState.players[0].hand.length, 0);

  await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 });
  hostState = (await bidSkullKingRoom({ roomCode, token: guest.token, bid: 0 })).state;
  assert.equal(hostState.currentPlayerIndex, 0);
  const hostCard = (await getSkullKingRoom({ roomCode, token: host.token })).state.players[0].hand[0];
  const hostDeclaration = hostCard.type === "choice" ? 0 : hostCard.kind === "tigress" ? "escape" : hostCard.type === "wild15" ? "green" : null;
  hostState = (await playSkullKingRoomCard({ roomCode, token: host.token, cardId: hostCard.id, declaration: hostDeclaration })).state;
  assert.equal(hostState.currentPlayerIndex, ghostIndex);

  await assert.rejects(
    playSkullKingRoomCard({ roomCode, token: guest.token, flipGhost: true }),
    /not available/,
  );
  hostState = (await playSkullKingRoomCard({ roomCode, token: host.token, flipGhost: true })).state;
  assert.equal(hostState.trick[1].playerIndex, ghostIndex);
  assert.equal(hostState.currentPlayerIndex, 1);
});

test("human bids stay private until every room player has bid", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guestOne = await joinSkullKingRoom({ roomCode, name: "Guest One" });
  const guestTwo = await joinSkullKingRoom({ roomCode, name: "Guest Two" });
  await startSkullKingRoom({ roomCode, token: host.token });

  const afterHostBid = await bidSkullKingRoom({ roomCode, token: host.token, bid: 1 });
  assert.equal(afterHostBid.state.phase, "bidding");
  assert.deepEqual(afterHostBid.state.players.map((player) => player.bid), [1, null, null]);
  const guestView = await getSkullKingRoom({ roomCode, token: guestOne.token });
  assert.deepEqual(guestView.state.players.map((player) => player.bid), [null, null, null]);

  await bidSkullKingRoom({ roomCode, token: guestOne.token, bid: 0 });
  const playing = await bidSkullKingRoom({ roomCode, token: guestTwo.token, bid: 0 });
  assert.equal(playing.state.phase, "playing");
  assert.deepEqual(playing.state.players.map((player) => player.bid), [1, 0, 0]);
  assert.equal(playing.state.currentPlayerIndex, 0);
});

test("only the current room player can play a card", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guestOne = await joinSkullKingRoom({ roomCode, name: "Guest One" });
  const guestTwo = await joinSkullKingRoom({ roomCode, name: "Guest Two" });
  await startSkullKingRoom({ roomCode, token: host.token });
  await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 });
  await bidSkullKingRoom({ roomCode, token: guestOne.token, bid: 0 });
  await bidSkullKingRoom({ roomCode, token: guestTwo.token, bid: 0 });

  const guestView = await getSkullKingRoom({ roomCode, token: guestOne.token });
  await assert.rejects(
    playSkullKingRoomCard({ roomCode, token: guestOne.token, cardId: guestView.state.players[1].hand[0].id }),
    /not available/,
  );
  const hostView = await getSkullKingRoom({ roomCode, token: host.token });
  const card = hostView.state.players[0].hand[0];
  const declaration = card.type === "choice" ? 0 : card.kind === "tigress" ? "escape" : card.type === "wild15" ? "green" : null;
  const played = await playSkullKingRoomCard({ roomCode, token: host.token, cardId: card.id, declaration });
  assert.equal(played.state.trick.length, 1);
  assert.equal(played.state.trick[0].playerIndex, 0);
});

test("the host can add computers while human players remain room participants", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  await addSkullKingComputer({ roomCode: host.state.roomCode, token: host.token });
  await addSkullKingComputer({ roomCode: host.state.roomCode, token: host.token });
  const started = await startSkullKingRoom({ roomCode: host.state.roomCode, token: host.token });
  assert.equal(started.state.players.length, 3);
  assert.equal(started.state.players.filter((player) => player.isComputer).length, 2);
  assert.equal(started.state.players[0].hand.length, 1);
});

test("a room voyage can complete all ten rounds without expansion-card deadlocks", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  await addSkullKingComputer({ roomCode, token: host.token });
  await addSkullKingComputer({ roomCode, token: host.token });
  let state = (await startSkullKingRoom({ roomCode, token: host.token })).state;

  for (let steps = 0; state.phase !== "gameOver" && steps < 5000; steps += 1) {
    if (state.phase === "bidding") {
      state = (await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 })).state;
    } else if (["playing", "lastVolley"].includes(state.phase)) {
      assert.equal(state.currentPlayerIndex, 0);
      const play = chooseBotSkullKingPlay(state, 0, () => 0);
      assert.ok(play);
      state = (await playSkullKingRoomCard({
        roomCode,
        token: host.token,
        cardId: play.card.id,
        declaration: play.declaredSuit ?? play.declaredRole ?? play.declaredValue,
      })).state;
    } else if (state.phase === "walkThePlank") {
      assert.equal(state.pendingWalkThePlank.playerIndex, 0);
      state = (await resolveSkullKingRoomWalkThePlank({
        roomCode,
        token: host.token,
        cardId: state.pendingWalkThePlank.pirateCardIds[0],
      })).state;
    } else if (state.phase === "pirateAbility") {
      assert.equal(state.pendingPirateAbility.playerIndex, 0);
      state = (await resolveSkullKingRoomPirateAbility({
        roomCode,
        token: host.token,
        choice: chooseBotPirateAbility(state, () => 0),
      })).state;
    } else if (state.phase === "collecting") {
      state = (await collectSkullKingRoomTrick({ roomCode, token: host.token })).state;
    } else if (state.phase === "roundComplete") {
      state = (await startNextSkullKingRoomRound({ roomCode, token: host.token })).state;
    } else {
      assert.fail(`Unexpected room phase: ${state.phase}`);
    }
  }

  assert.equal(state.phase, "gameOver");
  assert.equal(state.roundNumber, 10);
  assert.equal(state.players.length, 3);
  assert.ok(state.players.every((player) => Number.isFinite(player.score)));
  assert.deepEqual(getLegalSkullKingCards(state, 0), []);
});

test("a two-captain voyage follows Graybeard turn order through all ten rounds", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  await addSkullKingComputer({ roomCode, token: host.token });
  let state = (await startSkullKingRoom({ roomCode, token: host.token })).state;
  const ghostIndex = state.players.findIndex((player) => player.isGhost);
  assert.equal(ghostIndex, 2);

  for (let steps = 0; state.phase !== "gameOver" && steps < 5000; steps += 1) {
    if (state.phase === "bidding") {
      state = (await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 })).state;
    } else if (["playing", "lastVolley"].includes(state.phase)) {
      const actingForGhost = state.currentPlayerIndex === ghostIndex;
      if (actingForGhost) assert.equal(getSkullKingActingPlayerIndex(state), 0);
      else assert.equal(state.currentPlayerIndex, 0);
      if (actingForGhost) {
        state = (await playSkullKingRoomCard({ roomCode, token: host.token, flipGhost: true })).state;
      } else {
        const play = chooseBotSkullKingPlay(state, state.currentPlayerIndex, () => 0);
        assert.ok(play);
        state = (await playSkullKingRoomCard({
          roomCode,
          token: host.token,
          cardId: play.card.id,
          declaration: play.declaredSuit ?? play.declaredRole ?? play.declaredValue,
        })).state;
      }
    } else if (state.phase === "walkThePlank") {
      state = (await resolveSkullKingRoomWalkThePlank({
        roomCode,
        token: host.token,
        cardId: state.pendingWalkThePlank.pirateCardIds[0],
      })).state;
    } else if (state.phase === "pirateAbility") {
      state = (await resolveSkullKingRoomPirateAbility({
        roomCode,
        token: host.token,
        choice: chooseBotPirateAbility(state, () => 0),
      })).state;
    } else if (state.phase === "collecting") {
      state = (await collectSkullKingRoomTrick({ roomCode, token: host.token })).state;
    } else if (state.phase === "roundComplete") {
      state = (await startNextSkullKingRoomRound({ roomCode, token: host.token })).state;
    } else {
      assert.fail(`Unexpected two-player room phase: ${state.phase}`);
    }
  }

  assert.equal(state.phase, "gameOver");
  assert.equal(state.roundNumber, 10);
  assert.equal(state.captainCount, 2);
  assert.equal(state.players[ghostIndex].score, 0);
  assert.ok(state.roundSummary.winnerIndexes.every((index) => index !== ghostIndex));
});
