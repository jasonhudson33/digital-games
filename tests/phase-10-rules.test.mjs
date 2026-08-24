import assert from "node:assert/strict";
import test from "node:test";

import {
  COLORS, MAX_PLAYERS, MIN_PLAYERS, PHASES, addComputerPlayer, cardPoints, createDeck, createLobby,
  discardCard, drawCard, eligibleSkipTargets, findPhaseLayout, hitCard, layPhase, runComputerTurn,
  startGame, startNextRound, takeDiscard,
} from "../lib/phase-10.js";

const n = (id, number, color = "red") => ({ id, type: "number", number, color });
const wild = (id = "w") => ({ id, type: "wild", number: null, color: null });
const skip = (id = "s") => ({ id, type: "skip", number: null, color: null });

function lobby(count = 2) {
  let game = createLobby({ id: "p0", name: "Player 1" }, "PHASE", 1);
  for (let index = 1; index < count; index += 1) game = addComputerPlayer(game);
  return game;
}

test("the deck has two of every 1-12 color card, eight Wilds, and four Skips", () => {
  const deck = createDeck(() => 0.4);
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((card) => card.type === "number").length, 96);
  assert.equal(deck.filter((card) => card.type === "wild").length, 8);
  assert.equal(deck.filter((card) => card.type === "skip").length, 4);
  for (const color of COLORS) for (let number = 1; number <= 12; number += 1) {
    assert.equal(deck.filter((card) => card.color === color && card.number === number).length, 2);
  }
  assert.equal(new Set(deck.map((card) => card.id)).size, 108);
});

test("all ten official phases accept their required groups", () => {
  const examples = [
    [n("a", 3), n("b", 3), n("c", 3), n("d", 8), n("e", 8), n("f", 8)],
    [n("a", 5), n("b", 5), n("c", 5), n("d", 2), n("e", 3), n("f", 4), n("g", 5, "blue")],
    [n("a", 7), n("b", 7), n("c", 7), n("d", 7), n("e", 9), n("f", 10), n("g", 11), n("h", 12)],
    Array.from({ length: 7 }, (_, index) => n(`r${index}`, index + 2)),
    Array.from({ length: 8 }, (_, index) => n(`r${index}`, index + 1)),
    Array.from({ length: 9 }, (_, index) => n(`r${index}`, index + 3)),
    [1, 1, 1, 1, 9, 9, 9, 9].map((value, index) => n(`s${index}`, value)),
    Array.from({ length: 7 }, (_, index) => n(`c${index}`, (index % 12) + 1, "green")),
    [4, 4, 4, 4, 4, 11, 11].map((value, index) => n(`s${index}`, value)),
    [2, 2, 2, 2, 2, 10, 10, 10].map((value, index) => n(`s${index}`, value)),
  ];
  assert.equal(PHASES.length, 10);
  examples.forEach((cards, index) => assert.ok(findPhaseLayout(index + 1, cards), `Phase ${index + 1}`));
});

test("Wilds substitute in phases, but a phase needs a numbered card and cannot use Skips", () => {
  assert.ok(findPhaseLayout(1, [n("a", 4), wild("w1"), wild("w2"), n("b", 9), n("c", 9), wild("w3")]));
  assert.equal(findPhaseLayout(1, Array.from({ length: 6 }, (_, index) => wild(`w${index}`))), null);
  assert.equal(findPhaseLayout(1, [n("a", 4), n("b", 4), skip(), n("c", 9), n("d", 9), n("e", 9)]), null);
});

test("a game deals ten private cards and starts left of the dealer", () => {
  const game = startGame(lobby(3), () => 0.42);
  assert.equal(game.players.length, 3);
  assert.ok(game.players.every((player) => player.hand.length === 10));
  assert.equal(game.currentPlayerIndex, (game.dealerIndex + 1) % 3);
  assert.equal(game.deck.length, 77);
  assert.equal(game.discard.length, 1);
});

test("players draw once from either pile and may not pick up a Skip", () => {
  let game = startGame(lobby(), () => 0.42);
  const id = game.players[game.currentPlayerIndex].id;
  const drawn = drawCard(game, id);
  assert.equal(drawn.players[drawn.currentPlayerIndex].hand.length, 11);
  assert.equal(drawCard(drawn, id), drawn);
  game = { ...game, discard: [skip()] };
  assert.equal(takeDiscard(game, id), game);
});

test("laying a phase unlocks hits on sets, runs, and colors", () => {
  const cards = [n("a", 3), n("b", 3), n("c", 3), n("d", 8), n("e", 8), n("f", 8), n("hit", 3), n("keep", 12), n("x", 1), n("y", 2), n("z", 4)];
  let game = startGame(lobby(), () => 0.42);
  const id = game.players[game.currentPlayerIndex].id;
  game = { ...game, turnDrawn: true, players: game.players.map((player) => player.id === id ? { ...player, hand: cards } : player) };
  game = layPhase(game, id, ["a", "b", "c", "d", "e", "f"]);
  assert.equal(game.players[game.currentPlayerIndex].phaseLaid, true);
  game = hitCard(game, id, "hit", id, 0);
  assert.equal(game.players[game.currentPlayerIndex].laidGroups[0].cards.length, 4);
});

