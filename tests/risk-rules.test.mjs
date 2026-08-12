import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTINENTS,
  TERRITORIES,
  advancePhase,
  attackTerritory,
  calculateReinforcements,
  clampArmySelection,
  createRiskGame,
  createRiskGameFromLobby,
  findTradeSet,
  fortifyTerritory,
  hasOwnedPath,
  mustTradeCards,
  placeReinforcement,
  resolveBattle,
  resolveConquestMove,
  runComputerTurn,
  tradeBonusFor,
  tradeCards,
} from "../lib/risk.js";

const fixedRng = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test("the map has symmetric borders", () => {
  for (const [id, territory] of Object.entries(TERRITORIES)) {
    for (const neighbor of territory.neighbors) {
      assert.ok(TERRITORIES[neighbor], `${id} has an unknown neighbor ${neighbor}`);
      assert.ok(TERRITORIES[neighbor].neighbors.includes(id), `${id} and ${neighbor} must connect both ways`);
    }
  }
});

test("a new game distributes every territory and starts reinforcement", () => {
  const game = createRiskGame("Avery", () => 0.42);
  assert.equal(Object.keys(game.territories).length, 42);
  assert.equal(game.deck.length, 44);
  assert.equal(game.phase, "reinforce");
  assert.equal(game.players[0].name, "Avery");
  assert.ok(game.reinforcements >= 3);
  assert.ok(game.players.every((player) => Object.values(game.territories).some((item) => item.ownerId === player.id)));
});

test("continent bonuses add to reinforcement armies", () => {
  const game = createRiskGame("Avery", () => 0.3);
  const territories = Object.fromEntries(
    Object.keys(TERRITORIES).map((id) => [id, { ownerId: "bot1", armies: 1 }]),
  );
  CONTINENTS.southAmerica.territories.forEach((id) => {
    territories[id] = { ownerId: "human", armies: 1 };
  });
  assert.equal(calculateReinforcements(territories, "human"), 5);
  assert.equal(game.players.length, 3);
});

test("reinforcements can only be placed on owned territory", () => {
  const game = createRiskGame("Avery", () => 0.7);
  const owned = Object.keys(game.territories).find((id) => game.territories[id].ownerId === "human");
  const enemy = Object.keys(game.territories).find((id) => game.territories[id].ownerId !== "human");
  const invalid = placeReinforcement(game, enemy, 1);
  assert.equal(invalid, game);
  const valid = placeReinforcement(game, owned, 1);
  assert.equal(valid.territories[owned].armies, game.territories[owned].armies + 1);
  assert.equal(valid.reinforcements, game.reinforcements - 1);
});

test("the deployment picker resets to at least one army on a later turn", () => {
  assert.equal(clampArmySelection(0, 6), 1);
  assert.equal(clampArmySelection(9, 6), 6);
  assert.equal(clampArmySelection(3, 6), 3);
});

test("defender wins tied dice", () => {
  const result = resolveBattle(4, 2, fixedRng(0.5, 0.5, 0.5, 0.5, 0.5));
  assert.equal(result.attackerLosses, 2);
  assert.equal(result.defenderLosses, 0);
});

test("an attack captures an adjacent territory when defenders reach zero", () => {
  const base = createRiskGame("Avery", () => 0.2);
  const territories = {
    ...base.territories,
    alaska: { ownerId: "human", armies: 5 },
    "northwest-territory": { ownerId: "bot1", armies: 1 },
  };
  const game = { ...base, territories, phase: "attack", reinforcements: 0 };
  const next = attackTerritory(game, "alaska", "northwest-territory", fixedRng(0.99, 0.9, 0.8, 0));
  assert.equal(next.territories["northwest-territory"].ownerId, "human");
  assert.equal(next.conqueredThisTurn, true);
  assert.ok(next.territories.alaska.armies >= 1);
  assert.deepEqual(next.pendingConquest, {
    fromId: "alaska",
    toId: "northwest-territory",
    minimum: 3,
    maximum: 4,
  });
  const moved = resolveConquestMove(next, 4);
  assert.equal(moved.territories["northwest-territory"].armies, 4);
  assert.equal(moved.territories.alaska.armies, 1);
  assert.equal(moved.pendingConquest, null);
});

test("the attacker can choose any legal number of dice", () => {
  const base = createRiskGame("Avery", () => 0.2);
  const game = {
    ...base,
    phase: "attack",
    reinforcements: 0,
    territories: {
      ...base.territories,
      alaska: { ownerId: "human", armies: 5 },
      "northwest-territory": { ownerId: "bot1", armies: 3 },
    },
  };
  const oneDie = attackTerritory(game, "alaska", "northwest-territory", { attackDice: 1, rng: () => 0.5 });
  assert.equal(oneDie.lastBattle.attackerDice.length, 1);
  const invalid = attackTerritory(game, "alaska", "northwest-territory", { attackDice: 4, rng: () => 0.5 });
  assert.equal(invalid, game);
});

