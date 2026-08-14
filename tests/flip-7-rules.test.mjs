import test from "node:test";
import assert from "node:assert/strict";
import {
  addComputerPlayer,
  calculateRoundScore,
  chooseActionTarget,
  createDeck,
  createLobby,
  flipCard,
  hasSecondChance,
  numberCards,
  runComputerStep,
  startGame,
  stay,
} from "../lib/flip-7.js";

const noShuffle = () => 0.999999;
const number = (value, id = `n-${value}`) => ({ id, type: "number", value });
const modifier = (modifierType, value, id = `m-${modifierType}-${value}`) => ({ id, type: "modifier", modifier: modifierType, value });
const action = (actionType, id = `a-${actionType}`) => ({ id, type: "action", action: actionType });

function player(id, name, cards = [], overrides = {}) {
  return { id, name, isComputer: false, cards, status: "active", score: 0, ...overrides };
}

function playing(overrides = {}) {
  return {
    roomCode: "FLIP7",
    hostId: "p1",
    phase: "playing",
    stage: "turns",
    players: [player("p1", "Avery", [number(1)]), player("p2", "Blake", [number(2)])],
    deck: [number(3), number(4), number(5)],
    discard: [],
    dealerIndex: 1,
    currentPlayerIndex: 0,
    initialQueue: [],
    pendingTarget: null,
    forced: null,
    round: 1,
    roundScores: {},
    flipSevenId: null,
    winnerId: null,
    targetScore: 200,
    log: [],
    ...overrides,
  };
}

test("the official deck contains 94 cards in the printed distribution", () => {
  const deck = createDeck(noShuffle);
  assert.equal(deck.length, 94);
  assert.equal(deck.filter((card) => card.type === "number").length, 79);
  assert.equal(deck.filter((card) => card.type === "number" && card.value === 0).length, 1);
  assert.equal(deck.filter((card) => card.type === "number" && card.value === 7).length, 7);
  assert.equal(deck.filter((card) => card.type === "number" && card.value === 12).length, 12);
  assert.equal(deck.filter((card) => card.type === "modifier").length, 6);
  assert.equal(deck.filter((card) => card.action === "freeze").length, 3);
  assert.equal(deck.filter((card) => card.action === "flip3").length, 3);
  assert.equal(deck.filter((card) => card.action === "secondChance").length, 3);
});

test("every player receives one mandatory opening card before choices begin", () => {
  let lobby = createLobby({ id: "p1", name: "Avery" }, "OPEN7", 1);
  lobby = addComputerPlayer(lobby);
  const game = startGame(lobby, noShuffle);
  assert.equal(game.phase, "playing");
  assert.equal(game.stage, "turns");
  assert.ok(game.players.every((item) => item.cards.length === 1));
  assert.equal(game.currentPlayerIndex, 0);
});

test("score doubles number cards before adding plus modifiers", () => {
  const scorer = player("p1", "Avery", [number(6), number(10), modifier("multiply", 2), modifier("plus", 10)]);
  assert.equal(calculateRoundScore(scorer), 42);
  assert.equal(calculateRoundScore({ ...scorer, status: "busted" }), 0);
});

test("staying banks the line and advances to the next active player", () => {
  const game = playing();
  const next = stay(game, "p1");
  assert.equal(next.players[0].status, "stayed");
  assert.equal(next.currentPlayerIndex, 1);
  assert.equal(next.phase, "playing");
});

test("a duplicate busts unless a Second Chance discards it", () => {
  const busted = flipCard(playing({ deck: [number(1, "duplicate")] }), "p1", noShuffle);
  assert.equal(busted.players[0].status, "busted");
  assert.equal(busted.currentPlayerIndex, 1);

  const protectedGame = playing({
    players: [player("p1", "Avery", [number(1), action("secondChance", "shield")]), player("p2", "Blake", [number(2)])],
    deck: [number(1, "duplicate")],
  });
  const protectedNext = flipCard(protectedGame, "p1", noShuffle);
  assert.equal(protectedNext.players[0].status, "active");
  assert.equal(numberCards(protectedNext.players[0]).length, 1);
  assert.equal(hasSecondChance(protectedNext.players[0]), false);
  assert.equal(protectedNext.discard.length, 2);
});

test("Freeze lets its recipient choose any active player to stay", () => {
  const drawn = flipCard(playing({ deck: [action("freeze")] }), "p1", noShuffle);
  assert.equal(drawn.pendingTarget.action, "freeze");
  assert.equal(drawn.pendingTarget.chooserId, "p1");
  const frozen = chooseActionTarget(drawn, "p1", "p2", noShuffle);
  assert.equal(frozen.players[1].status, "stayed");
  assert.equal(frozen.currentPlayerIndex, 0);
});

test("a player frozen before their opening deal stays with zero cards", () => {
  const game = playing({
    stage: "initial",
    players: [player("p1", "Avery", [number(1)]), player("p2", "Blake")],
    deck: [number(8)],
    dealerIndex: 1,
    initialQueue: ["p2"],
    pendingTarget: { action: "freeze", chooserId: "p1", card: null, resume: { kind: "initial" } },
  });
  const next = chooseActionTarget(game, "p1", "p2", noShuffle);
  assert.equal(next.players[1].status, "stayed");
  assert.equal(next.players[1].cards.length, 0);
  assert.equal(next.stage, "turns");
  assert.equal(next.currentPlayerIndex, 0);
});

test("Flip Three forces exactly three cards and then resumes normal order", () => {
  const game = playing({ deck: [action("flip3"), number(4), modifier("plus", 6), number(8)] });
  const drawn = flipCard(game, "p1", noShuffle);
  const resolved = chooseActionTarget(drawn, "p1", "p2", noShuffle);
  assert.deepEqual(resolved.players[1].cards.map((card) => card.type === "number" ? card.value : `+${card.value}`), [2, 4, "+6", 8]);
  assert.equal(resolved.currentPlayerIndex, 1);
  assert.equal(resolved.forced, null);
});

test("seven unique numbers immediately ends the round with a 15 point bonus", () => {
  const cards = [0, 1, 2, 3, 4, 5].map((value) => number(value, `held-${value}`));
  const game = playing({ players: [player("p1", "Avery", cards), player("p2", "Blake", [number(12)])], deck: [number(6, "seventh")] });
  const next = flipCard(game, "p1", noShuffle);
  assert.equal(next.phase, "roundEnd");
  assert.equal(next.flipSevenId, "p1");
  assert.equal(next.roundScores.p1, 36);
  assert.equal(next.roundScores.p2, 12);
});

test("computer players make a legal flip-or-stay decision", () => {
  const game = playing({ players: [player("p1", "Lucky", [number(2)], { isComputer: true }), player("p2", "Blake", [number(4)])] });
  const next = runComputerStep(game, noShuffle);
  assert.equal(numberCards(next.players[0]).length, 2);
  assert.equal(next.currentPlayerIndex, 1);
});
