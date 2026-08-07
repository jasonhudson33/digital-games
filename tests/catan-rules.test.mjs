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
  DEVELOPMENT_DECK,
  eligiblePirateVictimIds,
  getPortTradeRate,
  handLimitFor,
  hasCitiesKnights,
  hasSeafarers,
  canPromoteKnight,
  pillageChosenCity,
  playProgressCard,
  PROGRESS_DECKS,
  progressCardEligible,
  resolveProgressCardChoice,
  longestRouteLength,
  reconcileCatanAwards,
  resolveBarbarianAttack,
  rollEventDie,
  startingBuildingType,
  resolveTradeResponse,
  SEAFARERS_FOREIGN_TERRAIN_DECK,
  usesExpandedBoard,
  usesDevelopmentCards,
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

test("progress decks contain 18 official cards in each color and use improvement ranges", () => {
  assert.equal(PROGRESS_DECKS.science.length, 18);
  assert.equal(PROGRESS_DECKS.trade.length, 18);
  assert.equal(PROGRESS_DECKS.politics.length, 18);
  assert.equal(progressCardEligible(0, 1), false);
  assert.equal(progressCardEligible(1, 1), true);
  assert.equal(progressCardEligible(1, 2), true);
  assert.equal(progressCardEligible(1, 3), false);
  assert.equal(progressCardEligible(2, 3), true);
  assert.equal(progressCardEligible(5, 6), true);
});

test("green production progress cards can be played and return to their deck", () => {
  const board = {
    vertices: [{ id: "v1", tileIds: [1, 2] }],
    edges: [],
  };
  const game = {
    ruleset: "cities-knights",
    players: [{
      id: "red",
      name: "Red",
      points: 2,
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, paper: 0, cloth: 0, coin: 0 },
      progressCards: [{ id: "card-1", type: "irrigation", color: "science" }],
    }],
    settlements: { v1: { playerId: "red", type: "settlement" } },
    tiles: [{ id: 1, resource: "wheat" }, { id: 2, resource: "wheat" }],
    citiesKnights: { progressDecks: { science: [], trade: [], politics: [] }, knights: {}, cityWalls: {} },
    log: [],
  };
  const played = playProgressCard(game, "red", "card-1", board, () => 0);
  assert.equal(played.players[0].resources.wheat, 4);
  assert.equal(played.players[0].progressCards.length, 0);
  assert.deepEqual(played.citiesKnights.progressDecks.science, ["irrigation"]);
});

test("yellow Merchant Fleet cards prompt for and apply a two-for-one card type", () => {
  const game = {
    ruleset: "cities-knights",
    players: [{
      id: "red",
      name: "Red",
      points: 2,
      resources: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0, paper: 0, cloth: 0, coin: 0 },
      progressCards: [{ id: "card-2", type: "merchantFleet", color: "trade" }],
    }],
    settlements: {},
    tiles: [],
    citiesKnights: { progressDecks: { science: [], trade: [], politics: [] }, knights: {}, cityWalls: {} },
    log: [],
  };
  const started = playProgressCard(game, "red", "card-2", { vertices: [], edges: [] }, () => 0);
  assert.equal(started.pendingProgress.type, "merchantFleet");
  const resolved = resolveProgressCardChoice(started, "red", "wood", { vertices: [], edges: [] }, () => 0);
  assert.deepEqual(resolved.citiesKnights.merchantFleet, { playerId: "red", cardType: "wood" });
  assert.equal(resolved.pendingProgress, null);
});

