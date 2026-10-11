import assert from "node:assert/strict";
import test from "node:test";

import { addPlayer, createLobby, currentPlayer, placeFinishBet, startGame, takeLegTicket } from "../lib/camel-up.js";
import { legalSpaces, unavailableReason } from "../lib/camel-up-actions.js";

function room(count = 3) {
  let game = createLobby({ id: "p0", name: "P0" }, "CAMEL", 1);
  for (let i = 1; i < count; i += 1) game = addPlayer(game, { id: `p${i}`, name: `P${i}` });
  return startGame(game, () => 0);
}

const meOf = (game, id) => game.players.find((player) => player.id === id);

test("a seat that is not up is told whose turn it is for every action", () => {
  const game = room();
  const waiting = game.players.find((player) => player.id !== currentPlayer(game).id);
  for (const action of ["roll", "leg", "tile", "finish", "partner"]) {
    assert.equal(unavailableReason(game, waiting, action), `Waiting for ${currentPlayer(game).name}.`);
  }
});

test("the current player can roll, bet, place a tile and place a finish card at the start", () => {
  const game = room();
  const me = currentPlayer(game);
  for (const action of ["roll", "leg", "tile", "finish"]) assert.equal(unavailableReason(game, me, action), null);
});

test("rolling is unavailable once the leg's pyramid tickets are gone", () => {
  const game = { ...room(), pyramidTicketsTaken: 5 };
  assert.match(unavailableReason(game, currentPlayer(game), "roll"), /No pyramid tickets/);
});

test("a camel's leg tickets run out one stack at a time, and all at once", () => {
  let game = room();
  const stacks = { ...game.legBetStacks, blue: [] };
  assert.match(unavailableReason({ ...game, legBetStacks: stacks }, currentPlayer(game), "leg", "blue"), /No blue tickets/);
  assert.equal(unavailableReason({ ...game, legBetStacks: stacks }, currentPlayer(game), "leg", "red"), null);
  assert.equal(unavailableReason({ ...game, legBetStacks: stacks }, currentPlayer(game), "leg"), null);
  const none = Object.fromEntries(Object.keys(game.legBetStacks).map((id) => [id, []]));
  assert.match(unavailableReason({ ...game, legBetStacks: none }, currentPlayer(game), "leg"), /Every leg ticket/);
  game = takeLegTicket(game, currentPlayer(game).id, "blue");
  assert.equal(game.legBetStacks.blue.length, 3);
});

test("a finish bet is unavailable when all five cards are placed", () => {
  const game = room();
  const me = currentPlayer(game);
  const placed = { ...game, players: game.players.map((player) => player.id === me.id ? { ...player, finishCards: [] } : player) };
  assert.match(unavailableReason(placed, meOf(placed, me.id), "finish"), /All five/);
  assert.equal(unavailableReason(game, me, "finish"), null);
  const afterBet = placeFinishBet(game, me.id, "winner", "blue");
  assert.equal(meOf(afterBet, me.id).finishCards.includes("blue"), false);
});

test("a tile is unavailable when no space is legal", () => {
  const game = room();
  const crowded = { ...game, stacks: Object.fromEntries(Array.from({ length: 16 }, (_, index) => [String(index + 1), ["blue"]])) };
  assert.deepEqual(legalSpaces(crowded, currentPlayer(game).id), []);
  assert.match(unavailableReason(crowded, currentPlayer(game), "tile"), /no legal space/);
  assert.ok(legalSpaces(game, currentPlayer(game).id).every((space) => space >= 2 && space <= 16));
});

test("partnerships need six or more players, a free player, and no existing partner", () => {
  const small = room(3);
  assert.match(unavailableReason(small, currentPlayer(small), "partner"), /six or more/);
  const six = room(6);
  const me = currentPlayer(six);
  assert.equal(unavailableReason(six, me, "partner"), null);
  assert.match(unavailableReason(six, { ...me, partnerId: "p9" }, "partner"), /already have a partner/);
  const allPartnered = { ...six, players: six.players.map((player) => player.id === me.id ? player : { ...player, partnerId: "x" }) };
  assert.match(unavailableReason(allPartnered, me, "partner"), /No partner is available/);
});

test("nothing is available outside normal play", () => {
  const game = { ...room(), phase: "finished" };
  assert.match(unavailableReason(game, game.players[0], "roll"), /not in play/);
});
