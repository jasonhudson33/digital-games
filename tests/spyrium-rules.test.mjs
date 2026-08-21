import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  RESIDENCE_VALUES,
  activationCost,
  activateMarketCard,
  addComputerPlayer,
  addPlayer,
  adjacentCardIndexes,
  beginActivation,
  chooseBonus,
  createLobby,
  createPeriodDecks,
  currentPlayer,
  gainMoney,
  marketSlots,
  pass,
  placeWorker,
  playerMarketWorkers,
  projectedFinalScore,
  runComputerTurn,
  startGame,
  useBuilding,
  workerAdjacentCardIndexes,
} from "../lib/spyrium.js";

const person = (id, name) => ({ id, name });

function lobbyWith(count = 2) {
  let game = createLobby(person("p1", "Ada"), "STEAM", 1);
  for (let index = 2; index <= count; index += 1) game = addPlayer(game, person(`p${index}`, `Player ${index}`));
  return game;
}

function gameWith(count = 2) { return startGame(lobbyWith(count), () => 0.42); }

function advanceRound(game) {
  const actorIndex = game.currentPlayerIndex;
  const prepared = {
    ...game,
    workerSlots: Object.fromEntries(marketSlots().map((slot) => [slot.id, []])),
    players: game.players.map((player, index) => ({
      ...player,
      phase: "activation",
      passed: index !== actorIndex,
    })),
  };
  return pass(prepared, prepared.players[actorIndex].id);
}

function activationState() {
  const game = gameWith(2);
  const slot = marketSlots()[0];
  const placed = placeWorker(game, currentPlayer(game).id, slot.id);
  const ownerId = game.players[game.firstPlayerIndex].id;
  const ownerIndex = game.players.findIndex((player) => player.id === ownerId);
  return {
    game: {
      ...placed,
      currentPlayerIndex: ownerIndex,
      players: placed.players.map((player) => player.id === ownerId ? { ...player, phase: "activation", money: 30 } : player),
    },
    ownerId,
    slot,
  };
}

test("period decks contain the tabletop card distribution", () => {
  const decks = createPeriodDecks(() => 0.2);
  assert.deepEqual(Object.fromEntries(Object.entries(decks).map(([period, cards]) => [period, cards.length])), { A: 30, B: 20, C: 9 });
  const cards = Object.values(decks).flat();
  assert.equal(cards.filter((card) => card.type === "building").length, 35);
  assert.equal(cards.filter((card) => card.type === "character").length, 17);
  assert.equal(cards.filter((card) => card.type === "technique").length, 7);
});

test("every unique period card has generated artwork", () => {
  const cards = Object.values(createPeriodDecks(() => 0.2)).flat();
  const designs = new Map(cards.map((card) => [`${card.period}-${card.slug}`, card]));

  assert.equal(designs.size, 39);
  for (const card of designs.values()) {
    assert.match(card.art, /^\/spyrium\/cards\/[abc]-[a-z-]+\.png$/);
    assert.equal(existsSync(new URL(`../public${card.art}`, import.meta.url)), true, `Missing artwork for ${card.name}`);
  }
});

test("six rounds deal 27 A cards, 18 B cards, and every C card", () => {
  let game = gameWith(2);
  const dealt = { A: [], B: [], C: [] };

  for (let round = 1; round <= 6; round += 1) {
    dealt[game.period].push(...game.market.map((card) => card.id));
    if (round < 6) game = advanceRound(game);
  }

  assert.equal(dealt.A.length, 27);
  assert.equal(dealt.B.length, 18);
  assert.equal(dealt.C.length, 9);
  assert.equal(new Set(dealt.A).size, 27);
  assert.equal(new Set(dealt.B).size, 18);
  assert.equal(new Set(dealt.C).size, 9);
  assert.deepEqual(Object.fromEntries(Object.entries(game.decks).map(([period, cards]) => [period, cards.length])), { A: 3, B: 2, C: 0 });
});

test("the residence track skips six", () => {
  assert.deepEqual(RESIDENCE_VALUES, [2, 3, 4, 5, 7]);
});

test("rooms support two to five human or computer industrialists", () => {
  const full = lobbyWith(5);
  assert.equal(full.players.length, 5);
  assert.equal(addPlayer(full, person("p6", "Six")), full);
  const solo = createLobby(person("solo", "Solo"), "SOLO");
  assert.equal(startGame(solo), solo);
  const withBot = addComputerPlayer(lobbyWith(1), { id: "bot-1", name: "Brunel" });
  assert.equal(withBot.players[1].isComputer, true);
  assert.equal(startGame(withBot, () => 0.1).phase, "playing");
});

