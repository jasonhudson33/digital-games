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
  setSkullKingDeckMode,
  setSkullKingComputerSpeed,
  startNextSkullKingRoomRound,
  startSkullKingRoom,
  stepSkullKingComputer,
} from "../lib/skull-king-rooms.js";


// Computers no longer play inside a human's action: the host's browser steps them one move at a
// time. A test that wants the table to settle does the same, until no computer is due.
async function settle(roomCode, host, state) {
  let current = state;
  for (let steps = 0; current.computerDue && steps < 2000; steps += 1) {
    current = (await stepSkullKingComputer({ roomCode, token: host.token })).state;
  }
  assert.equal(current.computerDue, false, "computers settled");
  return current;
}

test("Skull King rooms support human players and keep hands private", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guestOne = await joinSkullKingRoom({ roomCode, name: "Guest One" });
  await joinSkullKingRoom({ roomCode, name: "Guest Two" });
  const started = await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 });

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
  let hostState = (await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 })).state;
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
  await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 });

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
  await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 });
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
  const started = await startSkullKingRoom({ roomCode: host.state.roomCode, token: host.token, random: () => 0 });
  assert.equal(started.state.players.length, 3);
  assert.equal(started.state.players.filter((player) => player.isComputer).length, 2);
  assert.equal(started.state.players[0].hand.length, 1);
});

test("the host selects among three card sets and every captain sees the choice", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const guest = await joinSkullKingRoom({ roomCode: host.state.roomCode, name: "Guest" });

  const selected = await setSkullKingDeckMode({ roomCode: host.state.roomCode, token: host.token, deckMode: "classic" });
  const guestView = await getSkullKingRoom({ roomCode: host.state.roomCode, token: guest.token });

  assert.equal(selected.state.deckMode, "classic");
  assert.equal(guestView.state.deckMode, "classic");
  await assert.rejects(
    setSkullKingDeckMode({ roomCode: host.state.roomCode, token: guest.token, deckMode: "full" }),
    /Only the host/,
  );

  const started = await startSkullKingRoom({ roomCode: host.state.roomCode, token: host.token, random: () => 0 });
  assert.equal(started.state.deckMode, "classic");
});

test("reduced card sets cap rooms at seven captains", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  await setSkullKingDeckMode({ roomCode: host.state.roomCode, token: host.token, deckMode: "mermaids" });
  for (let index = 0; index < 6; index += 1) {
    await addSkullKingComputer({ roomCode: host.state.roomCode, token: host.token });
  }

  await assert.rejects(
    addSkullKingComputer({ roomCode: host.state.roomCode, token: host.token }),
    /at most 7/,
  );
});

