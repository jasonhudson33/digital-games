import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseBotHeartCard,
  collectHeartTrick,
  completeHeartsPass,
  createHeartsMatch,
  getLegalHeartCards,
  getTrickWinner,
  playHeartCard,
} from "../lib/hearts.js";

const card = (suit, rank, copy = 0) => ({ id: `${suit}-${rank}-${copy}`, suit, rank, copy });

test("classic Hearts supports three or four players with one deck", () => {
  const threePlayer = createHeartsMatch({ variant: "classic", playerCount: 3 });
  const fourPlayer = createHeartsMatch({ variant: "classic", playerCount: 4 });

  assert.deepEqual(threePlayer.players.map((player) => player.hand.length), [17, 17, 17]);
  assert.equal(threePlayer.kitty.length, 0);
  assert.deepEqual(fourPlayer.players.map((player) => player.hand.length), [13, 13, 13, 13]);
  assert.equal(fourPlayer.kitty.length, 0);
});

test("classic Hearts forces the 2 of clubs holder to open with it", () => {
  const game = createHeartsMatch({ variant: "classic", playerCount: 4 });
  const passed = completeHeartsPass(game, game.players[0].hand.slice(0, 3).map((candidate) => candidate.id));
  const legal = getLegalHeartCards(passed, passed.currentPlayerIndex);

  assert.deepEqual(legal.map((candidate) => `${candidate.rank}${candidate.suit}`), ["2clubs"]);
});

test("Killer Hearts supports five to eight players with two decks and no passing", () => {
  const expected = {
    5: { hand: 20, kitty: 4 },
    6: { hand: 17, kitty: 2 },
    7: { hand: 14, kitty: 6 },
    8: { hand: 13, kitty: 0 },
  };

  for (const [countText, sizes] of Object.entries(expected)) {
    const playerCount = Number(countText);
    const game = createHeartsMatch({ variant: "killer", playerCount });
    assert.equal(game.phase, "playing");
    assert.equal(game.passDirection, "hold");
    assert.equal(game.players.length, playerCount);
    assert.ok(game.players.every((player) => player.hand.length === sizes.hand));
    assert.equal(game.kitty.length, sizes.kitty);
    assert.ok(game.kitty.every((candidate) => !(candidate.suit === "clubs" && candidate.rank === 2)));
    const twoClubHolders = game.players.filter((player) =>
      player.hand.some((candidate) => candidate.suit === "clubs" && candidate.rank === 2)
    );
    assert.equal(twoClubHolders.length, 2);
    assert.notEqual(twoClubHolders[0].id, twoClubHolders[1].id);
    const openingCards = getLegalHeartCards(game, game.currentPlayerIndex);
    assert.deepEqual(openingCards.map((candidate) => `${candidate.rank}${candidate.suit}`), ["2clubs"]);
  }
});

test("both Killer Hearts 2 of clubs holders are forced to play them on the opening trick", () => {
  let game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  const holders = game.players
    .filter((player) => player.hand.some((candidate) => candidate.suit === "clubs" && candidate.rank === 2))
    .map((player) => player.id);

  while (game.phase === "playing" && game.trick.length < game.playerCount) {
    const legal = getLegalHeartCards(game, game.currentPlayerIndex);
    if (holders.includes(game.currentPlayerIndex)) {
      assert.ok(legal.every((candidate) => candidate.suit === "clubs" && candidate.rank === 2));
    }
    game = playHeartCard(game, game.currentPlayerIndex, legal[0].id);
  }

  const playedTwoClubs = game.trick.filter((play) => play.card.suit === "clubs" && play.card.rank === 2);
  assert.equal(playedTwoClubs.length, 2);
});

test("hearts cannot lead while the player holds another suit", () => {
  const game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  game.players[0].hand = [card("hearts", 14), card("clubs", 4)];
  game.currentPlayerIndex = 0;
  game.trick = [];
  game.trickNumber = 2;

  assert.deepEqual(getLegalHeartCards(game, 0).map((candidate) => candidate.id), ["clubs-4-0"]);
});

test("hearts may lead after a heart has been played off-suit", () => {
  const game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  game.players[0].hand = [card("hearts", 14), card("clubs", 4)];
  game.currentPlayerIndex = 0;
  game.trick = [];
  game.trickNumber = 2;
  game.heartsPlayed = true;

  assert.deepEqual(
    getLegalHeartCards(game, 0).map((candidate) => candidate.id),
    ["hearts-14-0", "clubs-4-0"]
  );
});

test("a Hearts computer leads its shortest safe suit to work toward a void", () => {
  const game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  game.players[1].hand = [card("clubs", 3), card("clubs", 7), card("diamonds", 9)];
  game.currentPlayerIndex = 1;
  game.trick = [];
  game.trickNumber = 2;
  assert.equal(chooseBotHeartCard(game, 1).id, "diamonds-9-0");
});