test("setup creates the 3x3 market, six-round event queue, and starting resources", () => {
  const game = gameWith(3);
  assert.equal(game.market.length, 9);
  assert.ok(game.market.every(Boolean));
  assert.equal(game.events.length, 7);
  assert.equal(game.currentEvent.id, game.events[0].id);
  assert.equal(game.futureEvent.id, game.events[1].id);
  assert.ok(game.players.every((player) => player.money === 10 && player.spyrium === 2 && player.totalWorkers === 3));
  assert.equal(Object.keys(game.workerSlots).length, 12);
});

test("workers are placed only between live adjacent market cards", () => {
  const game = gameWith(2);
  const player = currentPlayer(game);
  const slot = marketSlots()[0];
  const next = placeWorker(game, player.id, slot.id);
  assert.equal(playerMarketWorkers(next, player.id), 1);
  assert.equal(next.players.find((item) => item.id === player.id).activeWorkers, 2);
  assert.ok(adjacentCardIndexes(slot.id).every((index) => [0, 1].includes(index)));

  const emptyMarket = { ...game, market: Array(9).fill(null) };
  assert.equal(placeWorker(emptyMarket, player.id, slot.id), emptyMarket);
});

test("every player may place all of their workers in the same market gap", () => {
  let game = gameWith(2);
  const slotId = marketSlots()[0].id;
  for (let placement = 0; placement < 6; placement += 1) {
    game = placeWorker(game, currentPlayer(game).id, slotId);
  }
  assert.equal(game.workerSlots[slotId].length, 6);
  for (const player of game.players) {
    assert.equal(game.workerSlots[slotId].filter((worker) => worker.playerId === player.id).length, 3);
    assert.equal(player.activeWorkers, 0);
  }
});

test("activation cost includes all other adjacent workers", () => {
  const { game, ownerId, slot } = activationState();
  const worker = game.workerSlots[slot.id][0];
  const cardIndex = slot.cards[0];
  const crowded = {
    ...game,
    workerSlots: {
      ...game.workerSlots,
      [slot.id]: [...game.workerSlots[slot.id], { id: "rival-1", playerId: "p2" }],
      [marketSlots().find((item) => item.id !== slot.id && item.cards.includes(cardIndex)).id]: [{ id: "rival-2", playerId: "p2" }],
    },
  };
  const cost = activationCost(crowded, ownerId, worker.id, cardIndex);
  assert.equal(cost.congestion, 2);
  assert.equal(cost.total, crowded.market[cardIndex].price + 2 + (crowded.market[cardIndex].type === "building" ? 0 : 0));
});

test("workers on vertical lines gain adjacency only across the same market row", () => {
  const base = gameWith(2);
  const buyerIndex = base.currentPlayerIndex;
  const waitingIndex = (buyerIndex + 1) % base.players.length;
  const buyer = base.players[buyerIndex];
  const waiting = base.players[waitingIndex];
  const buyerSlot = "v-0-1";
  const waitingSlot = "h-0-0";
  const buyerWorker = { id: "buyer-worker", playerId: buyer.id };
  const waitingWorker = { id: "waiting-worker", playerId: waiting.id };
  const removable = {
    id: "removable-building",
    period: "A",
    slug: "removable-building",
    name: "Removable Building",
    type: "building",
    price: 0,
    symbols: ["factory"],
    points: 0,
    description: "Test building.",
    actions: [],
    tokens: [],
  };
  const prepared = {
    ...base,
    market: base.market.map((card, index) => index === 1 ? removable : card),
    workerSlots: {
      ...base.workerSlots,
      [buyerSlot]: [buyerWorker],
      [waitingSlot]: [waitingWorker],
    },
    players: base.players.map((player) => ({ ...player, phase: "activation", money: 30 })),
  };

  const removed = activateMarketCard(prepared, buyer.id, buyerWorker.id, 1);

  assert.equal(removed.market[1], null);
  assert.equal(currentPlayer(removed).id, waiting.id);
  assert.deepEqual(removed.workerSlots[waitingSlot][0].cardIndexes, [0, 2]);
  assert.deepEqual(workerAdjacentCardIndexes(removed, waitingSlot, removed.workerSlots[waitingSlot][0]), [0, 2]);
  assert.ok(activationCost(removed, waiting.id, waitingWorker.id, 2));
  assert.equal(activationCost(removed, waiting.id, waitingWorker.id, 4), null);
});

