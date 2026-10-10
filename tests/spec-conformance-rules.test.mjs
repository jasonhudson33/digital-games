import assert from "node:assert/strict";
import test from "node:test";

import * as flip7 from "../lib/flip-7.js";
import * as fiveCrowns from "../lib/five-crowns.js";
import * as hearts from "../lib/hearts.js";
import * as noThanks from "../lib/no-thanks.js";
import * as splendor from "../lib/splendor.js";
import * as sequence from "../lib/sequence.js";
import * as dominion from "../lib/dominion.js";
import * as qwirkle from "../lib/qwirkle.js";

// More engine facts pinned for openspec/changes/baseline-platform-and-game-specs/specs/games.

test("Flip 7 round score: number total, x2, plus modifiers and the 15-point Flip 7 bonus", () => {
  const number = (value, i) => ({ id: `n${i}`, type: "number", value });
  const cards = [number(10, 1), number(6, 2), number(4, 3),
    { id: "m", type: "modifier", modifier: "multiply" },
    { id: "p", type: "modifier", modifier: "plus", value: 4 }];
  const player = { status: "stayed", cards };
  assert.equal(flip7.calculateRoundScore(player), 44);
  assert.equal(flip7.calculateRoundScore(player, true), 59);
  assert.equal(flip7.calculateRoundScore({ ...player, status: "busted" }), 0);
});

test("Five Crowns wild ranks and card points", () => {
  const game = { wildRank: 5 };
  assert.equal(fiveCrowns.isWild(game, { type: "joker" }), true);
  assert.equal(fiveCrowns.isWild(game, { type: "normal", rank: 5, suit: "hearts" }), true);
  assert.equal(fiveCrowns.isWild(game, { type: "normal", rank: 6, suit: "hearts" }), false);
  assert.equal(fiveCrowns.cardPoints(game, { type: "joker" }), 50);
  assert.equal(fiveCrowns.cardPoints(game, { type: "normal", rank: 5 }), 20);
  assert.equal(fiveCrowns.cardPoints(game, { type: "normal", rank: 9 }), 9);
  assert.equal(fiveCrowns.createDeck().length, 2 * (5 * 11 + 3));
  assert.equal(fiveCrowns.LAST_ROUND, 11);
});

test("Hearts variants, passing cycles, card points and Killer cancellation", () => {
  assert.deepEqual(hearts.getPassCycle(3), ["left", "right", "hold"]);
  assert.deepEqual(hearts.getPassCycle(4), ["left", "right", "across", "hold"]);
  assert.equal(hearts.cardPoints({ suit: "hearts", rank: 5 }), 1);
  assert.equal(hearts.cardPoints({ suit: "spades", rank: 12 }), 13);
  assert.equal(hearts.cardPoints({ suit: "clubs", rank: 12 }), 0);
  assert.equal(hearts.createHeartsMatch({ variant: "killer", playerCount: 5 }).roundPenaltyTotal, 52);
  assert.equal(hearts.createHeartsMatch({ variant: "classic", playerCount: 3 }).roundPenaltyTotal, 26);
  const trick = [
    { playerIndex: 0, card: { suit: "hearts", rank: 14 } },
    { playerIndex: 1, card: { suit: "hearts", rank: 14 } },
    { playerIndex: 2, card: { suit: "hearts", rank: 10 } },
  ];
  assert.equal(hearts.getTrickWinner(trick, true), 2);
  assert.notEqual(hearts.getTrickWinner(trick, false), 2);
});

test("No Thanks! scores only the lowest card of each run and subtracts chips", () => {
  assert.equal(noThanks.cardScore([20, 21, 22]), 20);
  assert.equal(noThanks.cardScore([20, 22, 23, 30]), 20 + 22 + 30);
  assert.equal(noThanks.finalScore({ cards: [20, 21, 22], chips: 4 }), 16);
  let lobby = noThanks.createLobby({ id: "a", name: "A" }, "ABCDE");
  for (const id of ["b", "c"]) lobby = noThanks.addPlayer(lobby, { id, name: id });
  const game = noThanks.startGame(lobby);
  assert.equal(game.deck.length + 1, 24);
});

test("Splendor setup tokens by table size", () => {
  const start = (count) => {
    let game = splendor.createLobby({ id: "p0", name: "P0" }, "ABCDE");
    for (let i = 1; i < count; i += 1) game = splendor.addPlayer(game, { id: `p${i}`, name: `P${i}` });
    return splendor.startGame(game);
  };
  for (const [count, colored] of [[2, 4], [3, 5], [4, 7]]) {
    const { bank } = start(count);
    assert.equal(bank.gold, 5);
    assert.equal(bank.red ?? bank.ruby, colored);
  }
});

test("Sequence hand sizes and team splits", () => {
  const expected = { 2: 7, 3: 6, 4: 6, 6: 5, 8: 4, 9: 4, 10: 3, 12: 3 };
  for (const [count, size] of Object.entries(expected)) assert.equal(sequence.handSizeFor(Number(count)), size);
  assert.deepEqual(sequence.compatibleTeamCounts(2), [2]);
  assert.deepEqual(sequence.compatibleTeamCounts(3), [3]);
  assert.deepEqual(sequence.compatibleTeamCounts(6), [2, 3]);
  assert.deepEqual(sequence.compatibleTeamCounts(8), [2]);
});

test("Dominion scoring and tie-break by fewer turns", () => {
  const player = (id, cards, turns) => ({ id, name: id, deck: cards, hand: [], discard: [], inPlay: [], turnsTaken: turns });
  const base = { phase: "playing", pendingChoice: null, log: [], players: [
    player("a", ["province", "duchy", "estate", "curse"], 10),
    player("b", ["province", "duchy", "estate", "curse"], 9),
  ] };
  const done = dominion.finishGame(base);
  assert.equal(done.scores.a, 9);
  assert.deepEqual(done.winners, ["b"]);
  const tied = dominion.finishGame({ ...base, players: base.players.map((p) => ({ ...p, turnsTaken: 9 })) });
  assert.deepEqual(tied.winners.sort(), ["a", "b"]);
});

test("Qwirkle bag has 108 tiles", () => {
  assert.equal(qwirkle.createTileBag().length, 108);
});