test("a Skip targets another player and that player cannot be skipped twice in a row", () => {
  let game = startGame(lobby(3), () => 0.42);
  const actor = game.players[game.currentPlayerIndex];
  const target = game.players[(game.currentPlayerIndex + 1) % game.players.length];
  game = { ...game, turnDrawn: true, players: game.players.map((player) => player.id === actor.id ? { ...player, hand: [...player.hand, skip("played-skip")] } : player) };
  assert.ok(eligibleSkipTargets(game, actor.id).some((player) => player.id === target.id));
  const next = discardCard(game, actor.id, "played-skip", target.id);
  assert.notEqual(next.currentPlayerIndex, game.players.findIndex((player) => player.id === target.id));
  assert.ok(next.skipProtectedIds.includes(target.id));
  assert.ok(!eligibleSkipTargets(next, next.players[next.currentPlayerIndex].id).some((player) => player.id === target.id));
});

test("round scoring uses the official card values and advances only completed phases", () => {
  assert.equal(cardPoints(n("low", 9)), 5);
  assert.equal(cardPoints(n("high", 10)), 10);
  assert.equal(cardPoints(skip()), 15);
  assert.equal(cardPoints(wild()), 25);
  let game = startGame(lobby(), () => 0.42);
  const winner = game.players[game.currentPlayerIndex];
  const other = game.players.find((player) => player.id !== winner.id);
  game = {
    ...game, turnDrawn: true,
    players: game.players.map((player) => player.id === winner.id
      ? { ...player, phaseLaid: true, hand: [n("last", 1)] }
      : { ...player, hand: [n("nine", 9), n("ten", 10), skip("skip-score"), wild("wild-score")] }),
  };
  game = discardCard(game, winner.id, "last");
  assert.equal(game.phase, "roundEnd");
  assert.equal(game.players.find((player) => player.id === winner.id).phaseNumber, 2);
  assert.equal(game.players.find((player) => player.id === other.id).phaseNumber, 1);
  assert.equal(game.roundScores[other.id], 55);
});

test("the host can add computers and deal subsequent rounds", () => {
  let game = lobby(MAX_PLAYERS);
  assert.equal(game.players.length, MAX_PLAYERS);
  assert.equal(addComputerPlayer(game), game);
  game = startGame(game, () => 0.3);
  const winner = game.players[game.currentPlayerIndex];
  game = { ...game, turnDrawn: true, players: game.players.map((player) => player.id === winner.id ? { ...player, hand: [n("last", 1)] } : player) };
  game = discardCard(game, winner.id, "last");
  assert.equal(startNextRound(game, "not-host"), game);
  assert.equal(startNextRound(game, game.hostId, () => 0.2).round, 2);
  assert.equal(MIN_PLAYERS, 2);
});

test("players tied after completing Phase 10 replay it and the first player out wins", () => {
  let game = startGame(lobby(), () => 0.42);
  const finisher = game.players[game.currentPlayerIndex];
  const rival = game.players.find((player) => player.id !== finisher.id);
  game = {
    ...game,
    turnDrawn: true,
    players: game.players.map((player) => player.id === finisher.id
      ? { ...player, phaseNumber: 10, phaseLaid: true, score: 5, hand: [n("last", 1)] }
      : { ...player, phaseNumber: 10, phaseLaid: true, score: 0, hand: [n("five", 5)] }),
  };
  game = discardCard(game, finisher.id, "last");
  assert.equal(game.phase, "roundEnd");
  assert.deepEqual(new Set(game.tieBreakerIds), new Set([finisher.id, rival.id]));

  game = startNextRound(game, game.hostId, () => 0.3);
  const tiebreakFinisher = game.players[game.currentPlayerIndex];
  game = {
    ...game,
    turnDrawn: true,
    players: game.players.map((player) => player.id === tiebreakFinisher.id
      ? { ...player, phaseLaid: true, hand: [n("tiebreak-last", 1)] }
      : player),
  };
  game = discardCard(game, tiebreakFinisher.id, "tiebreak-last");
  assert.equal(game.phase, "finished");
  assert.deepEqual(game.winners, [tiebreakFinisher.id]);
});

test("computer-only games progress through phases and terminate", () => {
  let game = lobby(3);
  game.players[0].isComputer = true;
  let seed = 71;
  const rng = () => ((seed = (seed * 48271) % 0x7fffffff) / 0x7fffffff);
  game = startGame(game, rng);
  let actions = 0;
  while (game.phase !== "finished" && actions < 15000) {
    if (game.phase === "roundEnd") game = startNextRound(game, game.hostId, rng);
    else game = runComputerTurn(game, rng);
    actions += 1;
  }
  assert.equal(game.phase, "finished", `game stalled after ${actions} actions in ${game.phase}`);
  assert.ok(game.players.some((player) => player.phaseNumber === 10));
  assert.equal(game.winners.length, 1);
});