test("a newly drawn progress card waits until the player's next turn", () => {
  const game = {
    ruleset: "cities-knights",
    turn: 4,
    victoryTarget: 13,
    players: [{
      id: "red",
      name: "Red",
      points: 2,
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, paper: 0, cloth: 0, coin: 0 },
      progressCards: [{ id: "new-card", type: "irrigation", color: "science", drawnTurn: 4 }],
    }],
    settlements: {},
    tiles: [],
    citiesKnights: { progressDecks: { science: [], trade: [], politics: [] }, knights: {}, cityWalls: {} },
    log: [],
  };
  const blocked = playProgressCard(game, "red", "new-card", { vertices: [], edges: [] }, () => 0);
  assert.equal(blocked, game);
  const nextTurn = playProgressCard({ ...game, turn: 5 }, "red", "new-card", { vertices: [], edges: [] }, () => 0);
  assert.equal(nextTurn.players[0].progressCards.length, 0);
});

test("a waited progress victory-point card can be revealed to win", () => {
  const game = {
    ruleset: "cities-knights",
    turn: 8,
    victoryTarget: 13,
    players: [{
      id: "red",
      name: "Red",
      points: 12,
      progressVictoryPoints: 0,
      resources: {},
      progressCards: [{ id: "printing", type: "printing", color: "science", drawnTurn: 7 }],
    }],
    citiesKnights: { progressDecks: { science: [], trade: [], politics: [] } },
    log: [],
  };
  const won = playProgressCard(game, "red", "printing", { vertices: [], edges: [] });
  assert.equal(won.players[0].points, 13);
  assert.equal(won.players[0].progressVictoryPoints, 1);
  assert.equal(won.winnerId, "red");
});

test("knights promote one level at a time and mighty knights require politics level 3", () => {
  const game = {
    citiesKnights: {
      knights: { v1: { playerId: "red", level: 1 }, v2: { playerId: "red", level: 2 } },
      improvements: { red: { politics: 2 } },
      promotedKnightIdsThisTurn: [],
    },
  };
  assert.equal(canPromoteKnight(game, "red", "v1"), true);
  assert.equal(canPromoteKnight(game, "red", "v2"), false);
  game.citiesKnights.improvements.red.politics = 3;
  assert.equal(canPromoteKnight(game, "red", "v2"), true);
  game.citiesKnights.promotedKnightIdsThisTurn = ["v1"];
  assert.equal(canPromoteKnight(game, "red", "v1"), false);
});

test("the city owner chooses a pillaged city and its wall is removed", () => {
  const game = {
    players: [{ id: "red", points: 4 }],
    settlements: { v1: { playerId: "red", type: "city" }, v2: { playerId: "red", type: "city" } },
    citiesKnights: { cityWalls: { v2: "red" } },
    pendingCityLoss: { playerIds: ["red"], currentPlayerId: "red", eligibleVertexIds: ["v1", "v2"] },
    log: [],
  };
  const resolved = pillageChosenCity(game, "red", "v2");
  assert.equal(resolved.settlements.v2.type, "settlement");
  assert.equal(resolved.settlements.v1.type, "city");
  assert.equal(resolved.citiesKnights.cityWalls.v2, undefined);
  assert.equal(resolved.players[0].points, 3);
  assert.equal(resolved.pendingCityLoss, null);
});

test("the strongest defender receives one Defender of Catan victory point", () => {
  const game = {
    turn: 4,
    victoryTarget: 13,
    winnerId: null,
    robberTileId: null,
    robberInactiveTileId: 2,
    players: [
      { id: "red", name: "Red", points: 3, hiddenVictoryPoints: 0, defenderPoints: 0 },
      { id: "blue", name: "Blue", points: 2, hiddenVictoryPoints: 0, defenderPoints: 0 },
    ],
    settlements: {
      v1: { playerId: "red", type: "city" },
      v2: { playerId: "blue", type: "city" },
      v3: { playerId: "blue", type: "city" },
    },
    citiesKnights: {
      attacks: 1,
      barbarianDistance: 1,
      knights: {
        k1: { playerId: "red", level: 2, active: true },
        k2: { playerId: "blue", level: 1, active: true },
      },
      cityWalls: {},
      metropolises: { science: null, trade: null, politics: null },
    },
    log: [],
  };
  const resolved = resolveBarbarianAttack(game, 1000);
  assert.equal(resolved.players[0].points, 4);
  assert.equal(resolved.players[0].defenderPoints, 1);
  assert.match(resolved.barbarianAlert.message, /Red.*1 victory point/i);
  assert.equal(resolved.pendingCityLoss, null);
});

