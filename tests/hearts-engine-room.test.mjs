import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRoom } from "../lib/engine-room.js";
import { heartsAdapter } from "../lib/hearts-room-adapter.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";
import { assertNoneLeaked, startedRoom } from "./engine-test-helpers.mjs";

const ids = (cards) => cards.map((card) => card.id);
const act = (api, seat, action, args = {}) => api.room.act({ roomCode: api.code, token: seat.token, action, args });
const view = async (api, seat) => (await api.room.get({ roomCode: api.code, token: seat.token })).state;

test("a seat's payload carries its own hand and no id of any other hand or the kitty", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 2, computers: 2 });
  for (const seat of api.seats) {
    const state = await view(api, seat);
    const mine = api.raw.players.find((player) => player.playerId === seat.playerId);
    assert.deepEqual(ids(state.players[state.viewerIndex].hand), ids(mine.hand));
    const secrets = api.raw.players.filter((player) => player.playerId !== seat.playerId).flatMap((player) => ids(player.hand));
    assertNoneLeaked(state, secrets, "opponent card");
  }
});

test("other seats come back as counts, and the captured piles as counts", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 2, computers: 2 });
  const state = await view(api, api.seats[1]);
  state.players.forEach((player, index) => {
    assert.equal(player.handCount, api.raw.players[index].hand.length);
    assert.equal(player.capturedCount, 0);
    if (index !== state.viewerIndex) assert.deepEqual(player.hand, []);
  });
});

test("a four-seat Classic room and a five-seat Killer room start", async () => {
  const classic = await startedRoom(heartsAdapter, { humans: 2, computers: 2 });
  assert.equal(classic.raw.variant, "classic");
  assert.equal(classic.raw.players.length, 4);

  const killer = await startedRoom(heartsAdapter, {
    humans: 2,
    computers: 3,
    before: (api) => act(api, api.seats[0], "setVariant", { variant: "killer" }),
  });
  assert.equal(killer.raw.variant, "killer");
  assert.equal(killer.raw.players.length, 5);
  assert.equal(killer.raw.phase, "playing");
});

test("a variant does not start with a seat count it does not allow", async () => {
  await assert.rejects(
    startedRoom(heartsAdapter, {
      humans: 2,
      computers: 2,
      before: (api) => act(api, api.seats[0], "setVariant", { variant: "killer" }),
    }),
    /not available/,
  );
  await assert.rejects(startedRoom(heartsAdapter, { humans: 2, computers: 3 }), /not available/);
});

