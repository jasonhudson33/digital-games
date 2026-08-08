import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseScumCardSelection,
  createScumDeck,
  createScumGame,
  getLegalScumPlays,
  getScumDeckCount,
  passScumTurn,
  playScumCards,
  startNextScumRound,
} from "../lib/scum.js";

const still = () => 0;

test("each deck has 52 suited cards and two Jokers", () => {
  const deck = createScumDeck(2);
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((card) => card.rank === 15).length, 4);
  assert.equal(deck.filter((card) => card.rank === 2).length, 8);
});

test("the game uses one deck for every four players", () => {
  assert.equal(getScumDeckCount(4), 1);
  assert.equal(getScumDeckCount(5), 2);
  assert.equal(getScumDeckCount(8), 2);
  assert.equal(getScumDeckCount(9), 3);

  const game = createScumGame({ playerCount: 9, random: still });
  assert.equal(game.players.length, 9);
  assert.equal(game.deckCount, 3);
  assert.equal(game.players.reduce((total, player) => total + player.hand.length, 0), 162);
});

test("the player to the dealer's left starts the first round", () => {
  const game = createScumGame({ playerCount: 6, dealerIndex: 2, random: still });
  assert.equal(game.currentPlayerIndex, 3);
  assert.match(game.message, /to their left, leads/);
});

test("twos are lowest and Jokers are highest", () => {
  const base = createScumGame({ random: still });
  const game = {
    ...base,
    currentPlayerIndex: 0,
    pile: { rank: 14, count: 1, cards: [], playerIndex: 3 },
    players: base.players.map((player, index) => index === 0 ? {
      ...player,
      hand: [
        { id: "two", rank: 2, suit: "clubs" },
        { id: "joker", rank: 15, suit: "joker-black" },
      ],
    } : player),
  };

  const legal = getLegalScumPlays(game, 0);
  assert.deepEqual(legal.map((play) => play[0].id), ["joker"]);
});

test("the reigning President starts every later round", () => {
  const base = createScumGame({ playerCount: 6, random: still });
  const finished = {
    ...base,
    phase: "finished",
    standings: [4, 2, 0, 1, 3, 5],
    players: base.players.map((player, index) => ({
      ...player,
      hand: [],
      place: [3, 4, 2, 5, 1, 6][index],
    })),
  };

  const next = startNextScumRound(finished, still);
  assert.equal(next.roundNumber, 2);
  assert.equal(next.currentPlayerIndex, 4);
  assert.equal(next.players[4].title, "President");
  assert.match(next.message, /President, leads the new round/);
});

test("a response must match the set size and beat its rank", () => {
  const base = createScumGame({ random: still });
  const game = {
    ...base,
    currentPlayerIndex: 0,
    pile: { rank: 7, count: 2, cards: [], playerIndex: 3 },
    players: base.players.map((player, index) => index === 0 ? {
      ...player,
      hand: [
        { id: "6-clubs", rank: 6, suit: "clubs" },
        { id: "8-clubs", rank: 8, suit: "clubs" },
        { id: "8-hearts", rank: 8, suit: "hearts" },
      ],
    } : player),
  };

  const legal = getLegalScumPlays(game, 0);
  assert.equal(legal.length, 1);
  assert.deepEqual(legal[0].map((card) => card.rank), [8, 8]);
});

test("four of a kind burns the pile and keeps the lead", () => {
  const cards = ["clubs", "diamonds", "hearts", "spades"].map((suit) => ({
    id: `9-${suit}`,
    rank: 9,
    suit,
  }));
  const base = createScumGame({ random: still });
  const game = {
    ...base,
    currentPlayerIndex: 0,
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: [...cards, { id: "10-clubs", rank: 10, suit: "clubs" }] } : player),
  };

  const next = playScumCards(game, 0, cards.map((card) => card.id));
  assert.equal(next.pile, null);
  assert.equal(next.currentPlayerIndex, 0);
});

test("when everyone else passes, the last player takes the table", () => {
  const base = createScumGame({ random: still });
  let game = { ...base, currentPlayerIndex: 1, lastPlayerIndex: 0, pile: { rank: 5, count: 1, cards: [], playerIndex: 0 } };
  game = passScumTurn(game, 1);
  game = passScumTurn(game, 2);
  game = passScumTurn(game, 3);

  assert.equal(game.pile, null);
  assert.equal(game.currentPlayerIndex, 0);
  assert.deepEqual(game.passed, []);
});

test("selecting one card on a triple pile selects three matching cards", () => {
  const hand = [
    { id: "8-clubs", rank: 8, suit: "clubs" },
    { id: "8-diamonds", rank: 8, suit: "diamonds" },
    { id: "8-hearts", rank: 8, suit: "hearts" },
    { id: "9-clubs", rank: 9, suit: "clubs" },
  ];

  assert.deepEqual(
    chooseScumCardSelection(hand, "8-hearts", [], 3),
    ["8-clubs", "8-diamonds", "8-hearts"]
  );
});

test("the first set size stays locked for every response", () => {
  const base = createScumGame({ random: still });
  const pair = [
    { id: "5-clubs", rank: 5, suit: "clubs" },
    { id: "5-hearts", rank: 5, suit: "hearts" },
  ];
  const response = [
    { id: "8-clubs", rank: 8, suit: "clubs" },
    { id: "8-hearts", rank: 8, suit: "hearts" },
  ];
  let game = {
    ...base,
    currentPlayerIndex: 0,
    players: base.players.map((player, index) =>
      index === 0 ? { ...player, hand: [...pair, { id: "6-clubs", rank: 6, suit: "clubs" }] }
        : index === 1 ? { ...player, hand: response }
          : player
    ),
  };

  game = playScumCards(game, 0, pair.map((card) => card.id));
  assert.equal(game.pile.count, 2);
  assert.equal(playScumCards(game, 1, ["8-clubs"]), game);
  game = playScumCards(game, 1, response.map((card) => card.id));
  assert.equal(game.pile.count, 2);
});
