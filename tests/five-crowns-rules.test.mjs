import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PLAYERS, SUITS, addComputerPlayer, canGoOutWithDiscard, cardPoints, createDeck, createLobby, discardCard, drawCard, findMeldGroups, isWild, layDownMeld, runComputerStep, startGame, startNextRound } from "../lib/five-crowns.js";

const players = (count) => Array.from({ length: count }, (_, index) => ({ id: `p${index}`, name: `Player ${index + 1}` }));

test("Five Crowns uses two five-suited decks with six jokers", () => {
  const deck = createDeck(() => 0.5);
  assert.equal(deck.length, 116);
  assert.deepEqual(new Set(deck.filter((card) => card.type === "normal").map((card) => card.suit)), new Set(SUITS));
  assert.equal(deck.filter((card) => card.type === "joker").length, 6);
});

test("rounds deal three through thirteen cards and rotate the wild rank", () => {
  let game = createLobby(players(2)[0], "CROWN");
  game = { ...game, players: players(2).map((player) => ({ ...player, hand: [], roundScore: null })), totalScores: { p0: 0, p1: 0 } };
  game = startGame(game, () => 0.2);
  assert.equal(game.players[0].hand.length, 3);
  assert.equal(game.wildRank, 3);
  assert.equal(game.players.length, MAX_PLAYERS - 5);
});

test("books and runs accept wild cards and jokers", () => {
  const game = { wildRank: 7 };
  const book = [{ id: "a", rank: 9, suit: "stars", type: "normal" }, { id: "b", rank: 9, suit: "hearts", type: "normal" }, { id: "w", rank: 7, suit: "clubs", type: "normal" }];
  const run = [{ id: "c", rank: 5, suit: "spades", type: "normal" }, { id: "d", rank: 6, suit: "spades", type: "normal" }, { id: "w2", rank: 7, suit: "hearts", type: "normal" }];
  assert.equal(findMeldGroups(game, [...book, ...run]).length, 2);
  assert.equal(isWild(game, book[2]), true);
  assert.equal(cardPoints(game, book[2]), 20);
});

test("only the active player may draw, and each turn permits one card up to the hand cap", () => {
  let game = createLobby(players(2)[0], "DRAW");
  game = { ...game, players: players(2).map((player) => ({ ...player, hand: [], melds: [], roundScore: null })), totalScores: { p0: 0, p1: 0 } };
  game = startGame(game, () => 0.2);
  const active = game.players[game.currentPlayerIndex].id;
  const other = game.players.find((player) => player.id !== active).id;
  assert.deepEqual(drawCard(game, other), game);
  const drawn = drawCard(game, active);
  assert.equal(drawn.players.find((player) => player.id === active).hand.length, 4);
  assert.equal(drawn.turnDrawn, true);
  assert.deepEqual(drawCard(drawn, active), drawn);
});

test("a final-turn player can lay down a valid meld after drawing", () => {
  const discard = { id: "discard", rank: 13, suit: "diamonds", type: "normal" };
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: true, wildRank: 3, outPlayerId: "other", finalTurnIds: ["p0"],
    players: [{ id: "p0", hand: [{ id: "a", rank: 9, suit: "stars", type: "normal" }, { id: "b", rank: 9, suit: "hearts", type: "normal" }, { id: "c", rank: 9, suit: "clubs", type: "normal" }, discard], melds: [] }],
  };
  const next = layDownMeld(game, "p0", ["a", "b", "c"]);
  assert.deepEqual(next.players[0].hand, [discard]);
  assert.equal(next.players[0].melds.length, 1);
});

test("normal players must be able to go out before laying down, while final players may lay partial melds", () => {
  const hand = [
    { id: "discard", rank: 13, suit: "stars", type: "normal" },
    { id: "a", rank: 9, suit: "stars", type: "normal" },
    { id: "b", rank: 9, suit: "hearts", type: "normal" },
    { id: "c", rank: 9, suit: "clubs", type: "normal" },
  ];
  const normal = { phase: "playing", currentPlayerIndex: 0, turnDrawn: true, wildRank: 3, outPlayerId: null, finalTurnIds: [], players: [{ id: "p0", hand, melds: [] }] };
  assert.equal(canGoOutWithDiscard(normal, "p0", "discard"), true);
  assert.deepEqual(layDownMeld(normal, "p0", ["a", "b", "c"]), normal);
  const final = { ...normal, outPlayerId: "other", finalTurnIds: ["p0"] };
  assert.equal(layDownMeld(final, "p0", ["a", "b", "c"]).players[0].melds.length, 1);
});