test("a room voyage can complete all ten rounds without expansion-card deadlocks", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  await addSkullKingComputer({ roomCode, token: host.token });
  await addSkullKingComputer({ roomCode, token: host.token });
  let state = await settle(roomCode, host, (await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 })).state);

  for (let steps = 0; state.phase !== "gameOver" && steps < 5000; steps += 1) {
    if (state.phase === "bidding") {
      state = await settle(roomCode, host, (await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 })).state);
    } else if (["playing", "lastVolley"].includes(state.phase)) {
      assert.equal(state.currentPlayerIndex, 0);
      const play = chooseBotSkullKingPlay(state, 0, () => 0);
      assert.ok(play);
      state = await settle(roomCode, host, (await playSkullKingRoomCard({
        roomCode,
        token: host.token,
        cardId: play.card.id,
        declaration: play.declaredSuit ?? play.declaredRole ?? play.declaredValue,
      })).state);
    } else if (state.phase === "walkThePlank") {
      assert.equal(state.pendingWalkThePlank.playerIndex, 0);
      state = await settle(roomCode, host, (await resolveSkullKingRoomWalkThePlank({
        roomCode,
        token: host.token,
        cardId: state.pendingWalkThePlank.pirateCardIds[0],
      })).state);
    } else if (state.phase === "pirateAbility") {
      assert.equal(state.pendingPirateAbility.playerIndex, 0);
      state = await settle(roomCode, host, (await resolveSkullKingRoomPirateAbility({
        roomCode,
        token: host.token,
        choice: chooseBotPirateAbility(state, () => 0),
      })).state);
    } else if (state.phase === "collecting") {
      state = await settle(roomCode, host, (await collectSkullKingRoomTrick({ roomCode, token: host.token })).state);
    } else if (state.phase === "roundComplete") {
      state = await settle(roomCode, host, (await startNextSkullKingRoomRound({ roomCode, token: host.token })).state);
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
  let state = await settle(roomCode, host, (await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 })).state);
  const ghostIndex = state.players.findIndex((player) => player.isGhost);
  assert.equal(ghostIndex, 2);

  for (let steps = 0; state.phase !== "gameOver" && steps < 5000; steps += 1) {
    if (state.phase === "bidding") {
      state = await settle(roomCode, host, (await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 })).state);
    } else if (["playing", "lastVolley"].includes(state.phase)) {
      const actingForGhost = state.currentPlayerIndex === ghostIndex;
      if (actingForGhost) assert.equal(getSkullKingActingPlayerIndex(state), 0);
      else assert.equal(state.currentPlayerIndex, 0);
      if (actingForGhost) {
        state = await settle(roomCode, host, (await playSkullKingRoomCard({ roomCode, token: host.token, flipGhost: true })).state);
      } else {
        const play = chooseBotSkullKingPlay(state, state.currentPlayerIndex, () => 0);
        assert.ok(play);
        state = await settle(roomCode, host, (await playSkullKingRoomCard({
          roomCode,
          token: host.token,
          cardId: play.card.id,
          declaration: play.declaredSuit ?? play.declaredRole ?? play.declaredValue,
        })).state);
      }
    } else if (state.phase === "walkThePlank") {
      state = await settle(roomCode, host, (await resolveSkullKingRoomWalkThePlank({
        roomCode,
        token: host.token,
        cardId: state.pendingWalkThePlank.pirateCardIds[0],
      })).state);
    } else if (state.phase === "pirateAbility") {
      state = await settle(roomCode, host, (await resolveSkullKingRoomPirateAbility({
        roomCode,
        token: host.token,
        choice: chooseBotPirateAbility(state, () => 0),
      })).state);
    } else if (state.phase === "collecting") {
      state = await settle(roomCode, host, (await collectSkullKingRoomTrick({ roomCode, token: host.token })).state);
    } else if (state.phase === "roundComplete") {
      state = await settle(roomCode, host, (await startNextSkullKingRoomRound({ roomCode, token: host.token })).state);
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

/* ── Host-stepped computers and the room speed (platform/computer-pacing) ───── */

test("a human's action leaves the computers' moves for the host to step, one at a time", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  await addSkullKingComputer({ roomCode, token: host.token });
  await addSkullKingComputer({ roomCode, token: host.token });
  const started = (await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 })).state;
  assert.equal(started.phase, "bidding");
  assert.equal(started.computerDue, true, "starting does not bid for the computers");
  // Bidding is simultaneous, so one step settles every computer's bid.
  const bid = (await stepSkullKingComputer({ roomCode, token: host.token })).state;
  assert.equal(bid.computerDue, false);
  // Once the human has bid, play begins; each computer card is its own step.
  let state = (await bidSkullKingRoom({ roomCode, token: host.token, bid: 0 })).state;
  let steps = 0;
  const seen = new Set([state.updatedAt]);
  while (state.computerDue && steps < 20) {
    state = (await stepSkullKingComputer({ roomCode, token: host.token })).state;
    assert.equal(seen.has(state.updatedAt), false, "every step is a separate saved state");
    seen.add(state.updatedAt);
    steps += 1;
  }
  assert.equal(state.computerDue, false);
});

test("only the host steps computers, and a step with nothing due changes nothing", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  const guest = await joinSkullKingRoom({ roomCode, name: "Guest" });
  await addSkullKingComputer({ roomCode, token: host.token });
  await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 });
  await assert.rejects(stepSkullKingComputer({ roomCode, token: guest.token }), /host/i);
  const once = (await stepSkullKingComputer({ roomCode, token: host.token })).state;
  assert.equal(once.computerDue, false);
  const again = (await stepSkullKingComputer({ roomCode, token: host.token })).state;
  assert.equal(again.updatedAt, once.updatedAt, "nothing due: not even saved");
});

test("a new room runs at Normal, any seated player changes it, and only listed speeds are accepted", async () => {
  const host = await createSkullKingRoom({ name: "Host" });
  const roomCode = host.state.roomCode;
  assert.equal(host.state.computerDelayMs, 600);
  const guest = await joinSkullKingRoom({ roomCode, name: "Guest" });
  const changed = (await setSkullKingComputerSpeed({ roomCode, token: guest.token, ms: 1000 })).state;
  assert.equal(changed.computerDelayMs, 1000);
  assert.equal((await getSkullKingRoom({ roomCode, token: host.token })).state.computerDelayMs, 1000, "everyone sees it");
  for (const ms of [5, 0, 2000, "fast-ish", undefined]) {
    await assert.rejects(setSkullKingComputerSpeed({ roomCode, token: host.token, ms }), /listed computer speeds/, String(ms));
  }
  await assert.rejects(setSkullKingComputerSpeed({ roomCode, token: "nope", ms: 300 }), /Join the room/);
  await startSkullKingRoom({ roomCode, token: host.token, random: () => 0 }).catch(() => {});
  assert.equal((await setSkullKingComputerSpeed({ roomCode, token: host.token, ms: 300 })).state.computerDelayMs, 300, "also while a game is running or the start was refused");
});
