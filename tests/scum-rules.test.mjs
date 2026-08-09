import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseScumCardSelection,
  completeScumTrades,
  createScumDeck,
  createScumGame,
  getLegalScumPlays,
  getScumDeckCount,
  getScumTradeGroups,
  moveOnScumPile,
  passScumTurn,
  playScumCards,
  startNextScumRound,
  submitScumTrade,
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

test("class passing defaults to one group and is limited by the table size", () => {
  assert.equal(createScumGame({ random: still }).passGroupCount, 1);
  assert.equal(createScumGame({ playerCount: 4, passGroupCount: 20, random: still }).passGroupCount, 2);
});

test("passing groups pair the classes from the outside in", () => {
  assert.deepEqual(getScumTradeGroups([4, 2, 0, 1, 3, 5], 2), [
    { upperPlayerIndex: 4, lowerPlayerIndex: 5, count: 2, upperPlace: 1, lowerPlace: 6 },
    { upperPlayerIndex: 2, lowerPlayerIndex: 3, count: 1, upperPlace: 2, lowerPlace: 5 },
  ]);
});

test("the player to the dealer's left starts the first round", () => {
  const game = createScumGame({ playerCount: 6, dealerIndex: 2, random: still });
  assert.equal(game.currentPlayerIndex, 3);
  assert.deepEqual(game.turnOrder, [3, 4, 5, 0, 1, 2]);
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

test("Jokers fill missing cards in a matching set", () => {
  const base = createScumGame({ random: still });
  const wildPair = [
    { id: "eight", rank: 8, suit: "clubs" },
    { id: "wild", rank: 15, suit: "joker-black" },
  ];
  const game = {
    ...base,
    currentPlayerIndex: 0,
    pile: { rank: 7, count: 2, cards: [], playerIndex: 3 },
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: wildPair } : player),
  };

  assert.deepEqual(getLegalScumPlays(game, 0), [wildPair]);
  const next = playScumCards(game, 0, wildPair.map((card) => card.id));
  assert.equal(next.pile.rank, 8);
  assert.equal(next.pile.count, 2);
});

test("Jokers cannot combine two different natural ranks", () => {
  const base = createScumGame({ random: still });
  const cards = [
    { id: "eight", rank: 8, suit: "clubs" },
    { id: "nine", rank: 9, suit: "clubs" },
    { id: "wild", rank: 15, suit: "joker-black" },
  ];
  const game = {
    ...base,
    currentPlayerIndex: 0,
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: cards } : player),
  };

  assert.equal(playScumCards(game, 0, cards.map((card) => card.id)), game);
});

test("selecting a short triple automatically uses a Joker", () => {
  const hand = [
    { id: "queen-clubs", rank: 12, suit: "clubs" },
    { id: "queen-hearts", rank: 12, suit: "hearts" },
    { id: "wild", rank: 15, suit: "joker-black" },
  ];

  assert.deepEqual(
    chooseScumCardSelection(hand, "queen-clubs", [], 3),
    ["queen-clubs", "queen-hearts", "wild"]
  );
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
  assert.deepEqual(next.turnOrder, [4, 2, 0, 1, 3, 5]);
  assert.equal(next.players[4].title, "President");
  assert.match(next.message, /trade must finish before the President leads/);

  assert.equal(next.phase, "trading");
  const afterTrades = completeScumTrades(next);
  assert.match(afterTrades.message, /President, leads/);
  const afterPresident = playScumCards(afterTrades, 4, [afterTrades.players[4].hand[0].id]);
  assert.equal(afterPresident.currentPlayerIndex, 2);
});

test("two passing groups trade two outer cards and one inner card", () => {
  const base = createScumGame({ playerCount: 6, passGroupCount: 2, random: still });
  const finished = {
    ...base,
    phase: "finished",
    standings: [0, 1, 2, 3, 4, 5],
    players: base.players.map((player, index) => ({ ...player, hand: [], place: index + 1 })),
  };
  const trading = startNextScumRound(finished, still);
  const presidentCards = trading.players[0].hand.slice(0, 2);
  const scumBest = trading.players[5].hand.slice(-2);
  const viceLowest = trading.players[1].hand[0];
  const viceScumBest = trading.players[4].hand.at(-1);

  const next = completeScumTrades(trading, presidentCards.map((card) => card.id));
  const handIds = (playerIndex) => new Set(next.players[playerIndex].hand.map((card) => card.id));

  assert.equal(next.phase, "playing");
  assert.equal(next.currentPlayerIndex, 0);
  assert.ok(scumBest.every((card) => handIds(0).has(card.id)));
  assert.ok(presidentCards.every((card) => handIds(5).has(card.id)));
  assert.ok(handIds(1).has(viceScumBest.id));
  assert.ok(handIds(4).has(viceLowest.id));
});