test("a territory with one army cannot attack", () => {
  const base = createRiskGame("Avery", () => 0.2);
  const game = {
    ...base,
    phase: "attack",
    reinforcements: 0,
    territories: {
      ...base.territories,
      alaska: { ownerId: "human", armies: 1 },
      "northwest-territory": { ownerId: "bot1", armies: 1 },
    },
  };
  const next = attackTerritory(game, "alaska", "northwest-territory", { attackDice: 1, rng: () => 0.9 });
  assert.equal(next, game);
});

test("eliminating a player transfers all of their cards to the attacker", () => {
  const base = createRiskGame("Avery", () => 0.2);
  const capturedCards = [
    { id: "captured-1", territoryId: "alaska", type: "infantry" },
    { id: "captured-2", territoryId: "brazil", type: "cavalry" },
  ];
  const territories = Object.fromEntries(
    Object.keys(base.territories).map((id) => [id, { ownerId: "human", armies: 1 }]),
  );
  territories["northwest-territory"] = { ownerId: "human", armies: 5 };
  territories.alaska = { ownerId: "bot1", armies: 1 };
  const game = {
    ...base,
    phase: "attack",
    reinforcements: 0,
    territories,
    players: base.players.map((player) => player.id === "bot1" ? { ...player, cards: capturedCards } : player),
  };
  const next = attackTerritory(game, "northwest-territory", "alaska", { attackDice: 3, rng: fixedRng(0.99, 0.9, 0.8, 0) });
  assert.deepEqual(next.players.find((player) => player.id === "human").cards, capturedCards);
  assert.deepEqual(next.players.find((player) => player.id === "bot1").cards, []);
});

test("post-conquest movement enforces the final dice minimum", () => {
  const base = createRiskGame("Avery", () => 0.2);
  const pending = {
    ...base,
    phase: "attack",
    territories: {
      ...base.territories,
      alaska: { ownerId: "human", armies: 6 },
      "northwest-territory": { ownerId: "human", armies: 0 },
    },
    pendingConquest: { fromId: "alaska", toId: "northwest-territory", minimum: 3, maximum: 5 },
  };
  assert.equal(resolveConquestMove(pending, 2), pending);
  const moved = resolveConquestMove(pending, 3);
  assert.equal(moved.territories.alaska.armies, 3);
  assert.equal(moved.territories["northwest-territory"].armies, 3);
});

test("a shared lobby starts with every room commander and official army totals", () => {
  const lobby = {
    roomCode: "ABCDE",
    hostId: "p1",
    cardTradeMode: "normal",
    createdAt: 123,
    players: [
      { id: "p1", name: "One", color: "#111", isBot: false },
      { id: "p2", name: "Two", color: "#222", isBot: false },
      { id: "cpu", name: "Computer", color: "#333", isBot: true },
    ],
  };
  const game = createRiskGameFromLobby(lobby, () => 0.4);
  assert.equal(game.roomCode, "ABCDE");
  assert.equal(game.cardTradeMode, "normal");
  assert.deepEqual(game.players.map((player) => player.id), ["p1", "p2", "cpu"]);
  for (const player of game.players) {
    const armies = Object.values(game.territories)
      .filter((territory) => territory.ownerId === player.id)
      .reduce((sum, territory) => sum + territory.armies, 0);
    assert.equal(armies, 35);
  }
});

test("fortification follows a connected chain of owned territories", () => {
  const base = createRiskGame("Avery", () => 0.1);
  const territories = {
    ...base.territories,
    alaska: { ownerId: "human", armies: 5 },
    alberta: { ownerId: "human", armies: 1 },
    "western-united-states": { ownerId: "human", armies: 1 },
  };
  const game = { ...base, territories, phase: "fortify" };
  assert.equal(hasOwnedPath(game, "alaska", "western-united-states", "human"), true);
  const next = fortifyTerritory(game, "alaska", "western-united-states", 2);
  assert.equal(next.territories.alaska.armies, 3);
  assert.equal(next.territories["western-united-states"].armies, 3);
  assert.notEqual(next.currentPlayerIndex, game.currentPlayerIndex);
});

test("ending a successful turn awards exactly one territory card", () => {
  const base = createRiskGame("Avery", () => 0.25);
  const cardsBefore = base.players[0].cards.length;
  const next = advancePhase({ ...base, phase: "fortify", conqueredThisTurn: true });
  assert.equal(next.players[0].cards.length, cardsBefore + 1);
  assert.equal(next.deck.length, base.deck.length - 1);
  assert.equal(next.conqueredThisTurn, false);
});

test("ending a turn without a conquest does not award a card", () => {
  const base = createRiskGame("Avery", () => 0.25);
  const next = advancePhase({ ...base, phase: "fortify", conqueredThisTurn: false });
  assert.equal(next.players[0].cards.length, 0);
  assert.equal(next.deck.length, base.deck.length);
});