test("a player gets a fresh draw when taking their final turn after someone goes out", () => {
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: false, wildRank: 3, outPlayerId: "p0", finalTurnIds: ["p1"],
    deck: [{ id: "draw", rank: 5, suit: "stars", type: "normal" }], discard: [], round: 1, roundScores: {}, totalScores: { p0: 0, p1: 0 }, log: [],
    players: [
      { id: "p0", hand: [], melds: [], name: "Out", isComputer: false },
      { id: "p1", hand: [{ id: "held", rank: 9, suit: "stars", type: "normal" }], melds: [], name: "Final", isComputer: false },
    ],
  };
  const next = drawCard({ ...game, currentPlayerIndex: 1 }, "p1");
  assert.equal(next.players[1].hand.length, 2);
  assert.equal(next.turnDrawn, true);
});

test("a turn cannot be completed before drawing", () => {
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: false, wildRank: 3, outPlayerId: null, finalTurnIds: [], discard: [],
    players: [{ id: "p0", hand: [{ id: "held", rank: 9, suit: "stars", type: "normal" }], melds: [] }],
  };
  assert.deepEqual(discardCard(game, "p0", "held"), game);
});

test("going out lays down the complete hand and gives final turns clockwise", () => {
  const book = ["a", "b", "c"].map((id, index) => ({ id, rank: 9, suit: SUITS[index], type: "normal" }));
  const game = {
    phase: "playing", currentPlayerIndex: 2, turnDrawn: true, wildRank: 3, outPlayerId: null, finalTurnIds: [],
    discard: [], round: 1, roundScores: {}, totalScores: { p0: 0, p1: 0, p2: 0, p3: 0 }, log: [],
    players: ["p0", "p1", "p2", "p3"].map((id, index) => ({
      id, name: id, isComputer: false, melds: [],
      hand: index === 2 ? [...book, { id: "discard", rank: 13, suit: "stars", type: "normal" }] : [],
    })),
  };
  const next = discardCard(game, "p2", "discard");
  assert.equal(next.outPlayerId, "p2");
  assert.deepEqual(next.finalTurnIds, ["p3", "p0", "p1"]);
  assert.equal(next.currentPlayerIndex, 3);
  assert.equal(next.players[2].hand.length, 0);
  assert.equal(next.players[2].melds.length, 1);
});

test("a final-turn discard always advances and scores the player", () => {
  const book = ["a", "b", "c"].map((id, index) => ({ id, rank: 9, suit: SUITS[index], type: "normal" }));
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: true, wildRank: 3, outPlayerId: "p1", finalTurnIds: ["p0"],
    discard: [], round: 1, roundScores: {}, totalScores: { p0: 0, p1: 0 }, log: [],
    players: [
      { id: "p0", name: "Final", isComputer: false, hand: [...book, { id: "discard", rank: 13, suit: "stars", type: "normal" }], melds: [] },
      { id: "p1", name: "Out", isComputer: false, hand: [], melds: [] },
    ],
  };
  const next = discardCard(game, "p0", "discard");
  assert.equal(next.phase, "roundEnd");
  assert.equal(next.roundScores.p0, 27);
  assert.equal(next.finalTurnIds.length, 0);
});

test("a final-turn meld must leave one card available to discard", () => {
  const book = ["a", "b", "c"].map((id, index) => ({ id, rank: 9, suit: SUITS[index], type: "normal" }));
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: true, wildRank: 3, outPlayerId: "p1", finalTurnIds: ["p0"],
    players: [{ id: "p0", hand: book, melds: [] }],
  };
  assert.deepEqual(layDownMeld(game, "p0", book.map((card) => card.id)), game);
});

test("an empty draw pile is replenished without moving the top discard", () => {
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: false, wildRank: 3, outPlayerId: null, finalTurnIds: [], deck: [],
    discard: [
      { id: "old-a", rank: 4, suit: "stars", type: "normal" },
      { id: "old-b", rank: 5, suit: "hearts", type: "normal" },
      { id: "top", rank: 6, suit: "clubs", type: "normal" },
    ],
    players: [{ id: "p0", hand: [{ id: "held", rank: 9, suit: "stars", type: "normal" }], melds: [] }],
  };
  const next = drawCard(game, "p0", () => 0.5);
  assert.equal(next.players[0].hand.length, 2);
  assert.deepEqual(next.discard.map((card) => card.id), ["top"]);
  assert.equal(next.deck.length, 1);
});

test("computer players complete all eleven rounds without stalling", () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let game = createLobby({ id: "bot-host", name: "Bot Host", isComputer: true }, "BOTS", 1);
  game = addComputerPlayer(game);
  game = startGame(game, rng);
  let steps = 0;
  while (game.phase !== "finished" && steps < 1000) {
    game = game.phase === "roundEnd"
      ? startNextRound(game, game.hostId, rng)
      : runComputerStep(game, rng);
    steps += 1;
  }
  assert.equal(game.phase, "finished");
  assert.equal(game.round, 11);
  assert.ok(steps < 1000);
  assert.equal(Object.keys(game.totalScores).length, 2);
});