test("multiplayer class trades wait for every upper player to submit", () => {
  const base = createScumGame({
    playerSeeds: Array.from({ length: 6 }, (_, index) => ({
      playerId: `player-${index}`,
      name: `Player ${index + 1}`,
    })),
    passGroupCount: 2,
    random: still,
  });
  const finished = {
    ...base,
    phase: "finished",
    standings: [0, 1, 2, 3, 4, 5],
    players: base.players.map((player, index) => ({ ...player, hand: [], place: index + 1 })),
  };
  let trading = startNextScumRound(finished, still);
  const presidentCards = trading.players[0].hand.slice(0, 2).map((card) => card.id);
  const viceCard = trading.players[1].hand.slice(0, 1).map((card) => card.id);

  trading = submitScumTrade(trading, 0, presidentCards);
  assert.equal(trading.phase, "trading");
  assert.deepEqual(trading.tradeSelections[0], presidentCards);

  const playing = submitScumTrade(trading, 1, viceCard);
  assert.equal(playing.phase, "playing");
  assert.deepEqual(playing.tradeSelections, {});
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

test("the last player may continue after everyone else passes", () => {
  const base = createScumGame({ random: still });
  let game = {
    ...base,
    currentPlayerIndex: 1,
    lastPlayerIndex: 0,
    pile: { rank: 5, count: 1, cards: [], playerIndex: 0 },
    players: base.players.map((player, index) => index === 0 ? {
      ...player,
      hand: [
        { id: "two", rank: 2, suit: "clubs" },
        { id: "eight", rank: 8, suit: "clubs" },
        { id: "nine", rank: 9, suit: "clubs" },
      ],
    } : player),
  };
  game = passScumTurn(game, 1);
  game = passScumTurn(game, 2);
  game = passScumTurn(game, 3);

  assert.equal(game.pile.rank, 5);
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.continuationPlayerIndex, 0);
  assert.deepEqual(game.passed, [1, 2, 3]);

  game = playScumCards(game, 0, ["eight"]);
  assert.equal(game.pile.rank, 8);
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.continuationPlayerIndex, 0);

  game = playScumCards(game, 0, ["nine"]);
  assert.equal(game.pile, null);
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.continuationPlayerIndex, null);
  assert.deepEqual(game.passed, []);
});

test("a continuation player can move on and lead a new play", () => {
  const base = createScumGame({ random: still });
  const game = {
    ...base,
    currentPlayerIndex: 0,
    lastPlayerIndex: 0,
    continuationPlayerIndex: 0,
    passed: [1, 2, 3],
    pile: { rank: 5, count: 1, cards: [], playerIndex: 0 },
  };

  const next = moveOnScumPile(game, 0);
  assert.equal(next.pile, null);
  assert.equal(next.currentPlayerIndex, 0);
  assert.equal(next.continuationPlayerIndex, null);
  assert.deepEqual(next.passed, []);
});

test("the pile clears automatically when the last player cannot continue", () => {
  const base = createScumGame({ random: still });
  let game = {
    ...base,
    currentPlayerIndex: 1,
    lastPlayerIndex: 0,
    passed: [2, 3],
    pile: { rank: 5, count: 1, cards: [], playerIndex: 0 },
    players: base.players.map((player, index) => index === 0 ? {
      ...player,
      hand: [{ id: "four", rank: 4, suit: "clubs" }],
    } : player),
  };

  game = passScumTurn(game, 1);
  assert.equal(game.pile, null);
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.continuationPlayerIndex, null);
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
    chooseScumCardSelection(hand, "8-hearts", [], 3).sort(),
    ["8-clubs", "8-diamonds", "8-hearts"].sort()
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
