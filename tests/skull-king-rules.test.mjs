import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getSkullKingCardArt } from "../lib/skull-king-art.js";

import {
  SKULL_KING_PIRATES,
  chooseBotPirateAbility,
  chooseBotSkullKingPlay,
  collectSkullKingTrick,
  createSkullKingDeck,
  createSkullKingMatch,
  getLegalSkullKingCards,
  playSkullKingCard,
  resolveSkullKingTrick,
  resolveSkullKingPirateAbility,
  resolveWalkThePlank,
  chooseBotWalkThePlank,
  scoreSkullKingRound,
  startNextSkullKingRound,
  submitSkullKingBid,
} from "../lib/skull-king.js";

const number = (suit, rank, bonus = 0) => ({ id: `${suit}-${rank}`, type: "number", suit, rank, bonus });
const choice = (suit, declaredValue) => ({ id: `${suit}-choice`, type: "choice", suit, rank: null, declaredValue, bonus: 0 });
const special = (kind, index = 0) => ({ id: `${kind}-${index}`, type: "special", kind, suit: null, rank: null, bonus: 0 });
const plays = (...cards) => cards.map((card, playerIndex) => ({ playerIndex, card }));

test("the full expansion deck contains all 93 gameplay cards", () => {
  const deck = createSkullKingDeck();
  assert.equal(deck.length, 93);
  assert.equal(deck.filter((card) => card.kind === "escape").length, 5);
  assert.equal(deck.filter((card) => card.kind === "pirate").length, 6);
  assert.equal(deck.filter((card) => card.kind === "skullKing").length, 1);
  assert.equal(deck.filter((card) => card.kind === "mermaid").length, 2);
  assert.equal(deck.filter((card) => card.kind === "doubloon").length, 2);
  assert.equal(deck.filter((card) => card.kind === "tigress").length, 1);
  assert.equal(deck.filter((card) => card.type === "choice").length, 4);
  assert.equal(deck.filter((card) => ["kraken", "whiteWhale", "spottedStingray"].includes(card.kind)).length, 3);
  assert.equal(deck.filter((card) => card.kind === "eel").length, 0);
  assert.equal(deck.filter((card) => card.expansion && card.rank === 7).length, 4);
  assert.equal(deck.filter((card) => card.expansion && card.rank === 8).length, 4);
  assert.equal(deck.filter((card) => card.type === "wild15").length, 1);
  assert.equal(deck.filter((card) => ["firstMate", "walkThePlank", "lastVolley", "davyJones"].includes(card.kind)).length, 4);
  assert.deepEqual(
    deck.filter((card) => card.kind === "pirate").map((card) => card.name),
    SKULL_KING_PIRATES.map((pirate) => pirate.name),
  );
  assert.ok(deck.filter((card) => card.kind === "pirate").every((card) => card.ability));
});