test("workers on horizontal lines gain adjacency only across the same market column", () => {
  const base = gameWith(2);
  const buyerIndex = base.currentPlayerIndex;
  const waitingIndex = (buyerIndex + 1) % base.players.length;
  const buyer = base.players[buyerIndex];
  const waiting = base.players[waitingIndex];
  const buyerSlot = "h-1-0";
  const waitingSlot = "v-0-0";
  const buyerWorker = { id: "buyer-worker", playerId: buyer.id };
  const waitingWorker = { id: "waiting-worker", playerId: waiting.id };
  const removable = {
    id: "removable-building",
    period: "A",
    slug: "removable-building",
    name: "Removable Building",
    type: "building",
    price: 0,
    symbols: ["factory"],
    points: 0,
    description: "Test building.",
    actions: [],
    tokens: [],
  };
  const prepared = {
    ...base,
    market: base.market.map((card, index) => index === 3 ? removable : card),
    workerSlots: {
      ...base.workerSlots,
      [buyerSlot]: [buyerWorker],
      [waitingSlot]: [waitingWorker],
    },
    players: base.players.map((player) => ({ ...player, phase: "activation", money: 30 })),
  };

  const removed = activateMarketCard(prepared, buyer.id, buyerWorker.id, 3);

  assert.equal(removed.market[3], null);
  assert.equal(currentPlayer(removed).id, waiting.id);
  assert.deepEqual(removed.workerSlots[waitingSlot][0].cardIndexes, [0, 6]);
  assert.deepEqual(workerAdjacentCardIndexes(removed, waitingSlot, removed.workerSlots[waitingSlot][0]), [0, 6]);
  assert.ok(activationCost(removed, waiting.id, waitingWorker.id, 6));
  assert.equal(activationCost(removed, waiting.id, waitingWorker.id, 4), null);
});

test("withdrawing earns congestion money and removes the worker", () => {
  const { game, ownerId, slot } = activationState();
  const worker = game.workerSlots[slot.id][0];
  const cardIndex = slot.cards[0];
  const crowded = { ...game, workerSlots: { ...game.workerSlots, [slot.id]: [...game.workerSlots[slot.id], { id: "other", playerId: "p2" }] } };
  const before = crowded.players.find((player) => player.id === ownerId).money;
  const next = gainMoney(crowded, ownerId, worker.id, cardIndex);
  assert.equal(next.players.find((player) => player.id === ownerId).money, before + 1);
  assert.equal(playerMarketWorkers(next, ownerId), 0);
});

test("activating a character pays printed price and resolves its effect", () => {
  const { game, ownerId, slot } = activationState();
  const worker = game.workerSlots[slot.id][0];
  const cardIndex = slot.cards[0];
  const character = { id: "test-adviser", period: "A", slug: "adviser", name: "Adviser", type: "character", price: 2, description: "Gain 3 VP.", token: false, tokens: [] };
  const prepared = { ...game, market: game.market.map((card, index) => index === cardIndex ? character : card) };
  const before = prepared.players.find((player) => player.id === ownerId);
  const next = activateMarketCard(prepared, ownerId, worker.id, cardIndex);
  const after = next.players.find((player) => player.id === ownerId);
  assert.equal(after.money, before.money - 2);
  assert.equal(after.score, 3);
  assert.equal(next.market[cardIndex].id, character.id);
});

test("buildings enter the neighborhood and can later consume workers and Spyrium", () => {
  const { game, ownerId, slot } = activationState();
  const worker = game.workerSlots[slot.id][0];
  const cardIndex = slot.cards[0];
  const workshop = { id: "test-workshop", period: "A", slug: "workshop", name: "Workshop", type: "building", price: 0, symbols: ["factory"], points: 2, actions: [{ workers: 1, spyrium: 1, gainScore: 3 }], tokens: [] };
  const prepared = { ...game, market: game.market.map((card, index) => index === cardIndex ? workshop : card) };
  let next = activateMarketCard(prepared, ownerId, worker.id, cardIndex);
  assert.equal(next.players.find((player) => player.id === ownerId).buildings[0].id, workshop.id);
  next = { ...next, currentPlayerIndex: next.players.findIndex((player) => player.id === ownerId) };
  const before = next.players.find((player) => player.id === ownerId);
  const used = useBuilding(next, ownerId, workshop.id, 0);
  const after = used.players.find((player) => player.id === ownerId);
  assert.equal(after.activeWorkers, before.activeWorkers - 1);
  assert.equal(after.spyrium, before.spyrium - 1);
  assert.equal(after.score, 3);
  assert.equal(after.buildings[0].used, true);
});