test("the original development deck has the official 25-card mix", () => {
  assert.equal(usesDevelopmentCards("original"), true);
  assert.equal(usesDevelopmentCards("seafarers"), true);
  assert.equal(usesDevelopmentCards("cities-knights"), false);
  assert.equal(usesDevelopmentCards("combined"), false);
  assert.equal(DEVELOPMENT_DECK.length, 25);
  assert.equal(DEVELOPMENT_DECK.filter((card) => card === "knight").length, 14);
  assert.equal(DEVELOPMENT_DECK.filter((card) => card === "victoryPoint").length, 5);
  assert.equal(DEVELOPMENT_DECK.filter((card) => card === "roadBuilding").length, 2);
  assert.equal(DEVELOPMENT_DECK.filter((card) => card === "yearOfPlenty").length, 2);
  assert.equal(DEVELOPMENT_DECK.filter((card) => card === "monopoly").length, 2);
});

test("Seafarers boards use two gold fields on the foreign islands", () => {
  assert.equal(SEAFARERS_FOREIGN_TERRAIN_DECK.length, 6);
  assert.equal(SEAFARERS_FOREIGN_TERRAIN_DECK.filter((terrain) => terrain === "gold").length, 2);
  assert.equal(hasSeafarers("seafarers"), true);
  assert.equal(hasSeafarers("combined"), true);
  assert.equal(hasSeafarers("cities-knights"), false);
});

test("Cities & Knights second setup placement is a city", () => {
  assert.equal(startingBuildingType(0, 4, "cities-knights"), "settlement");
  assert.equal(startingBuildingType(4, 4, "cities-knights"), "city");
  assert.equal(startingBuildingType(4, 4, "combined"), "city");
  assert.equal(startingBuildingType(4, 4, "original"), "settlement");
});

test("a moved pirate lets the player choose among ship owners on that sea tile", () => {
  const board = { edges: [
    { id: "e1", tileIds: [3, 4] },
    { id: "e2", tileIds: [3, 8] },
    { id: "e3", tileIds: [2, 8] },
  ] };
  const ships = { e1: "blue", e2: "gold", e3: "green" };
  const resources = (wood) => ({ wood, brick: 0, sheep: 0, wheat: 0, ore: 0 });
  const players = [
    { id: "red", resources: resources(2) },
    { id: "blue", resources: resources(1) },
    { id: "gold", resources: resources(2) },
    { id: "green", resources: resources(3) },
  ];
  assert.deepEqual(eligiblePirateVictimIds(board, ships, 3, players, "red"), ["blue", "gold"]);
});

const routeBoard = {
  edges: Array.from({ length: 6 }, (_, index) => ({ id: `e${index + 1}`, from: `v${index}`, to: `v${index + 1}` })),
};

const awardPlayer = (id, points = 0, playedKnights = 0) => ({
  id,
  name: id.toUpperCase(),
  points,
  hiddenVictoryPoints: 0,
  playedKnights,
});

test("five continuous roads claim Longest Road and an opponent building splits it", () => {
  const roads = Object.fromEntries(routeBoard.edges.map((edge) => [edge.id, "red"]));
  const game = {
    ruleset: "original",
    victoryTarget: 10,
    winnerId: null,
    players: [awardPlayer("red"), awardPlayer("blue")],
    roads,
    ships: {},
    settlements: {},
    longestRoadPlayerId: null,
    largestArmyPlayerId: null,
    log: [],
  };
  const awarded = reconcileCatanAwards(game, routeBoard);
  assert.equal(awarded.longestRoadPlayerId, "red");
  assert.equal(awarded.longestRouteLengths.red, 6);
  assert.equal(awarded.players[0].points, 2);

  const split = reconcileCatanAwards({
    ...awarded,
    settlements: { v3: { playerId: "blue", type: "settlement" } },
  }, routeBoard);
  assert.equal(split.longestRouteLengths.red, 3);
  assert.equal(split.longestRoadPlayerId, null);
  assert.equal(split.players[0].points, 0);
});