test("every card in the full deck resolves to an existing illustration", () => {
  const deck = createSkullKingDeck();
  const missingArt = deck.filter((card) => !getSkullKingCardArt(card)).map((card) => card.id);
  assert.deepEqual(missingArt, []);

  const artPaths = new Set(deck.map((card) => getSkullKingCardArt(card)));
  for (const artPath of artPaths) {
    assert.ok(existsSync(join(process.cwd(), "public", artPath.replace(/^\//, ""))), `${artPath} should exist`);
  }
});

test("expansion 7s and 8s apply minus or plus five capture points", () => {
  const expansionSeven = { ...number("green", 7), id: "green-7-expansion", bonus: -5, expansion: true };
  const expansionEight = { ...number("green", 8), id: "green-8-expansion", bonus: 5, expansion: true };
  const result = resolveSkullKingTrick(plays(number("green", 12), expansionSeven, expansionEight));
  assert.equal(result.winnerIndex, 0);
  assert.equal(result.bonus, 0);

  const penalty = resolveSkullKingTrick(plays(number("green", 12), expansionSeven));
  assert.equal(penalty.bonus, -5);
});

test("Wild Monkey 15 adopts a non-trump suit and wins as 15 under White Whale", () => {
  const wild = { id: "wild-monkey-15", type: "wild15", suit: null, rank: 15, bonus: 0, declaredSuit: "green" };
  assert.equal(resolveSkullKingTrick(plays(number("green", 14, 10), wild, number("green", 12))).winnerIndex, 1);
  assert.equal(resolveSkullKingTrick(plays(number("black", 1), wild, number("green", 14, 10))).winnerIndex, 0);
  assert.equal(resolveSkullKingTrick(plays(number("black", 14, 20), wild, special("whiteWhale"))).winnerIndex, 1);
});

test("Tigress may be declared as a Pirate or an Escape", () => {
  const tigressAsPirate = { ...special("tigress"), declaredRole: "pirate" };
  const tigressAsEscape = { ...special("tigress"), declaredRole: "escape" };

  const pirateResult = resolveSkullKingTrick(plays(number("black", 14, 20), special("mermaid"), tigressAsPirate));
  assert.equal(pirateResult.winnerIndex, 2);
  assert.equal(pirateResult.bonus, 40);

  const escapeResult = resolveSkullKingTrick(plays(number("green", 9), tigressAsEscape, special("escape")));
  assert.equal(escapeResult.winnerIndex, 0);

  const kingCapture = resolveSkullKingTrick(plays(special("skullKing"), tigressAsPirate, number("yellow", 3)));
  assert.equal(kingCapture.winnerIndex, 0);
  assert.equal(kingCapture.bonus, 30);

  const kingWithEscape = resolveSkullKingTrick(plays(special("skullKing"), tigressAsEscape, number("yellow", 3)));
  assert.equal(kingWithEscape.bonus, 0);
});

test("Rosie D’ Laney lets her player choose who leads the next trick", () => {
  const rosie = createSkullKingDeck().find((card) => card.pirateKey === "rosie");
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    phase: "playing",
    currentPlayerIndex: 0,
    trick: [
      { playerIndex: 1, card: number("green", 9) },
      { playerIndex: 2, card: number("green", 8) },
    ],
    players: game.players.map((player, index) => ({ ...player, hand: index === 0 ? [rosie, number("yellow", 3)] : [number("black", index)] })),
  };

  game = playSkullKingCard(game, 0, rosie.id);
  assert.equal(game.phase, "pirateAbility");
  assert.equal(game.pendingPirateAbility.pirateKey, "rosie");
  game = resolveSkullKingPirateAbility(game, { leaderIndex: 2 });
  assert.equal(game.phase, "collecting");
  assert.equal(game.lastTrick.nextLeaderIndex, 2);
});

test("only Harry the Giant may use a Pirate ability after the final trick", () => {
  const rascal = createSkullKingDeck().find((card) => card.pirateKey === "rascal");
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    phase: "playing",
    currentPlayerIndex: 0,
    trick: [
      { playerIndex: 1, card: number("green", 9) },
      { playerIndex: 2, card: number("green", 8) },
    ],
    players: game.players.map((player, index) => ({ ...player, hand: index === 0 ? [rascal] : [] })),
  };

  game = playSkullKingCard(game, 0, rascal.id);
  assert.equal(game.phase, "collecting");
  assert.equal(game.pendingPirateAbility, null);
});

test("Bendt the Bandit draws two cards and requires two cards to be discarded", () => {
  const bendt = createSkullKingDeck().find((card) => card.pirateKey === "bendt");
  const kept = number("black", 5);
  const firstDraw = number("yellow", 2);
  const secondDraw = number("purple", 3);
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    phase: "playing",
    currentPlayerIndex: 0,
    trick: [
      { playerIndex: 1, card: number("green", 9) },
      { playerIndex: 2, card: number("green", 8) },
    ],
    drawPile: [firstDraw, secondDraw, number("green", 1)],
    deckCount: 3,
    players: game.players.map((player, index) => ({ ...player, hand: index === 0 ? [bendt, kept] : [number("green", 4)] })),
  };

  game = playSkullKingCard(game, 0, bendt.id);
  assert.equal(game.phase, "pirateAbility");
  assert.equal(game.drawPile.length, 1);
  assert.deepEqual(game.pendingPirateAbility.drawnCardIds, [firstDraw.id, secondDraw.id]);
  assert.equal(game.players[0].hand.length, 3);

  game = resolveSkullKingPirateAbility(game, { discardCardIds: [firstDraw.id, secondDraw.id] });
  assert.deepEqual(game.players[0].hand.map((card) => card.id), [kept.id]);
});

test("Mary Thorne forces one random card from the chosen player's hand next trick", () => {
  const mary = createSkullKingDeck().find((card) => card.pirateKey === "mary");
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    phase: "pirateAbility",
    pendingPirateAbility: {
      playerIndex: 0,
      pirateKey: "mary",
      pirateName: mary.name,
      ability: mary.ability,
      drawnCardIds: [],
      remainingAbilities: [],
    },
    lastTrick: { nextLeaderIndex: 0 },
    players: game.players.map((player, index) => ({
      ...player,
      hand: index === 1 ? [number("green", 2), number("yellow", 9)] : [number("black", 1)],
    })),
  };
  game = resolveSkullKingPirateAbility(game, { targetPlayerIndex: 1 }, () => 0.99);
  assert.deepEqual(game.forcedPlay, { playerIndex: 1, cardId: "yellow-9", chosenByPlayerIndex: 0 });
});