test("a player who cannot follow suit may discard a heart", () => {
  const game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  game.players[1].hand = [card("hearts", 8), card("diamonds", 4)];
  game.currentPlayerIndex = 1;
  game.trick = [{ playerIndex: 0, card: card("clubs", 10) }];
  game.trickNumber = 2;

  assert.deepEqual(getLegalHeartCards(game, 1).map((candidate) => candidate.id), ["hearts-8-0", "diamonds-4-0"]);
});

test("damage cards cannot be discarded on the first trick", () => {
  const game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  game.players[1].hand = [card("hearts", 8), card("spades", 12), card("diamonds", 4)];
  game.currentPlayerIndex = 1;
  game.trick = [{ playerIndex: 0, card: card("clubs", 2) }];
  game.trickNumber = 1;

  assert.deepEqual(getLegalHeartCards(game, 1).map((candidate) => candidate.id), ["diamonds-4-0"]);
});

test("matching lead-suit cards cancel as trick winners", () => {
  const trick = [
    { playerIndex: 0, card: card("clubs", 14, 0) },
    { playerIndex: 1, card: card("clubs", 14, 1) },
    { playerIndex: 2, card: card("clubs", 12, 0) },
    { playerIndex: 3, card: card("hearts", 14, 0) },
    { playerIndex: 4, card: card("clubs", 9, 0) },
  ];

  assert.equal(getTrickWinner(trick, true), 2);
  assert.equal(getTrickWinner(trick.slice(0, 2), true), null);
});

test("a fully canceled trick carries into the next winning trick", () => {
  let game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  const hands = [
    [card("clubs", 10, 0), card("clubs", 5, 0)],
    [card("clubs", 10, 1), card("clubs", 8, 0)],
    [card("hearts", 2, 0), card("diamonds", 2, 0)],
    [card("spades", 2, 0), card("spades", 3, 0)],
    [card("diamonds", 3, 0), card("diamonds", 4, 0)],
  ];
  game = {
    ...game,
    players: game.players.map((player, index) => ({ ...player, hand: hands[index], captured: [], roundPoints: 0 })),
    cardsPerPlayer: 2,
    kitty: [],
    kittyClaimed: true,
    currentPlayerIndex: 0,
    trick: [],
    trickNumber: 2,
  };

  for (const cardId of ["clubs-10-0", "clubs-10-1", "hearts-2-0", "spades-2-0", "diamonds-3-0"]) {
    game = playHeartCard(game, game.currentPlayerIndex, cardId);
  }
  assert.equal(game.lastTrick.winnerIndex, null);
  game = collectHeartTrick(game);
  assert.equal(game.carryoverCards.length, 5);
  assert.equal(game.currentPlayerIndex, 0);

  for (const cardId of ["clubs-5-0", "clubs-8-0", "diamonds-2-0", "spades-3-0", "diamonds-4-0"]) {
    game = playHeartCard(game, game.currentPlayerIndex, cardId);
  }
  assert.equal(game.lastTrick.winnerIndex, 1);
  game = collectHeartTrick(game);
  assert.equal(game.players[1].captured.length, 10);
});

test("a complete classic round accounts for all 26 penalty points", () => {
  let game = createHeartsMatch({ variant: "classic", playerCount: 4 });
  game = completeHeartsPass(game, game.players[0].hand.slice(0, 3).map((candidate) => candidate.id));

  while (game.phase === "playing" || game.phase === "collecting") {
    if (game.phase === "collecting") {
      game = collectHeartTrick(game);
      continue;
    }
    const legal = getLegalHeartCards(game, game.currentPlayerIndex);
    game = playHeartCard(game, game.currentPlayerIndex, legal[0].id);
  }

  const totalApplied = game.roundSummary.appliedPoints.reduce((sum, points) => sum + points, 0);
  assert.ok(totalApplied === 26 || totalApplied === 78);
  assert.equal(game.players.reduce((sum, player) => sum + player.captured.length, 0), 52);
});

test("a complete five-player Killer round accounts for both decks and the kitty", () => {
  let game = createHeartsMatch({ variant: "killer", playerCount: 5 });
  let turns = 0;

  while (game.phase === "playing" || game.phase === "collecting") {
    turns += 1;
    assert.ok(turns < 1000, "round should finish");
    if (game.phase === "collecting") {
      game = collectHeartTrick(game);
      continue;
    }
    const legal = getLegalHeartCards(game, game.currentPlayerIndex);
    game = playHeartCard(game, game.currentPlayerIndex, legal[0].id);
  }

  const totalApplied = game.roundSummary.appliedPoints.reduce((sum, points) => sum + points, 0);
  assert.ok(totalApplied === 52 || totalApplied === 208);
  assert.equal(game.players.reduce((sum, player) => sum + player.captured.length, 0), 104);
});