test("passing the last active player advances the round and rotates first player", () => {
  const base = gameWith(2);
  const first = base.firstPlayerIndex;
  const last = (first + 1) % 2;
  const prepared = {
    ...base,
    currentPlayerIndex: last,
    players: base.players.map((player, index) => ({ ...player, phase: "activation", passed: index === first })),
  };
  const next = pass(prepared, prepared.players[last].id);
  assert.equal(next.round, 2);
  assert.equal(next.firstPlayerIndex, last);
  assert.equal(currentPlayer(next).id, next.players[last].id);
  assert.ok(next.players.every((player) => player.phase === "placement" && !player.passed));
  assert.ok(next.players.every((player) => player.money === 12));
});

test("crossing eight points pauses for the selected milestone bonus", () => {
  const { game, ownerId, slot } = activationState();
  const worker = game.workerSlots[slot.id][0];
  const cardIndex = slot.cards[0];
  const adviser = { id: "big-adviser", period: "A", slug: "adviser", name: "Adviser", type: "character", price: 0, description: "Gain 3 VP.", token: false, tokens: [] };
  const prepared = {
    ...game,
    market: game.market.map((card, index) => index === cardIndex ? adviser : card),
    players: game.players.map((player) => player.id === ownerId ? { ...player, score: 6 } : player),
  };
  const scored = activateMarketCard(prepared, ownerId, worker.id, cardIndex);
  assert.equal(scored.pendingBonus.playerId, ownerId);
  const rewarded = chooseBonus(scored, ownerId, "worker");
  const player = rewarded.players.find((item) => item.id === ownerId);
  assert.equal(player.totalWorkers, 4);
  assert.equal(rewarded.pendingBonus, null);
});

test("final projection includes buildings and capped technique scoring", () => {
  const player = {
    score: 10,
    money: 20,
    spyrium: 9,
    totalWorkers: 5,
    residence: 2,
    keptTokens: 0,
    buildings: [{ points: 6, symbols: ["residence"] }],
    techniques: [{ slug: "automation" }, { slug: "capitalization" }],
  };
  assert.equal(projectedFinalScore(player), 30);
});

test("a computer industrialist always performs a legal action", () => {
  const lobby = addComputerPlayer(lobbyWith(1), { id: "bot-1", name: "Brunel" });
  const base = startGame(lobby, () => 0.2);
  const botIndex = base.players.findIndex((player) => player.id === "bot-1");
  const game = { ...base, currentPlayerIndex: botIndex };
  const next = runComputerTurn(game, () => 0.8);
  assert.notEqual(next, game);
  assert.ok(playerMarketWorkers(next, "bot-1") > 0 || next.players[botIndex].phase === "activation");
});

test("a worker whose neighbouring cards are gone can still be withdrawn", () => {
  // Regression: withdrawal was validated against the cards still adjacent to
  // the worker, so buying both neighbours stranded it — its owner could not
  // withdraw (no live card) and could not pass (board not empty). The seat was
  // stuck for good, computer or human.
  const game = gameWith(2);
  const actor = currentPlayer(game);
  const placed = placeWorker(game, actor.id, "v-0-1");
  const worker = Object.values(placed.workerSlots).flat().find((item) => item.playerId === actor.id);
  assert.ok(worker, "the worker is on the board");

  // Hand the turn back to that player, in the activation phase, with both of
  // the cards beside their worker already bought.
  const stranded = {
    ...placed,
    currentPlayerIndex: placed.players.findIndex((player) => player.id === actor.id),
    market: placed.market.map((card, index) => ([1, 4].includes(index) ? null : card)),
    players: placed.players.map((player) => (
      player.id === actor.id ? { ...player, phase: "activation", passed: false } : player
    )),
  };

  assert.deepEqual(workerAdjacentCardIndexes(stranded, "v-0-1", worker), [], "no live card remains beside the worker");
  assert.equal(pass(stranded, actor.id), stranded, "passing is still refused while a worker is on the board");

  const withdrawn = gainMoney(stranded, actor.id, worker.id, 1);
  assert.notEqual(withdrawn, stranded, "withdrawing the worker must remain possible");
  assert.equal(playerMarketWorkers(withdrawn, actor.id), 0);
});

test("all-computer games always reach an end", () => {
  // The market/bot combination could produce a state where runComputerTurn
  // returned the game unchanged forever.
  for (let players = 2; players <= 5; players += 1) {
    let game = createLobby({ id: "p1", name: "P1" }, "TEST1", 1);
    for (let index = 1; index < players; index += 1) game = addComputerPlayer(game);
    game.players[0].isComputer = true;
    let seed = players * 7919;
    const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    game = startGame(game, rng);

    let steps = 0;
    while (game.phase === "playing" && steps < 5000) {
      const next = runComputerTurn(game, rng);
      assert.notEqual(next, game, `${players}-player game stalled at step ${steps}`);
      game = next;
      steps += 1;
    }
    assert.equal(game.phase, "finished", `${players}-player game did not finish`);
  }
});