test("Rascal wagers score positively on an exact bid and negatively on a miss", () => {
  assert.equal(scoreSkullKingRound({ bid: 2, tricks: 2, roundBonus: 0, wager: 20 }, 4), 60);
  assert.equal(scoreSkullKingRound({ bid: 2, tricks: 1, roundBonus: 0, wager: 20 }, 4), -30);
});

test("Harry the Giant may adjust a bid by at most one", () => {
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    roundNumber: 4,
    phase: "pirateAbility",
    pendingPirateAbility: {
      playerIndex: 0,
      pirateKey: "harry",
      pirateName: "Harry the Giant",
      ability: SKULL_KING_PIRATES.find((pirate) => pirate.key === "harry").ability,
      drawnCardIds: [],
    },
    lastTrick: { nextLeaderIndex: 0 },
    players: game.players.map((player, index) => ({ ...player, bid: index === 0 ? 2 : 0 })),
  };

  assert.equal(resolveSkullKingPirateAbility(game, { bid: 4 }), game);
  game = resolveSkullKingPirateAbility(game, { bid: 3 });
  assert.equal(game.players[0].bid, 3);
  assert.equal(game.phase, "collecting");
});

test("round one deals one card and starts with the player left of the dealer after bidding", () => {
  let game = createSkullKingMatch({ playerCount: 4, random: () => 0.5 });
  assert.ok(game.players.every((player) => player.hand.length === 1));
  game = submitSkullKingBid(game, 0, 1, () => 0.5);
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.players[0].bid, 1);
  assert.ok(game.players.slice(1).every((player) => player.bid !== null));
});

test("players must follow suit when possible but may always play a special card", () => {
  const game = {
    phase: "playing",
    currentPlayerIndex: 1,
    trick: [{ playerIndex: 0, card: number("green", 8) }],
    players: [
      { hand: [] },
      { hand: [number("green", 2), number("yellow", 14), special("pirate"), choice("green")] },
    ],
  };
  assert.deepEqual(getLegalSkullKingCards(game, 1).map((card) => card.id), ["green-2", "pirate-0", "green-choice"]);
});

test("black trumps the led suit and pirates trump numbered cards", () => {
  assert.equal(resolveSkullKingTrick(plays(number("green", 14), number("black", 2), number("green", 9))).winnerIndex, 1);
  assert.equal(resolveSkullKingTrick(plays(number("black", 14), special("pirate"), number("black", 1))).winnerIndex, 1);
});