test("the current Longest Road holder keeps a tie but loses to a longer route", () => {
  const board = { edges: [
    ...Array.from({ length: 6 }, (_, index) => ({ id: `r${index}`, from: `r${index}`, to: `r${index + 1}` })),
    ...Array.from({ length: 6 }, (_, index) => ({ id: `b${index}`, from: `b${index}`, to: `b${index + 1}` })),
  ] };
  const redRoads = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`r${index}`, "red"]));
  const blueRoads = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`b${index}`, "blue"]));
  const tied = reconcileCatanAwards({
    ruleset: "original",
    victoryTarget: 10,
    winnerId: null,
    players: [awardPlayer("red", 2), awardPlayer("blue")],
    roads: { ...redRoads, ...blueRoads },
    ships: {},
    settlements: {},
    longestRoadPlayerId: "red",
    largestArmyPlayerId: null,
    log: [],
  }, board);
  assert.equal(tied.longestRoadPlayerId, "red");

  const overtaken = reconcileCatanAwards({ ...tied, roads: { ...tied.roads, b5: "blue" } }, board);
  assert.equal(overtaken.longestRoadPlayerId, "blue");
  assert.equal(overtaken.players.find((player) => player.id === "red").points, 0);
  assert.equal(overtaken.players.find((player) => player.id === "blue").points, 2);
});

test("Seafarers roads and ships join only through the owner's building", () => {
  const board = { edges: [
    { id: "r1", from: "v0", to: "v1" },
    { id: "r2", from: "v1", to: "v2" },
    { id: "s1", from: "v2", to: "v3" },
    { id: "s2", from: "v3", to: "v4" },
    { id: "s3", from: "v4", to: "v5" },
  ] };
  const roads = { r1: "red", r2: "red" };
  const ships = { s1: "red", s2: "red", s3: "red" };
  assert.equal(longestRouteLength(board, roads, ships, {}, "red"), 3);
  assert.equal(longestRouteLength(board, roads, ships, { v2: { playerId: "red", type: "settlement" } }, "red"), 5);
});

test("three played knights claim Largest Army and ties stay with its holder", () => {
  const base = {
    ruleset: "original",
    victoryTarget: 10,
    winnerId: null,
    players: [awardPlayer("red", 0, 3), awardPlayer("blue", 0, 2)],
    roads: {},
    ships: {},
    settlements: {},
    longestRoadPlayerId: null,
    largestArmyPlayerId: null,
    log: [],
  };
  const awarded = reconcileCatanAwards(base, { edges: [] });
  assert.equal(awarded.largestArmyPlayerId, "red");
  assert.equal(awarded.players[0].points, 2);

  const tied = reconcileCatanAwards({
    ...awarded,
    players: awarded.players.map((player) => player.id === "blue" ? { ...player, playedKnights: 3 } : player),
  }, { edges: [] });
  assert.equal(tied.largestArmyPlayerId, "red");

  const overtaken = reconcileCatanAwards({
    ...tied,
    players: tied.players.map((player) => player.id === "blue" ? { ...player, playedKnights: 4 } : player),
  }, { edges: [] });
  assert.equal(overtaken.largestArmyPlayerId, "blue");
  assert.equal(overtaken.players.find((player) => player.id === "red").points, 0);
  assert.equal(overtaken.players.find((player) => player.id === "blue").points, 2);

  const citiesKnightsMode = reconcileCatanAwards({ ...base, ruleset: "combined" }, { edges: [] });
  assert.equal(citiesKnightsMode.largestArmyPlayerId, null);
  assert.equal(citiesKnightsMode.players[0].points, 0);
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
