import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PLAYERS, SUITS, canGoOutWithDiscard, cardPoints, createDeck, createLobby, drawCard, findMeldGroups, isWild, layDownMeld, startGame } from "../lib/five-crowns.js";

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
  const game = {
    phase: "playing", currentPlayerIndex: 0, turnDrawn: true, wildRank: 3, outPlayerId: "other", finalTurnIds: ["p0"],
    players: [{ id: "p0", hand: [{ id: "a", rank: 9, suit: "stars", type: "normal" }, { id: "b", rank: 9, suit: "hearts", type: "normal" }, { id: "c", rank: 9, suit: "clubs", type: "normal" }], melds: [] }],
  };
  const next = layDownMeld(game, "p0", ["a", "b", "c"]);
  assert.equal(next.players[0].hand.length, 0);
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