test("character cards follow the Skull King hierarchy and award capture bonuses", () => {
  const pirateWins = resolveSkullKingTrick(plays(number("black", 14, 20), special("mermaid"), special("pirate")));
  assert.equal(pirateWins.winnerIndex, 2);
  assert.equal(pirateWins.bonus, 40);

  const kingWins = resolveSkullKingTrick(plays(special("pirate", 0), special("skullKing"), special("pirate", 1)));
  assert.equal(kingWins.winnerIndex, 1);
  assert.equal(kingWins.bonus, 60);

  const mermaidWins = resolveSkullKingTrick(plays(special("skullKing"), number("yellow", 14, 10), special("mermaid")));
  assert.equal(mermaidWins.winnerIndex, 2);
  assert.equal(mermaidWins.bonus, 50);
});

test("a Mermaid wins the Pirate, Skull King, and Mermaid combination with only the King capture bonus", () => {
  const result = resolveSkullKingTrick(plays(
    special("pirate"),
    special("skullKing"),
    special("mermaid"),
    number("green", 14, 10),
  ));
  assert.equal(result.winnerIndex, 2);
  assert.equal(result.bonus, 50);
});

test("Doubloons act as Escapes and record an alliance with a different trick winner", () => {
  const result = resolveSkullKingTrick(plays(special("doubloon"), number("green", 9), special("escape")));
  assert.equal(result.winnerIndex, 1);
  assert.deepEqual(result.doubloonPlayerIndexes, [0]);

  const ownDoubloons = resolveSkullKingTrick(plays(special("doubloon"), special("escape"), special("escape", 1)));
  assert.equal(ownDoubloons.winnerIndex, 0);
  assert.deepEqual(ownDoubloons.doubloonPlayerIndexes, []);
});

test("choice cards use the declared 0 or 14 value without a bonus", () => {
  const high = resolveSkullKingTrick(plays(number("purple", 11), choice("purple", 14), number("purple", 13)));
  const low = resolveSkullKingTrick(plays(number("purple", 1), choice("purple", 0), number("purple", 2)));
  assert.equal(high.winnerIndex, 1);
  assert.equal(high.bonus, 0);
  assert.equal(low.winnerIndex, 2);
});

test("all escapes award the trick to the first escape", () => {
  const result = resolveSkullKingTrick(plays(special("escape", 0), special("escape", 1), special("escape", 2)));
  assert.equal(result.winnerIndex, 0);
});

test("the Kraken destroys a trick and the following player leads", () => {
  const result = resolveSkullKingTrick(plays(number("green", 14, 10), special("kraken"), special("pirate")));
  assert.equal(result.winnerIndex, null);
  assert.equal(result.nextLeaderIndex, 2);
  assert.equal(result.bonus, 0);
});

test("the White Whale makes the highest number win across all suits", () => {
  const result = resolveSkullKingTrick(plays(special("pirate"), number("green", 12), special("whiteWhale"), number("yellow", 14, 10)));
  assert.equal(result.winnerIndex, 3);
  assert.equal(result.bonus, 10);
});

test("the Spotted Stingray makes the lowest number win", () => {
  const result = resolveSkullKingTrick(plays(number("black", 14, 20), special("spottedStingray"), number("yellow", 2), number("green", 8)));
  assert.equal(result.winnerIndex, 2);
});

test("the last monster played overrides earlier monsters", () => {
  const whaleWins = resolveSkullKingTrick(plays(special("kraken"), number("green", 5), special("whiteWhale"), number("black", 2)));
  const krakenWins = resolveSkullKingTrick(plays(special("whiteWhale"), number("green", 5), special("kraken"), number("black", 2)));
  assert.equal(whaleWins.winnerIndex, 1);
  assert.equal(whaleWins.activeMonster, "whiteWhale");
  assert.equal(krakenWins.winnerIndex, null);
  assert.equal(krakenWins.activeMonster, "kraken");
});