test("only the host picks the variant, adds computers or starts", async () => {
  const store = createSupabaseRoomStore({ namespace: "t-hearts-host", memoryKey: `__t${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter: heartsAdapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const guest = await room.join({ roomCode: code, name: "Guest" });
  for (const action of ["setVariant", "addComputer", "start"]) {
    await assert.rejects(
      room.act({ roomCode: code, token: guest.token, action, args: { variant: "killer" } }),
      /host/i,
      `${action} is host-only`,
    );
  }
  const lobby = (await room.get({ roomCode: code, token: host.token })).state;
  assert.equal(lobby.phase, "lobby");
  assert.equal(lobby.variant, "classic");
  assert.equal(lobby.players.length, 2);
});

test("a pass waits for the last human, then every seat's cards move at once", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 2, computers: 2 });
  assert.equal(api.raw.phase, "passing");
  const [host, guest] = api.seats;
  const before = (seat) => ids(api.raw.players.find((player) => player.playerId === seat.playerId).hand);

  const first = before(host).slice(0, 3);
  await act(api, host, "passCards", { cardIds: first });
  let state = await view(api, host);
  assert.equal(state.phase, "passing");
  assert.deepEqual(ids(state.players[state.viewerIndex].hand), before(host), "no cards move yet");
  assert.deepEqual(state.myPass, first);
  assert.equal(state.players.find((player) => player.playerId === guest.playerId).passReady, false);

  await act(api, guest, "passCards", { cardIds: before(guest).slice(0, 3) });
  state = await view(api, host);
  assert.equal(state.phase, "playing");
  assert.equal(state.players[state.viewerIndex].hand.length, 13);
  for (const id of first) assert.ok(!ids(state.players[state.viewerIndex].hand).includes(id), `${id} was passed away`);
});

test("a pass of the wrong cards or the wrong number is rejected", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 2, computers: 2 });
  const [host, guest] = api.seats;
  const hostHand = ids(api.raw.players.find((player) => player.playerId === host.playerId).hand);
  const guestHand = ids(api.raw.players.find((player) => player.playerId === guest.playerId).hand);

  await assert.rejects(act(api, host, "passCards", { cardIds: hostHand.slice(0, 2) }), /not available/);
  await assert.rejects(act(api, host, "passCards", { cardIds: guestHand.slice(0, 3) }), /not available/);
  await act(api, host, "passCards", { cardIds: hostHand.slice(0, 3) });
  await assert.rejects(act(api, host, "passCards", { cardIds: hostHand.slice(3, 6) }), /not available/, "a second pass");
});

test("a non-host cannot step the computers", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 2, computers: 2 });
  await assert.rejects(api.room.computerStep({ roomCode: api.code, token: api.seats[1].token }), /host/i);
});

test("an out-of-turn or illegal play is rejected and changes nothing", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 1, computers: 3 });
  const host = api.seats[0];
  await act(api, host, "passCards", { cardIds: ids(api.raw.players[0].hand).slice(0, 3) });
  let state = await view(api, host);
  assert.equal(state.phase, "playing");
  const card = state.players[state.viewerIndex].hand[0];
  if (state.currentPlayerIndex !== state.viewerIndex) {
    await assert.rejects(act(api, host, "playCard", { cardId: card.id }), /not available/, "not this seat's turn");
  }
  await assert.rejects(act(api, host, "playCard", { cardId: "no-such-card" }), /not available/);
});

test("the host's computer steps play the computers' cards and gather tricks until the human is due", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 1, computers: 3 });
  const host = api.seats[0];
  await act(api, host, "passCards", { cardIds: ids(api.raw.players[0].hand).slice(0, 3) });
  let state = await view(api, host);
  let steps = 0;
  while (state.currentPlayerIndex !== state.viewerIndex && steps < 12) {
    state = (await api.room.computerStep({ roomCode: api.code, token: host.token })).state;
    steps += 1;
  }
  assert.equal(state.currentPlayerIndex, state.viewerIndex, "stepping reaches the human");
  assert.ok(state.trickNumber > 1 || state.trick.length > 0 || steps > 0, "the computers did play");
});

test("the human's turn plays a legal card and the next round is the host's to deal", async () => {
  const api = await startedRoom(heartsAdapter, { humans: 1, computers: 3 });
  const host = api.seats[0];
  await act(api, host, "passCards", { cardIds: ids(api.raw.players[0].hand).slice(0, 3) });
  let state = await view(api, host);
  for (let guard = 0; guard < 400 && state.phase !== "roundComplete" && state.phase !== "gameOver"; guard += 1) {
    if (state.phase === "playing" && state.currentPlayerIndex === state.viewerIndex) {
      const hand = state.players[state.viewerIndex].hand;
      let played = null;
      for (const card of hand) {
        try {
          played = await act(api, host, "playCard", { cardId: card.id });
          break;
        } catch { /* not a legal card; try the next */ }
      }
      assert.ok(played, "some card is always legal");
      state = played.state;
    } else {
      state = (await api.room.computerStep({ roomCode: api.code, token: host.token })).state;
    }
  }
  assert.ok(["roundComplete", "gameOver"].includes(state.phase));
  if (state.phase === "roundComplete") {
    const next = (await act(api, host, "nextRound")).state;
    assert.equal(next.roundNumber, 2);
    assert.equal(next.phase, "passing");
    assert.equal(next.myPass, null);
  }
});
