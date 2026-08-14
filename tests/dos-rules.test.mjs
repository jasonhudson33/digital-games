import test from "node:test";
import assert from "node:assert/strict";
import {
  callDos, cardPoints, catchDos, createDeck, drawCard, endTurn, matchOptions, placeCenterCard,
  playMatch, runComputerStep,
} from "../lib/dos.js";

const noShuffle = () => 0.999999;
const number = (id, color, value) => ({ id, type: "number", color, value });
const wildDos = (id) => ({ id, type: "wildDos", color: null, value: 2 });
const wildNumber = (id, color) => ({ id, type: "wildNumber", color, value: null });
function player(id, cards, overrides = {}) { return { id, name: id, isComputer: false, cards, score: 0, dosSafe: false, ...overrides }; }
function playing(overrides = {}) {
  return {
    roomCode: "DOSSS", hostId: "p1", phase: "playing", round: 1, targetScore: 200,
    players: [player("p1", [number("r3", "red", 3), number("b4", "blue", 4), number("r4", "red", 4)]), player("p2", [number("g8", "green", 8)])],
    deck: [number("y1", "yellow", 1), number("g5", "green", 5), number("b6", "blue", 6)],
    discard: [], centerRow: [number("r7", "red", 7), number("b9", "blue", 9)], dealerIndex: 1,
    currentPlayerIndex: 0, turn: { playerId: "p1", matchedCount: 0, bonusCount: 0, drawn: false, placementRemaining: 0 },
    winnerId: null, roundWinnerId: null, missedDosPlayerId: null, log: [], ...overrides,
  };
}

test("classic DOS deck has the official 108 cards", () => {
  const deck = createDeck(noShuffle);
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((card) => card.type === "number").length, 88);
  assert.equal(deck.filter((card) => card.type === "wildNumber").length, 8);
  assert.equal(deck.filter((card) => card.type === "wildDos").length, 12);
});

test("single matches use equal numbers and double matches use sums", () => {
  const game = playing();
  const options = matchOptions(game, "p1");
  assert.ok(options.some((option) => option.centerCardId === "r7" && option.handCardIds.includes("r3") && option.handCardIds.includes("b4")));
  assert.ok(!options.some((option) => option.centerCardId === "b9" && option.handCardIds.length === 1));
});

test("single and double color matches earn official bonuses", () => {
  const singleGame = playing({ players: [player("p1", [number("r7-hand", "red", 7), number("x", "blue", 1)]), player("p2", [number("g8", "green", 8)])] });
  const single = matchOptions(singleGame, "p1").find((option) => option.handCardIds.includes("r7-hand"));
  assert.equal(single.colorBonus, "single");
  assert.equal(playMatch(singleGame, "p1", single.id).turn.bonusCount, 1);

  const doubleGame = playing({ players: [player("p1", [number("r3", "red", 3), number("r4", "red", 4), number("x", "blue", 1)]), player("p2", [number("g8", "green", 8)])] });
  const double = matchOptions(doubleGame, "p1").find((option) => option.centerCardId === "r7" && option.handCardIds.length === 2);
  const next = playMatch(doubleGame, "p1", double.id, noShuffle);
  assert.equal(double.colorBonus, "double");
  assert.equal(next.players[1].cards.length, 2);
  assert.equal(next.turn.bonusCount, 1);
});

test("Wild DOS is 2 of any color and Wild Number is 1 through 10", () => {
  const game = playing({ players: [player("p1", [number("r5", "red", 5), wildDos("dos"), wildNumber("hash", "blue")]), player("p2", [number("g8", "green", 8)])] });
  const options = matchOptions(game, "p1");
  assert.ok(options.some((option) => option.centerCardId === "r7" && option.handCardIds.includes("r5") && option.handCardIds.includes("dos") && option.colorBonus === "double"));
  assert.ok(options.some((option) => option.centerCardId === "b9" && option.handCardIds.includes("hash") && option.handCardIds.length === 1));
});

test("drawing without a match requires placing a card in the center", () => {
  const game = playing({ players: [player("p1", [number("g2", "green", 2)]), player("p2", [number("g8", "green", 8)])] });
  const drawn = drawCard(game, "p1", noShuffle);
  const ending = endTurn(drawn, "p1", noShuffle);
  assert.equal(ending.turn.placementRemaining, 1);
  const placed = placeCenterCard(ending, "p1", "g2");
  assert.equal(placed.currentPlayerIndex, 1);
  assert.ok(placed.centerRow.some((card) => card.id === "g2"));
});

test("calling DOS protects two cards; a missed call costs two", () => {
  const game = playing({ players: [player("p1", [number("a", "red", 1), number("b", "blue", 3)]), player("p2", [number("g8", "green", 8)])], missedDosPlayerId: "p1" });
  const safe = callDos(game, "p1");
  assert.equal(safe.players[0].dosSafe, true);
  assert.equal(safe.missedDosPlayerId, null);
  const caught = catchDos(game, "p2", noShuffle);
  assert.equal(caught.players[0].cards.length, 4);
});

test("official wild scoring is 20 and 40", () => {
  assert.equal(cardPoints(wildDos("d")), 20);
  assert.equal(cardPoints(wildNumber("h", "red")), 40);
});

test("computer players make a legal match", () => {
  const game = playing({ players: [player("bot", [number("r3", "red", 3), number("b4", "blue", 4), number("x", "green", 1)], { isComputer: true }), player("p2", [number("g8", "green", 8)])], turn: { playerId: "bot", matchedCount: 0, bonusCount: 0, drawn: false, placementRemaining: 0 } });
  const next = runComputerStep(game, noShuffle);
  assert.equal(next.players[0].cards.length, 1);
  assert.equal(next.turn.matchedCount, 1);
});

test("a computer calls DOS before another computer can catch it", () => {
  const game = playing({
    players: [player("bot", [number("a", "red", 1), number("b", "blue", 3)], { isComputer: true }), player("catcher", [number("g8", "green", 8)], { isComputer: true })],
    turn: { playerId: "bot", matchedCount: 0, bonusCount: 0, drawn: false, placementRemaining: 0 },
    missedDosPlayerId: "bot",
  });
  const next = runComputerStep(game, noShuffle);
  assert.equal(next.players[0].dosSafe, true);
  assert.equal(next.missedDosPlayerId, null);
});