test("three matching cards or one of each form a trade set", () => {
  const matching = [
    { id: "1", type: "infantry" }, { id: "2", type: "infantry" }, { id: "3", type: "infantry" },
  ];
  const mixed = [
    { id: "1", type: "infantry" }, { id: "2", type: "cavalry" }, { id: "3", type: "artillery" },
  ];
  assert.deepEqual(findTradeSet(matching), matching);
  assert.deepEqual(findTradeSet(mixed), mixed);
  assert.equal(findTradeSet([{ id: "1", type: "infantry" }, { id: "2", type: "infantry" }, { id: "3", type: "cavalry" }]), null);
});

test("trading cards adds the progressive army bonus", () => {
  const base = createRiskGame("Avery", () => 0.25);
  const cards = [
    { id: "1", type: "infantry" }, { id: "2", type: "cavalry" }, { id: "3", type: "artillery" },
  ];
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, cards } : player) };
  const next = tradeCards(game);
  assert.equal(next.players[0].cards.length, 0);
  assert.equal(next.reinforcements, game.reinforcements + 4);
  assert.equal(next.tradesCompleted, 1);
});

test("five or more cards force a trade before reinforcement or phase changes", () => {
  const base = createRiskGame("Avery", () => 0.25);
  const cards = [
    { id: "1", type: "infantry" }, { id: "2", type: "infantry" }, { id: "3", type: "infantry" },
    { id: "4", type: "cavalry" }, { id: "5", type: "artillery" },
  ];
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, cards } : player) };
  const owned = Object.keys(game.territories).find((id) => game.territories[id].ownerId === "human");
  assert.equal(mustTradeCards(game), true);
  assert.equal(placeReinforcement(game, owned, 1), game);
  const readyToAdvance = { ...game, reinforcements: 0 };
  assert.equal(advancePhase(readyToAdvance), readyToAdvance);
  const traded = tradeCards(game);
  assert.equal(traded.players[0].cards.length, 2);
  assert.equal(mustTradeCards(traded), false);
  assert.notEqual(placeReinforcement(traded, owned, 1), traded);
});

test("a forced trade during an attack pauses for deployment and then resumes attacking", () => {
  const base = createRiskGame("Avery", () => 0.25);
  const cards = [
    { id: "1", type: "infantry" }, { id: "2", type: "infantry" }, { id: "3", type: "infantry" },
    { id: "4", type: "cavalry" }, { id: "5", type: "artillery" },
  ];
  const game = {
    ...base,
    phase: "attack",
    reinforcements: 0,
    players: base.players.map((player, index) => index === 0 ? { ...player, cards } : player),
  };
  const traded = tradeCards(game);
  assert.equal(traded.phase, "reinforce");
  assert.equal(traded.resumePhaseAfterTrade, "attack");
  const owned = Object.keys(traded.territories).find((id) => traded.territories[id].ownerId === "human");
  const deployed = placeReinforcement(traded, owned, traded.reinforcements);
  const resumed = advancePhase(deployed);
  assert.equal(resumed.phase, "attack");
  assert.equal(resumed.resumePhaseAfterTrade, null);
});

test("normal card trades use fixed values based on the traded symbols", () => {
  const infantry = [
    { id: "1", type: "infantry" }, { id: "2", type: "infantry" }, { id: "3", type: "infantry" },
  ];
  const artillery = [
    { id: "1", type: "artillery" }, { id: "2", type: "artillery" }, { id: "3", type: "artillery" },
  ];
  const mixed = [
    { id: "1", type: "infantry" }, { id: "2", type: "cavalry" }, { id: "3", type: "artillery" },
  ];
  assert.equal(tradeBonusFor(20, "normal", infantry), 4);
  assert.equal(tradeBonusFor(20, "normal", artillery), 8);
  assert.equal(tradeBonusFor(20, "normal", mixed), 10);

  const base = createRiskGame("Avery", () => 0.25);
  const game = {
    ...base,
    cardTradeMode: "normal",
    players: base.players.map((player, index) => index === 0 ? { ...player, cards: mixed } : player),
  };
  const next = tradeCards(game);
  assert.equal(next.reinforcements, game.reinforcements + 10);
});

test("computer completes its full turn", () => {
  let game = createRiskGame("Avery", () => 0.4);
  while (game.reinforcements > 0) {
    const owned = Object.keys(game.territories).find((id) => game.territories[id].ownerId === "human");
    game = placeReinforcement(game, owned, 1);
  }
  game = advancePhase(game);
  game = advancePhase(game);
  game = advancePhase(game);
  assert.equal(game.players[game.currentPlayerIndex].isBot, true);
  const next = runComputerTurn(game, () => 0.5);
  assert.notEqual(next.currentPlayerIndex, game.currentPlayerIndex);
  assert.equal(next.phase, "reinforce");
});
