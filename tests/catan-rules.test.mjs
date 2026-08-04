import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePairedTurn,
  BASE_PORT_TYPES,
  createPairedTurn,
  EXPANDED_NUMBER_DECK,
  EXPANDED_PORT_TYPES,
  EXPANDED_TERRAIN_DECK,
  canProvideTradeResources,
  cardTypesFor,
  cityProduction,
  createCitiesKnightsState,
  getPortTradeRate,
  handLimitFor,
  hasCitiesKnights,
  hasSeafarers,
  rollEventDie,
  resolveTradeResponse,
  usesExpandedBoard,
  victoryTargetFor,
} from "../components/catan-rules.js";

test("each selectable ruleset enables the correct expansion systems and target", () => {
  assert.deepEqual([
    [hasSeafarers("original"), hasCitiesKnights("original"), victoryTargetFor("original")],
    [hasSeafarers("seafarers"), hasCitiesKnights("seafarers"), victoryTargetFor("seafarers")],
    [hasSeafarers("cities-knights"), hasCitiesKnights("cities-knights"), victoryTargetFor("cities-knights")],
    [hasSeafarers("combined"), hasCitiesKnights("combined"), victoryTargetFor("combined")],
  ], [
    [false, false, 10],
    [true, false, 14],
    [false, true, 13],
    [true, true, 16],
  ]);
});

test("Cities & Knights cities produce commodities from wood, wool, and ore", () => {
  assert.deepEqual(cityProduction("wood"), { wood: 1, paper: 1 });
  assert.deepEqual(cityProduction("sheep"), { sheep: 1, cloth: 1 });
  assert.deepEqual(cityProduction("ore"), { ore: 1, coin: 1 });
  assert.deepEqual(cityProduction("wheat"), { wheat: 2 });
  assert.deepEqual(cardTypesFor("cities-knights"), ["wood", "brick", "sheep", "wheat", "ore", "paper", "cloth", "coin"]);
});

test("city walls raise only their owner's seven-card hand limit", () => {
  const state = createCitiesKnightsState([{ id: "red" }, { id: "blue" }]);
  const game = { ruleset: "cities-knights", citiesKnights: { ...state, cityWalls: { v1: "red", v2: "red", v3: "blue" } } };
  assert.equal(handLimitFor(game, "red"), 11);
  assert.equal(handLimitFor(game, "blue"), 9);
  assert.equal(handLimitFor({ ruleset: "original" }, "red"), 7);
});

test("the event die has three barbarian faces and one face for each progress color", () => {
  assert.equal(rollEventDie(() => 0), "barbarian");
  assert.equal(rollEventDie(() => 0.49), "barbarian");
  assert.equal(rollEventDie(() => 0.51), "trade");
  assert.equal(rollEventDie(() => 0.7), "politics");
  assert.equal(rollEventDie(() => 0.99), "science");
});

test("five and six players use the 30-hex extension and 11 ports", () => {
  assert.equal(usesExpandedBoard(4), false);
  assert.equal(usesExpandedBoard(5), true);
  assert.equal(usesExpandedBoard(6), true);
  assert.equal(EXPANDED_TERRAIN_DECK.length, 30);
  assert.equal(EXPANDED_TERRAIN_DECK.filter((terrain) => terrain === "desert").length, 2);
  assert.equal(EXPANDED_NUMBER_DECK.length, 28);
  assert.equal(EXPANDED_PORT_TYPES.length, 11);
  assert.equal(BASE_PORT_TYPES.length, 9);
});

test("a player who lacks requested cards cannot accept a trade", () => {
  const request = { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 };
  const player = { resources: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
  assert.equal(canProvideTradeResources(player, request), false);
});

test("the first eligible player to accept an open trade completes it", () => {
  const resources = (values = {}) => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, ...values });
  const game = {
    players: [
      { id: "p1", name: "Red", resources: resources({ wood: 1 }) },
      { id: "p2", name: "Blue", resources: resources({ wheat: 1 }) },
      { id: "p3", name: "Gold", resources: resources({ wheat: 1 }) },
    ],
    pendingTrade: {
      fromPlayerId: "p1",
      toPlayerId: null,
      offer: resources({ wood: 1 }),
      request: resources({ wheat: 1 }),
      declinedPlayerIds: [],
    },
    log: [],
  };
  const completed = resolveTradeResponse(game, true, "p2");
  assert.equal(completed.pendingTrade, null);
  assert.deepEqual(completed.players.find((player) => player.id === "p1").resources, resources({ wheat: 1 }));
  assert.deepEqual(completed.players.find((player) => player.id === "p2").resources, resources({ wood: 1 }));
  assert.deepEqual(resolveTradeResponse(completed, true, "p3"), completed);
});

test("declining an open trade only removes that player", () => {
  const zero = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  const game = {
    players: [
      { id: "p1", name: "Red", resources: zero },
      { id: "p2", name: "Blue", resources: zero },
      { id: "p3", name: "Gold", resources: zero },
    ],
    pendingTrade: { fromPlayerId: "p1", toPlayerId: null, offer: zero, request: zero, declinedPlayerIds: [] },
    log: [],
  };
  const declined = resolveTradeResponse(game, false, "p2");
  assert.deepEqual(declined.pendingTrade.declinedPlayerIds, ["p2"]);
  assert.equal(resolveTradeResponse(declined, false, "p3").pendingTrade, null);
});

test("ports apply the best maritime trade rate a player controls", () => {
  const ports = [
    { from: "a", to: "b", type: "generic" },
    { from: "c", to: "d", type: "wheat" },
  ];
  const settlements = {
    a: { playerId: "red", type: "settlement" },
    c: { playerId: "red", type: "city" },
  };
  assert.equal(getPortTradeRate(ports, settlements, "red", "wood"), 3);
  assert.equal(getPortTradeRate(ports, settlements, "red", "wheat"), 2);
  assert.equal(getPortTradeRate(ports, settlements, "blue", "wheat"), 4);
});

test("the paired player marker starts three seats away and advances left", () => {
  const players = Array.from({ length: 6 }, (_, index) => ({ id: `p${index + 1}` }));
  const first = createPairedTurn(players);
  assert.deepEqual(first, { stage: "primary", primaryPlayerId: "p1", secondaryPlayerId: "p4" });
  const secondaryStage = advancePairedTurn(players, first);
  assert.equal(secondaryStage.stage, "secondary");
  assert.deepEqual(advancePairedTurn(players, secondaryStage), {
    stage: "primary",
    primaryPlayerId: "p2",
    secondaryPlayerId: "p5",
  });
});