test("First Mate Con beats Pirates, copies captured powers, and is worth 30 to the Skull King", () => {
  const firstMate = special("firstMate");
  const rosie = createSkullKingDeck().find((card) => card.pirateKey === "rosie");
  assert.equal(resolveSkullKingTrick(plays(rosie, firstMate, number("black", 14, 20))).winnerIndex, 1);
  const kingCapture = resolveSkullKingTrick(plays(firstMate, special("skullKing"), number("green", 2)));
  assert.equal(kingCapture.winnerIndex, 1);
  assert.equal(kingCapture.bonus, 30);
});

test("First Mate Con chains every captured named Pirate ability", () => {
  const rosie = createSkullKingDeck().find((card) => card.pirateKey === "rosie");
  const mary = createSkullKingDeck().find((card) => card.pirateKey === "mary");
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    roundNumber: 2,
    phase: "playing",
    currentPlayerIndex: 2,
    trick: [{ playerIndex: 0, card: rosie }, { playerIndex: 1, card: mary }],
    players: game.players.map((player, index) => ({
      ...player,
      hand: index === 2 ? [special("firstMate"), number("green", 3)] : [number("yellow", index + 2)],
    })),
  };
  game = playSkullKingCard(game, 2, "firstMate-0");
  assert.equal(game.pendingPirateAbility.pirateKey, "rosie");
  assert.equal(game.pendingPirateAbility.remainingAbilities.length, 1);
  game = resolveSkullKingPirateAbility(game, { leaderIndex: 1 });
  assert.equal(game.phase, "pirateAbility");
  assert.equal(game.pendingPirateAbility.pirateKey, "mary");
  game = resolveSkullKingPirateAbility(game, { targetPlayerIndex: 0 }, () => 0);
  assert.equal(game.phase, "collecting");
  assert.equal(game.lastTrick.nextLeaderIndex, 1);
  assert.equal(game.forcedPlay.playerIndex, 0);
});

test("Davy Jones destroys all Sea Monsters and awards 20 per monster to its player", () => {
  const result = resolveSkullKingTrick(plays(
    number("green", 9),
    special("kraken"),
    special("davyJones"),
    special("whiteWhale"),
  ));
  assert.equal(result.winnerIndex, 0);
  assert.equal(result.destroyedMonsterCount, 2);
  assert.deepEqual(result.bonusAwards, [{ playerIndex: 2, points: 40 }]);
});

test("Walk the Plank removes a Pirate before the trick winner is resolved", () => {
  const rosie = createSkullKingDeck().find((card) => card.pirateKey === "rosie");
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    roundNumber: 2,
    phase: "playing",
    currentPlayerIndex: 2,
    trick: [
      { playerIndex: 0, card: rosie },
      { playerIndex: 1, card: number("black", 14, 20) },
    ],
    players: game.players.map((player, index) => ({ ...player, hand: index === 2 ? [special("walkThePlank"), number("green", 1)] : [number("green", 2)] })),
  };
  game = playSkullKingCard(game, 2, "walkThePlank-0");
  assert.equal(game.phase, "walkThePlank");
  game = resolveWalkThePlank(game, rosie.id);
  assert.equal(game.lastTrick.winnerIndex, 1);
  assert.equal(game.lastTrick.bonus, 20);
});

test("The Last Volley grants an extra play and makes that player skip the final trick", () => {
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    roundNumber: 2,
    trickNumber: 1,
    phase: "playing",
    currentPlayerIndex: 2,
    trick: [
      { playerIndex: 0, card: number("green", 5) },
      { playerIndex: 1, card: number("green", 6) },
    ],
    players: game.players.map((player, index) => ({
      ...player,
      hand: index === 2 ? [special("lastVolley"), number("green", 14, 10)] : [number("yellow", index + 2)],
    })),
  };
  game = playSkullKingCard(game, 2, "lastVolley-0");
  assert.equal(game.phase, "lastVolley");
  assert.equal(game.currentPlayerIndex, 2);
  game = playSkullKingCard(game, 2, "green-14");
  assert.equal(game.phase, "collecting");
  assert.equal(game.lastTrick.winnerIndex, 2);
  assert.equal(game.skipFinalTrickPlayerIndex, 2);
  game = collectSkullKingTrick(game);
  assert.equal(game.trickNumber, 2);
  assert.equal(game.currentPlayerIndex, 0);
  game = playSkullKingCard(game, 0, "yellow-2");
  game = playSkullKingCard(game, 1, "yellow-3");
  assert.equal(game.phase, "collecting");
  assert.equal(game.players[2].hand.length, 0);
});

