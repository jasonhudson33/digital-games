import assert from "node:assert/strict";
import test from "node:test";

import * as bang from "../lib/bang.js";
import * as dos from "../lib/dos.js";
import * as dominion from "../lib/dominion.js";
import * as noThanks from "../lib/no-thanks.js";
import * as secretHitler from "../lib/secret-hitler.js";
import * as stratego from "../lib/stratego.js";
import * as ttr from "../lib/ticket-to-ride.js";
import * as uno from "../lib/uno.js";
import * as handFoot from "../lib/hand-and-foot.js";
import { SevenUpGame } from "../lib/game.js";
import { scumPlaceName, getScumDeckCount } from "../lib/scum.js";

// These pin the engine facts that openspec/changes/baseline-platform-and-game-specs/specs/games states.

test("7-Up deals the whole deck starting left of the dealer and rejects duplicate names", () => {
  const game = new SevenUpGame(["A", "B", "C"], 0, 1);
  assert.equal(game.currentPlayer, "B");
  assert.equal(["A", "B", "C"].reduce((sum, name) => sum + game.handFor(name).length, 0), 52);
  assert.throws(() => new SevenUpGame(["A", "A", "B"]));
  assert.throws(() => new SevenUpGame(["A", "B"]));
});

test("BANG! sheriff gets an extra life and a matching hand", () => {
  let lobby = bang.createLobby({ id: "h", name: "H" }, "ABCDE");
  while (lobby.players.length < 4) lobby = bang.addComputerPlayer(lobby);
  const game = bang.startGame(lobby);
  const sheriff = game.players.find((p) => p.role === "sheriff");
  assert.equal(sheriff.maxLives, sheriff.character.lives + 1);
  assert.equal(game.players.length, 4);
  assert.equal(game.turnIndex, game.players.indexOf(sheriff));
});

test("BANG! role distribution and stalemate bound", () => {
  assert.deepEqual(bang.ROLE_DISTRIBUTIONS[7].sort(), ["deputy", "deputy", "outlaw", "outlaw", "outlaw", "renegade", "sheriff"]);
  assert.equal(bang.STALEMATE_TURNS, 60);
  assert.equal(bang.CHARACTERS.filter((c) => c.lives === 3).length, 2);
  assert.equal(bang.CHARACTERS.length, 16);
});

test("Dominion supply scales with player count", () => {
  const started = (count) => {
    let game = dominion.createLobby({ id: "h", name: "H" }, "ABCDE");
    while (game.players.length < count) game = dominion.addComputerPlayer(game);
    return dominion.startGame(game);
  };
  const expected = { 2: [8, 8], 3: [12, 12], 4: [12, 12], 5: [12, 15], 6: [12, 18] };
  for (const [count, [duchy, province]] of Object.entries(expected)) {
    const { supply } = started(Number(count));
    assert.equal(supply.duchy, count === "2" ? 8 : 12, `${count} duchy`);
    assert.equal(supply.province, province, `${count} province`);
  }
  assert.equal(dominion.MAX_PLAYERS, 6);
});

test("DOS has the official deck and 200-point target", () => {
  assert.equal(dos.createDeck().length, 108);
  assert.equal(dos.TARGET_SCORE, 200);
});

test("UNO classic deck is 108 cards and target is 500", () => {
  assert.equal(uno.createDeck().length, 108);
  assert.equal(uno.TARGET_SCORE, 500);
});

test("No Thanks! chips by table size and 24-card round", () => {
  assert.equal(noThanks.startingChips(3), 11);
  assert.equal(noThanks.startingChips(5), 11);
  assert.equal(noThanks.startingChips(6), 9);
  assert.equal(noThanks.startingChips(7), 7);
});

test("Secret Hitler role counts by table size", () => {
  const counts = { 5: [3, 1], 6: [4, 1], 7: [4, 2], 8: [5, 2], 9: [5, 3], 10: [6, 3] };
  for (const [size, [liberals, fascists]] of Object.entries(counts)) {
    const seeds = Array.from({ length: Number(size) }, (_, i) => ({ playerId: String(i), name: `P${i}` }));
    const game = secretHitler.createSecretHitlerGame({ playerSeeds: seeds });
    assert.equal(game.players.filter((p) => p.role === "liberal").length, liberals, `${size} liberals`);
    assert.equal(game.players.filter((p) => p.role === "fascist").length, fascists, `${size} fascists`);
    assert.equal(game.players.filter((p) => p.role === "hitler").length, 1);
    assert.equal(game.policyDeck.length, 17);
  }
  assert.throws(() => secretHitler.createSecretHitlerGame({ playerSeeds: [{}, {}, {}, {}] }));
});

test("Stratego army, lakes and combat", () => {
  assert.equal(stratego.STRATEGO_ARMY_SIZE, 40);
  assert.equal(stratego.LAKE_KEYS.size, 8);
  const piece = (kind, rank) => ({ kind, rank, label: kind });
  assert.equal(stratego.resolveStrategoCombat(piece("spy", 10), piece("marshal", 1)).defenderSurvives, false);
  assert.equal(stratego.resolveStrategoCombat(piece("marshal", 1), piece("spy", 10)).defenderSurvives, false);
  assert.equal(stratego.resolveStrategoCombat(piece("miner", 8), piece("bomb", null)).attackerSurvives, true);
  assert.equal(stratego.resolveStrategoCombat(piece("general", 2), piece("bomb", null)).attackerSurvives, false);
  const tie = stratego.resolveStrategoCombat(piece("major", 4), piece("major", 4));
  assert.equal(tie.attackerSurvives || tie.defenderSurvives, false);
});

test("Ticket to Ride route scoring", () => {
  assert.deepEqual(ttr.ROUTE_POINTS, { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 });
});

test("Hand and Foot opening requirements and player ceiling", () => {
  assert.deepEqual(handFoot.HAND_FOOT_REQUIREMENTS, [50, 90, 120, 150]);
  assert.equal(handFoot.HAND_FOOT_MAX_PLAYERS, 16);
});

test("Scum classes and deck count", () => {
  assert.equal(scumPlaceName(1, 5), "President");
  assert.equal(scumPlaceName(2, 5), "Vice President");
  assert.equal(scumPlaceName(4, 5), "Vice Scum");
  assert.equal(scumPlaceName(5, 5), "Scum");
  assert.equal(scumPlaceName(2, 3), "Citizen");
  assert.equal(getScumDeckCount(9), 3);
});