test("exact bids score twenty per trick plus captured 14 bonuses", () => {
  assert.equal(scoreSkullKingRound({ bid: 3, tricks: 3, roundBonus: 30 }, 5), 90);
  assert.equal(scoreSkullKingRound({ bid: 3, tricks: 1, roundBonus: 30 }, 5), -20);
  assert.equal(scoreSkullKingRound({ bid: 0, tricks: 0, roundBonus: 20 }, 5), 70);
  assert.equal(scoreSkullKingRound({ bid: 0, tricks: 1, roundBonus: 0 }, 5), -50);
});

test("a Doubloon awards both allies 20 points only when both bids are exact", () => {
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = {
    ...game,
    roundNumber: 3,
    phase: "collecting",
    history: [],
    lastTrick: {
      winnerIndex: 0,
      nextLeaderIndex: 0,
      bonus: 0,
      doubloonPlayerIndexes: [1],
    },
    players: game.players.map((player, index) => ({
      ...player,
      hand: [],
      bid: index === 0 ? 1 : 0,
      tricks: 0,
      roundBonus: 0,
    })),
  };

  game = collectSkullKingTrick(game);
  assert.deepEqual(game.roundSummary.doubloonBonuses, [20, 20, 0]);
  assert.deepEqual(game.roundSummary.points, [40, 50, 30]);
});

test("collecting a destroyed trick does not increment anyone's trick count", () => {
  let game = createSkullKingMatch({ playerCount: 3, random: () => 0.5 });
  game = submitSkullKingBid(game, 0, 0, () => 0.5);
  game = {
    ...game,
    phase: "collecting",
    lastTrick: { winnerIndex: null, nextLeaderIndex: 2, bonus: 0 },
    players: game.players.map((player) => ({ ...player, hand: [number("green", 1)] })),
  };
  game = collectSkullKingTrick(game);
  assert.deepEqual(game.players.map((player) => player.tricks), [0, 0, 0]);
  assert.equal(game.currentPlayerIndex, 2);
});

test("a nine-player match can complete all ten rounds with the 93-card expansion deck", () => {
  let game = createSkullKingMatch({ playerCount: 9, random: () => 0.47 });
  let steps = 0;

  while (game.phase !== "gameOver") {
    steps += 1;
    assert.ok(steps < 2000, "match should finish");
    if (game.phase === "bidding") {
      game = submitSkullKingBid(game, 0, 0, () => 0.47);
    } else if (["playing", "lastVolley"].includes(game.phase)) {
      const play = chooseBotSkullKingPlay(game, game.currentPlayerIndex, () => 0.47);
      game = playSkullKingCard(game, game.currentPlayerIndex, play.card.id, play.declaredSuit ?? play.declaredRole ?? play.declaredValue);
    } else if (game.phase === "collecting") {
      game = collectSkullKingTrick(game);
    } else if (game.phase === "pirateAbility") {
      game = resolveSkullKingPirateAbility(game, chooseBotPirateAbility(game, () => 0.47));
    } else if (game.phase === "walkThePlank") {
      game = resolveWalkThePlank(game, chooseBotWalkThePlank(game));
    } else if (game.phase === "roundComplete") {
      game = startNextSkullKingRound(game, () => 0.47);
    }
  }

  assert.equal(game.roundNumber, 10);
  assert.equal(game.history.length, 10);
  assert.ok(game.roundSummary.winnerIndexes.length >= 1);
});
