import assert from "node:assert/strict";
import test from "node:test";

import {
  KILLER_BUNNIES_CARD_COUNTS,
  bankTotal,
  buyKillerBunniesShopItem,
  callKillerBunniesPovertyPoker,
  chooseKillerBunniesCarrot,
  chooseKillerBunniesBlueRollTarget,
  chooseKillerBunniesAuctionTarget,
  chooseKillerBunniesBunnyExchangeGive,
  chooseKillerBunniesBlackCatTarget,
  chooseKillerBunniesDefectorTarget,
  chooseKillerBunniesEveryoneFeedBunny,
  chooseKillerBunniesMisfortuneTarget,
  chooseKillerBunniesModifierTarget,
  chooseKillerBunniesNumber,
  chooseKillerBunniesPlayerTarget,
  chooseKillerBunniesRevivedBunny,
  chooseKillerBunniesRoamingTarget,
  chooseKillerBunniesTarget,
  chooseKillerBunniesUtilityBunnyTarget,
  chooseInitialKillerBunniesRun,
  createKillerBunniesGame,
  drawKillerBunniesPile,
  discardKillerBunniesDefectorDetector,
  getKillerBunniesPileStatus,
  getKillerBunniesKaballasPrice,
  getKillerBunniesSavedSpecialStatus,
  getKillerBunniesCardPlayStatus,
  getKillerBunniesExtraRunStatus,
  getKillerBunniesCloverReduction,
  getKillerBunniesShopItemStatus,
  getKillerBunniesSupplyUnits,
  playSavedKillerBunniesSpecial,
  anteKillerBunniesPovertyPoker,
  placeKillerBunniesAuctionBid,
  playTopRun,
  replaceBottomRun,
  resolveKillerBunniesDefense,
  resolveKillerBunniesAreaWeaponRoll,
  resolveKillerBunniesBlueCardRoll,
  resolveKillerBunniesBlueSpecialRoll,
  resolveKillerBunniesBunnyExchange,
  resolveKillerBunniesBlackCatRoll,
  resolveKillerBunniesCardDiceRoll,
  resolveKillerBunniesCardAction,
  resolveKillerBunniesDefectorRoll,
  resolveKillerBunniesImmediateCard,
  resolveKillerBunniesManualCard,
  resolveKillerBunniesRoamingRoll,
  resolveKillerBunniesPovertyPokerRoll,
  resolveKillerBunniesSpecialChoice,
  resolveKillerBunniesWeaponReuse,
  placeKillerBunniesBlackCatClover,
  discardKillerBunniesBlackCatClover,
  runKillerBunniesComputers,
} from "../lib/killer-bunnies.js";
import {
  KILLER_BUNNIES_EXPANSIONS,
  createKillerBunniesExpansionContent,
} from "../lib/killer-bunnies-expansions.js";
import { createKillerBunniesPlayableCard } from "../lib/killer-bunnies-card-adapter.js";
import { getKillerBunniesCatalogCard } from "../lib/killer-bunnies-card-catalog.js";

test("the game uses all 165 official Blue and Yellow numbered cards with unnumbered support cards", () => {
  const game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Bot", isComputer: true }],
    random: seededRandom(11),
  });
  const mainCardsInPlayerZones = game.players.reduce((total, player) =>
    total + player.hand.length + player.bank.length + Number(Boolean(player.topRun)) + Number(Boolean(player.bottomRun)), 0);

  assert.deepEqual(KILLER_BUNNIES_CARD_COUNTS, {
    mainDeck: 152,
    marketStarter: 1,
    carrotMarket: 12,
    magicCarrots: 12,
    cabbage: 12,
    water: 12,
    numbered: 165,
    total: 201,
  });
  assert.equal(game.mainDeck.length + mainCardsInPlayerZones, 152);
  assert.equal(game.carrotMarket.length, 12);
  assert.equal(game.magicCarrotDeck.length, 12);
  assert.equal(game.cabbageSupply.length, 12);
  assert.equal(game.waterSupply.length, 12);
  assert.equal(game.kaballasMarket.name, "Kaballa’s Market (Starter Card)");
  assert.equal(game.kaballasMarket.catalogNumber, "0102");
  assert.equal(game.kaballasMarket.isOpen, true);
  assert.deepEqual(game.kaballasMarket.prices, { cabbage: 3, water: 3, carrot: 10 });
  assert.equal(game.phase, "setupRun");
  assert.ok(game.players.every((player) => player.hand.length === 7 && !player.topRun && !player.bottomRun));

  const numberedCards = [
    ...game.mainDeck,
    ...game.players.flatMap((player) => [...player.hand, ...player.bank]),
    ...game.carrotMarket,
    game.kaballasMarket,
  ];
  assert.equal(numberedCards.length, 165);
  assert.equal(new Set(numberedCards.map((card) => card.catalogNumber)).size, 165);
  assert.ok(numberedCards.every((card) => /^\d{4}$/.test(card.catalogNumber)));
  assert.ok(game.magicCarrotDeck.every((card) => !card.catalogNumber));
  assert.ok([...game.cabbageSupply, ...game.waterSupply].every((card) => !card.catalogNumber));

  const basePlayableCards = [
    ...game.mainDeck,
    ...game.players.flatMap((player) => [...player.hand, ...player.bank]),
  ];
  assert.equal(basePlayableCards.filter((card) => card.type === "SPECIAL").length, 20);
  assert.equal(basePlayableCards.filter((card) => card.type === "VERY SPECIAL").length, 5);
  assert.equal(basePlayableCards.find((card) => card.catalogNumber === "0080").type, "VERY SPECIAL");
});

test("each player chooses their opening TOP RUN and BOTTOM RUN from seven cards", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(12),
  });
  const adaTop = game.players[0].hand[3];
  const adaBottom = game.players[0].hand[5];
  game = chooseInitialKillerBunniesRun(game, 0, adaTop.id, adaBottom.id);

  assert.equal(game.players[0].topRun.id, adaTop.id);
  assert.equal(game.players[0].bottomRun.id, adaBottom.id);
  assert.equal(game.players[0].hand.length, 5);
  assert.equal(game.phase, "setupRun");
  assert.equal(game.currentPlayerIndex, 1);

  const graceTop = game.players[1].hand[1];
  const graceBottom = game.players[1].hand[4];
  game = chooseInitialKillerBunniesRun(game, 1, graceTop.id, graceBottom.id);
  assert.equal(game.players[1].topRun.id, graceTop.id);
  assert.equal(game.players[1].bottomRun.id, graceBottom.id);
  assert.equal(game.players[1].hand.length, 5);
  assert.equal(game.phase, "play");
  assert.equal(game.currentPlayerIndex, 0);
});

test("opening RUN setup begins at a random seat and proceeds around the table", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Lin" }],
    random: () => 0.5,
  });
  assert.equal(game.startingPlayerIndex, 1);
  assert.equal(game.currentPlayerIndex, 1);

  for (const expectedIndex of [1, 2, 0]) {
    assert.equal(game.currentPlayerIndex, expectedIndex);
    const [top, bottom] = game.players[expectedIndex].hand;
    game = chooseInitialKillerBunniesRun(game, expectedIndex, top.id, bottom.id);
  }
  assert.equal(game.phase, "play");
  assert.equal(game.currentPlayerIndex, 1);
});

test("Bunny Triplets recognize color, kind, pawns, grouped bunnies, and specified bunnies", () => {
  assert.match(getKillerBunniesExtraRunStatus({
    bunnies: [bunny("Blue One", "blue"), bunny("Blue Two", "blue"), bunny("Blue Three", "blue")],
  }).reason, /three blue/i);

  assert.match(getKillerBunniesExtraRunStatus({
    bunnies: [bunny("Congenial Bunny – Blue", "blue"), bunny("Congenial Bunny – Green", "green"), bunny("Congenial Bunny – Orange", "orange")],
  }).reason, /three congenial/i);

  assert.match(getKillerBunniesExtraRunStatus({
    bunnies: [bunny("Blue One", "blue"), bunny("Blue Two", "blue")],
    pawns: [{ name: "Blue Pawn", color: "blue" }],
  }).reason, /blue pawn/i);

  assert.equal(getKillerBunniesExtraRunStatus({
    bunnies: [bunny("Specialty Bunny – Single (Solo)"), bunny("Specialty Bunny – Double (Pair)")],
  }).enabled, true);
  assert.equal(getKillerBunniesExtraRunStatus({
    bunnies: [bunny("Blue One", "blue"), bunny("Blue Two", "blue"), bunny("Free Agent")],
  }).enabled, true);
  assert.equal(getKillerBunniesExtraRunStatus({
    bunnies: [bunny("Green One", "green"), bunny("Green Two", "green"), bunny("Robot Bunny – Red", "red")],
  }).enabled, true);
  assert.equal(getKillerBunniesExtraRunStatus({ bunnies: [bunny("Super Congenial Bunny – Violet", "violet")] }).enabled, true);
  assert.equal(getKillerBunniesExtraRunStatus({ bunnies: [bunny("Blue One", "blue"), bunny("Blue Two", "blue")] }).enabled, false);
});

test("Specialty Bunny unit counts use stable card numbers instead of display names", () => {
  const persistedTriple = {
    id: "persisted-specialty-triple",
    number: 225,
    catalogNumber: "0225",
    name: "Fabulous Bunnies",
    kind: "bunny",
  };
  assert.match(getKillerBunniesExtraRunStatus({ bunnies: [persistedTriple] }).reason, /specialty/i);
});

test("a Bunny Triplet plays, replaces, then exposes the second TOP RUN", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(13),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  player.bunnies = [bunny("Blue Gleeful Bunny", "blue"), bunny("Blue Timid Bunny", "blue")];
  player.topRun = bunny("Blue Sinister Bunny", "blue", "first-run-bunny");
  player.bottomRun = plainRun("second-run");

  game = playTopRun(game, playerIndex, seededRandom(14));
  assert.equal(game.runPlaysThisTurn, 1);
  assert.equal(game.phase, "draw");
  assert.equal(getKillerBunniesExtraRunStatus(game.players[playerIndex]).enabled, true);

  const firstReplacement = plainRun("first-replacement");
  game.mainDeck.push(firstReplacement);
  game = drawKillerBunniesPile(game, playerIndex, "main");
  game = replaceBottomRun(game, playerIndex, firstReplacement.id);
  assert.equal(game.phase, "play");
  assert.equal(game.currentPlayerIndex, playerIndex);
  assert.equal(game.players[playerIndex].topRun.id, "second-run");
  assert.match(game.message, /second top run/i);

  game = playTopRun(game, playerIndex, seededRandom(15));
  assert.equal(game.runPlaysThisTurn, 2);
  const secondReplacement = plainRun("second-replacement");
  game.mainDeck.push(secondReplacement);
  game = drawKillerBunniesPile(game, playerIndex, "main");
  game = replaceBottomRun(game, playerIndex, secondReplacement.id);
  assert.notEqual(game.currentPlayerIndex, playerIndex);
  assert.equal(game.runPlaysThisTurn, 0);
});

test("an official Specialty Bunny Triple completes both RUN plays", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["violet"],
    random: seededRandom(225),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  player.bunnies = [createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(225))];
  player.topRun = plainRun("specialty-first-run");
  player.bottomRun = plainRun("specialty-second-run");

  game = playTopRun(game, playerIndex, seededRandom(226));
  const replacement = plainRun("specialty-first-replacement");
  game.mainDeck.push(replacement);
  game = drawKillerBunniesPile(game, playerIndex, "main");
  game = replaceBottomRun(game, playerIndex, replacement.id);
  assert.equal(game.phase, "play");

  game = playTopRun(game, playerIndex, seededRandom(227));
  assert.equal(game.runPlaysThisTurn, 2);
  assert.equal(game.phase, "draw");
});

test("half-color bunnies use either printed color for Bunny Triplets and a matching Pawn", () => {
  const yellowTriplet = {
    bunnies: [
      createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(331)),
      createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(333)),
      createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(334)),
    ],
  };
  assert.match(getKillerBunniesExtraRunStatus(yellowTriplet).reason, /three yellow/i);

  const bluePawnTriplet = {
    bunnies: [
      createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(332)),
      createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(335)),
    ],
    pawns: [{ name: "Blue Pawn", color: "blue" }],
  };
  assert.match(getKillerBunniesExtraRunStatus(bluePawnTriplet).reason, /blue pawn/i);
});

test("a real half-color Bunny Triplet unlocks the second RUN after replacement", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(131),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  game.players[playerIndex].bunnies = [331, 333, 334]
    .map((number) => createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(number)));
  game.players[playerIndex].topRun = plainRun("first-real-triplet-run");
  game.players[playerIndex].bottomRun = plainRun("second-real-triplet-run");

  game = playTopRun(game, playerIndex, seededRandom(132));
  const replacement = plainRun("real-triplet-replacement");
  game.mainDeck.push(replacement);
  game = drawKillerBunniesPile(game, playerIndex, "main");
  game = replaceBottomRun(game, playerIndex, replacement.id);

  assert.equal(game.phase, "play");
  assert.equal(game.currentPlayerIndex, playerIndex);
  assert.equal(game.players[playerIndex].topRun.id, "second-real-triplet-run");
  assert.match(game.message, /second top run/i);
});

test("losing the Bunny Triplet before replacement cancels the second RUN", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(16),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  player.bunnies = [bunny("Blue One", "blue"), bunny("Blue Two", "blue"), bunny("Blue Three", "blue")];
  player.topRun = plainRun("first-run");
  player.bottomRun = plainRun("would-be-second-run");

  game = playTopRun(game, playerIndex, seededRandom(17));
  const misfortune = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(83));
  game.mainDeck.push(misfortune);
  game = drawKillerBunniesPile(game, playerIndex, "main");
  assert.equal(game.phase, "immediateTarget");
  game = chooseKillerBunniesMisfortuneTarget(game, playerIndex, player.bunnies[0].id);

  const replacement = plainRun("replacement-after-misfortune");
  game.mainDeck.push(replacement);
  game = drawKillerBunniesPile(game, playerIndex, "main");
  game = replaceBottomRun(game, playerIndex, replacement.id);
  assert.notEqual(game.currentPlayerIndex, playerIndex);
  assert.equal(game.runPlaysThisTurn, 0);
});

test("PLAY IMMEDIATELY cards resolve on draw instead of entering a player's hand", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(14),
  });
  game.phase = "draw";
  game.currentPlayerIndex = 0;
  const misfortune = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(83));
  const firstBunny = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(1));
  const secondBunny = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(2));
  game.players[0].bunnies = [firstBunny, secondBunny];
  game.mainDeck.push(misfortune);

  game = drawKillerBunniesPile(game, 0, "main", {}, seededRandom(15));

  assert.equal(game.players[0].hand.some((card) => card.id === misfortune.id), false);
  assert.equal(game.pendingAction?.card.id, misfortune.id);
  assert.equal(game.phase, "immediateTarget");

  game = chooseKillerBunniesMisfortuneTarget(game, 0, secondBunny.id);
  assert.deepEqual(game.players[0].bunnies.map((bunny) => bunny.id), [firstBunny.id]);
  assert.ok(game.discardPile.some((card) => card.id === misfortune.id));
  assert.equal(game.phase, "draw");
});

test("Zep Tepi PLAY IMMEDIATELY resolves its adjacent saved-card action before replacement draw", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(16),
  });
  game.phase = "draw";
  game.currentPlayerIndex = 0;
  const immediateCard = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(207));
  const adjacentSpecial = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(145));
  game.players[1].savedSpecials.push(adjacentSpecial);
  game.mainDeck.push(immediateCard);

  game = drawKillerBunniesPile(game, 0, "main", {}, seededRandom(17));
  assert.equal(game.phase, "zepTepiChoice");
  assert.equal(game.pendingAction.card.id, immediateCard.id);
  assert.match(game.pendingAction.card.ability, /first-time player/i);
  assert.equal(game.players[0].hand.some((card) => card.id === immediateCard.id), false);

  game = resolveKillerBunniesCardAction(game, 0, { specialIds: [adjacentSpecial.id] });
  assert.equal(game.phase, "draw");
  assert.ok(game.players[0].savedSpecials.some((card) => card.id === adjacentSpecial.id));
  assert.ok(game.discardPile.some((card) => card.id === immediateCard.id));
});

test("opening deals never offer PLAY IMMEDIATELY cards as RUN choices", () => {
  const expansionIds = KILLER_BUNNIES_EXPANSIONS.map((expansion) => expansion.id);
  for (let seed = 1; seed <= 24; seed += 1) {
    const game = createKillerBunniesGame({
      playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
      expansionIds,
      random: seededRandom(seed),
    });
    assert.equal(game.players.flatMap((player) => player.hand).some((card) => card.type === "PLAY IMMEDIATELY"), false);
  }
});

test("market RUN cards can close the store while Choose A Carrot still works", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Bot", isComputer: true }],
    random: seededRandom(16),
  });
  game = programAllPlayers(game);
  const closedCard = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(60));
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = closedCard;

  game = playTopRun(game, 0, seededRandom(17));
  assert.equal(game.kaballasMarket.isOpen, false);
  assert.equal(getKillerBunniesPileStatus({ ...game, phase: "play" }, 0, "cabbage").enabled, false);
  assert.match(getKillerBunniesPileStatus({ ...game, phase: "play" }, 0, "carrot").reason, /closed/);

  game.phase = "chooseCarrot";
  game.pendingAction = { playerIndex: 0, effect: "chooseCarrot", card: game.players[0].bottomRun };
  const carrotId = game.carrotMarket[0].id;
  game = chooseKillerBunniesCarrot(game, 0, carrotId);
  assert.equal(game.players[0].carrots.length, 1);
  assert.equal(game.kaballasMarket.isOpen, false);
});

test("Choose A Carrot is playable without a bunny, while weapons and feeding cards are not", () => {
  const player = { bunnies: [] };
  assert.equal(getKillerBunniesCardPlayStatus(player, createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(16))).enabled, true);
  assert.equal(getKillerBunniesCardPlayStatus(player, createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(31))).enabled, false);
  assert.equal(getKillerBunniesCardPlayStatus(player, createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(24))).enabled, false);
});

test("a Bunny Modifier may be attached to any bunny and remains under that bunny", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(18),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const targetPlayerIndex = (playerIndex + 1) % game.players.length;
  const targetBunny = bunny("Target Bunny", "orange", "modifier-target");
  const clover = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(62));
  game.players[targetPlayerIndex].bunnies.push(targetBunny);
  game.players[playerIndex].bunnies = [];
  game.players[playerIndex].topRun = clover;

  game = playTopRun(game, playerIndex, seededRandom(19));
  assert.equal(game.phase, "modifierTarget");
  assert.equal(game.pendingAction.card.kind, "modifier");
  game = chooseKillerBunniesModifierTarget(game, playerIndex, targetPlayerIndex, targetBunny.id);

  const attached = game.players[targetPlayerIndex].bunnies[0].modifiers;
  assert.equal(attached.length, 1);
  assert.equal(attached[0].id, clover.id);
  assert.equal(getKillerBunniesCloverReduction(game.players[targetPlayerIndex].bunnies[0]), 2);
  assert.equal(game.phase, "draw");
  assert.equal(game.discardPile.some((card) => card.id === clover.id), false);
});

test("Defector Detector may be discarded instead of placed on a bunny", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(181),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const detector = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(55));
  game.players[playerIndex].bunnies = [bunny("Detector Bunny", "blue", "detector-own")];
  game.players[playerIndex].topRun = detector;

  game = playTopRun(game, playerIndex, seededRandom(182));
  assert.equal(game.phase, "defectorTarget");
  game = discardKillerBunniesDefectorDetector(game, playerIndex);

  assert.equal(game.phase, "draw");
  assert.ok(game.discardPile.some((card) => card.id === detector.id));
});

test("Defector Detector lets every player roll and gives its player one optional replacement roll", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Linus" }],
    random: seededRandom(183),
  });
  game = programAllPlayers(game);
  const cardPlayerIndex = game.currentPlayerIndex;
  const ownerIndex = (cardPlayerIndex + 1) % game.players.length;
  const otherIndex = (cardPlayerIndex + 2) % game.players.length;
  const target = bunny("Defecting Bunny", "green", "defecting-bunny");
  target.modifiers = [createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(61))];
  game.players[cardPlayerIndex].bunnies = [bunny("Required Bunny", "blue", "required-bunny")];
  game.players[ownerIndex].bunnies = [target];
  game.players[ownerIndex].feedingObligations = [{ id: "traveling-feed", bunnyId: target.id, card: { id: "feed" } }];
  game.players[cardPlayerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(55));

  game = playTopRun(game, cardPlayerIndex, seededRandom(184));
  game = chooseKillerBunniesDefectorTarget(game, cardPlayerIndex, ownerIndex, target.id);
  assert.deepEqual(game.pendingAction.rollQueue, [cardPlayerIndex, ownerIndex, otherIndex]);
  game = resolveKillerBunniesDefectorRoll(game, cardPlayerIndex, "roll", () => 0.1); // 2
  game = resolveKillerBunniesDefectorRoll(game, ownerIndex, "roll", () => 0.6); // 8
  game = resolveKillerBunniesDefectorRoll(game, otherIndex, "roll", () => 0.4); // 5

  assert.equal(game.phase, "defectorReroll");
  assert.equal(game.pendingAction.playerIndex, cardPlayerIndex);
  game = resolveKillerBunniesDefectorRoll(game, cardPlayerIndex, "reroll", () => 0.9); // 11

  const transferred = game.players[cardPlayerIndex].bunnies.find((entry) => entry.id === target.id);
  assert.ok(transferred);
  assert.equal(transferred.modifiers.length, 1, "attached modifiers travel with a defecting bunny");
  assert.ok(game.players[cardPlayerIndex].feedingObligations.some((entry) => entry.bunnyId === target.id));
  assert.equal(game.players[ownerIndex].feedingObligations.length, 0);
  assert.equal(game.phase, "draw");
  assert.ok(game.discardPile.some((card) => card.catalogNumber === "0055"));
});

test("Defector Detector repeats tied high rolls until one player wins", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(185),
  });
  game = programAllPlayers(game);
  const cardPlayerIndex = game.currentPlayerIndex;
  const ownerIndex = (cardPlayerIndex + 1) % game.players.length;
  const target = bunny("Tie Bunny", "orange", "tie-bunny");
  game.players[cardPlayerIndex].bunnies = [bunny("Required Bunny", "blue", "tie-required")];
  game.players[ownerIndex].bunnies = [target];
  game.players[cardPlayerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(55));

  game = playTopRun(game, cardPlayerIndex, seededRandom(186));
  game = chooseKillerBunniesDefectorTarget(game, cardPlayerIndex, ownerIndex, target.id);
  game = resolveKillerBunniesDefectorRoll(game, cardPlayerIndex, "roll", () => 0.75); // 10
  game = resolveKillerBunniesDefectorRoll(game, ownerIndex, "roll", () => 0.75); // 10
  assert.equal(game.phase, "defectorRoll");
  assert.equal(game.pendingAction.roundNumber, 2);
  game = resolveKillerBunniesDefectorRoll(game, cardPlayerIndex, "roll", () => 0.25); // 4
  game = resolveKillerBunniesDefectorRoll(game, ownerIndex, "roll", () => 0.25); // 4
  assert.equal(game.pendingAction.roundNumber, 3);
  game = resolveKillerBunniesDefectorRoll(game, cardPlayerIndex, "roll", () => 0.45); // 6
  game = resolveKillerBunniesDefectorRoll(game, ownerIndex, "roll", () => 0.6); // 8

  assert.ok(game.players[ownerIndex].bunnies.some((entry) => entry.id === target.id));
  assert.equal(game.phase, "draw");
});

test("stacked Lucky Clovers lower the weapon level and leave with an eliminated bunny", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(20),
  });
  const target = bunny("Clover Bunny", "blue", "clover-bunny");
  target.modifiers = [
    createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(61)),
    createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(62)),
  ];
  game.players[1].bunnies = [target];
  const weapon = { id: "weapon-nine", kind: "weapon", type: "RUN", name: "Weapon Level 9", power: 9 };
  game.phase = "target";
  game.currentPlayerIndex = 0;
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: weapon };

  game = chooseKillerBunniesTarget(game, 0, 1, target.id);
  assert.equal(game.pendingAction.cloverReduction, 3);
  assert.equal(game.pendingAction.effectivePower, 6);
  game.players[1].defenseCards = [{ id: "def-seven", units: 7 }];
  assert.throws(
    () => resolveKillerBunniesDefense(game, 1, "defense"),
    /need 9 Defense units/,
    "Clovers do not reduce the printed Weapon Level required for Defense Cards",
  );
  game = resolveKillerBunniesDefense(game, 1, "roll", () => 0.5);
  assert.equal(game.lastRoll.value, 7);
  assert.equal(game.players[1].bunnies.length, 1);

  const lethalWeapon = { id: "weapon-twelve", kind: "weapon", type: "RUN", name: "Weapon Level 12", power: 12 };
  game.phase = "target";
  game.currentPlayerIndex = 0;
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: lethalWeapon };
  game = chooseKillerBunniesTarget(game, 0, 1, target.id);
  game = resolveKillerBunniesDefense(game, 1, "roll", () => 0);
  assert.equal(game.players[1].bunnies.length, 0);
  assert.ok(game.discardPile.some((card) => card.catalogNumber === "0061"));
  assert.ok(game.discardPile.some((card) => card.catalogNumber === "0062"));
});

test("Lumbering Bunny built-in Clovers contribute to Weapon reduction", () => {
  assert.equal(getKillerBunniesCloverReduction(bunny("Half Red Lumbering Bunny", "red", "half-red")), 1);
  assert.equal(getKillerBunniesCloverReduction(bunny("Red Lumbering Bunny", "red", "red")), 3);
  assert.equal(getKillerBunniesCloverReduction(bunny("Pink Lumbering Bunny", "pink", "pink")), 5);
});

test("Black Cat 0053 removes every Clover card from one bunny and an odd Green roll may relocate them", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(53),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const targetPlayerIndex = (playerIndex + 1) % game.players.length;
  const recipient = bunny("Recipient Bunny", "green", "black-cat-recipient");
  const target = bunny("Clover Target", "blue", "black-cat-target");
  const halo = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(58));
  const single = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(61));
  const triple = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(63));
  target.modifiers = [single, halo, triple];
  game.players[playerIndex].bunnies = [recipient];
  game.players[targetPlayerIndex].bunnies = [target];
  game.players[playerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(53));

  game = playTopRun(game, playerIndex, seededRandom(54));
  assert.equal(game.phase, "blackCatTarget");
  game = chooseKillerBunniesBlackCatTarget(game, playerIndex, targetPlayerIndex, target.id);
  assert.equal(game.phase, "blackCatRoll");
  assert.deepEqual(target.modifiers.map((card) => card.catalogNumber), ["0061", "0058", "0063"]);
  assert.deepEqual(game.players[targetPlayerIndex].bunnies[0].modifiers.map((card) => card.catalogNumber), ["0058"]);

  game = resolveKillerBunniesBlackCatRoll(game, playerIndex, () => 0); // Green d12 = 1, odd
  assert.equal(game.phase, "blackCatRelocate");
  assert.equal(game.pendingAction.clovers.length, 2);
  game = placeKillerBunniesBlackCatClover(game, playerIndex, playerIndex, recipient.id);
  game = discardKillerBunniesBlackCatClover(game, playerIndex);

  assert.equal(game.phase, "draw");
  assert.equal(game.players[targetPlayerIndex].bunnies[0].modifiers.length, 1);
  assert.equal(game.players[targetPlayerIndex].bunnies[0].modifiers[0].catalogNumber, "0058");
  assert.equal(game.players[playerIndex].bunnies[0].modifiers.length, 1);
  assert.equal(game.discardPile.filter((card) => ["0053", "0063"].includes(card.catalogNumber)).length, 2);
});

test("Black Cat discards all removed Clovers after an even Green roll", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(55),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const targetPlayerIndex = (playerIndex + 1) % game.players.length;
  const target = bunny("Even Roll Clover Target", "violet", "black-cat-even-target");
  target.modifiers = [
    createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(61)),
    createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(62)),
  ];
  game.players[targetPlayerIndex].bunnies = [target];
  game.players[playerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(53));

  game = playTopRun(game, playerIndex, seededRandom(56));
  game = chooseKillerBunniesBlackCatTarget(game, playerIndex, targetPlayerIndex, target.id);
  game = resolveKillerBunniesBlackCatRoll(game, playerIndex, () => 0.1); // Green d12 = 2, even

  assert.equal(game.phase, "draw");
  assert.equal(game.players[targetPlayerIndex].bunnies[0].modifiers.length, 0);
  assert.equal(game.discardPile.filter((card) => ["0053", "0061", "0062"].includes(card.catalogNumber)).length, 3);
});

test("Cabbage and Water use the official card denominations and are spent as units", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(200),
  });
  assert.deepEqual([...game.cabbageSupply].map((card) => card.units).sort((a, b) => a - b), [1, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5, 10]);
  assert.deepEqual([...game.waterSupply].map((card) => card.units).sort((a, b) => a - b), [1, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5, 10]);

  const target = bunny("Well Supplied Bunny", "blue", "supplied-bunny");
  game.players[1].bunnies = [target];
  game.players[1].cabbage = [{ id: "cabbage-five", units: 5 }];
  game.players[1].water = [{ id: "water-five", units: 5 }];
  game.players[1].feedingObligations = [{
    id: "feed-three", bunnyId: target.id,
    card: { id: "feed-three-card", name: "Feed 3", cabbageCost: 3, waterCost: 3 },
  }];
  game.currentPlayerIndex = 1;
  game.phase = "replace";
  game.players[1].hand = [plainRun("unit-replacement")];
  game = replaceBottomRun(game, 1, "unit-replacement");

  assert.equal(getKillerBunniesSupplyUnits(game.players[1], "cabbage"), 2);
  assert.equal(getKillerBunniesSupplyUnits(game.players[1], "water"), 2);
  assert.equal(game.cabbageDiscard[0].units, 5);
  assert.equal(game.waterDiscard[0].units, 5);
});

test("Heavenly Halo blocks weapons, hunger, and Terrible Misfortune", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(201),
  });
  const protectedBunny = bunny("Halo Bunny", "yellow", "halo-bunny");
  protectedBunny.modifiers = [createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(58))];
  game.players[1].bunnies = [protectedBunny];
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: { id: "halo-weapon", name: "Weapon", kind: "weapon", power: 12 } };
  game = chooseKillerBunniesTarget(game, 0, 1, protectedBunny.id);
  assert.equal(game.players[1].bunnies.length, 1);
  assert.match(game.message, /Halo blocked/);

  game.phase = "immediateTarget";
  game.pendingAction = { playerIndex: 0, effect: "terribleMisfortune", targetScope: "opponent", card: { id: "misfortune", name: "Terrible Misfortune" } };
  assert.throws(() => chooseKillerBunniesMisfortuneTarget(game, 0, protectedBunny.id, 1), /vulnerable/);
});

test("range weapons follow the ordered Bunny Circle and each owner rolls", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Lin" }],
    random: seededRandom(202),
  });
  const circle = [bunny("A", "blue", "circle-a"), bunny("B", "green", "circle-b"), bunny("C", "orange", "circle-c"), bunny("D", "red", "circle-d")];
  game.players[0].bunnies = [circle[0]];
  game.players[1].bunnies = [circle[1], circle[3]];
  game.players[2].bunnies = [circle[2]];
  game.bunnyCircle = circle.map((entry) => entry.id);
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(131)) };

  game = chooseKillerBunniesTarget(game, 0, 1, circle[1].id);
  assert.equal(game.phase, "areaWeaponRoll");
  assert.deepEqual(game.pendingAction.affected.map((entry) => entry.bunnyId).sort(), ["circle-a", "circle-b", "circle-c"]);
  assert.equal(game.pendingAction.affected.find((entry) => entry.bunnyId === "circle-b").power, 10);
  assert.ok(game.pendingAction.affected.filter((entry) => entry.bunnyId !== "circle-b").every((entry) => entry.power === 9));
  while (game.phase === "areaWeaponRoll") {
    game = resolveKillerBunniesAreaWeaponRoll(game, game.pendingAction.playerIndex, () => 0.99);
  }
  assert.equal(game.players.flatMap((player) => player.bunnies).length, 4, "all bunnies survive rolls of 12 against levels 10 and 9");
});

test("Carrot Top Casino makes the selected bunny owner roll and applies matching dice", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(203),
  });
  game = programAllPlayers(game);
  const cardPlayerIndex = game.currentPlayerIndex;
  const targetPlayerIndex = (cardPlayerIndex + 1) % 2;
  const target = bunny("Casino Bunny", "green", "casino-bunny");
  game.players[cardPlayerIndex].bunnies = [bunny("Required Bunny", "blue", "casino-required")];
  game.players[targetPlayerIndex].bunnies = [target];
  game.players[cardPlayerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(66));

  game = playTopRun(game, cardPlayerIndex, seededRandom(204));
  game = resolveKillerBunniesSpecialChoice(game, cardPlayerIndex, "use", seededRandom(205));
  game = chooseKillerBunniesBlueRollTarget(game, cardPlayerIndex, targetPlayerIndex, target.id);
  assert.equal(game.pendingAction.playerIndex, targetPlayerIndex);
  game = resolveKillerBunniesBlueCardRoll(game, targetPlayerIndex, () => 0);
  assert.equal(game.players[targetPlayerIndex].bunnies.length, 0, "five matching dice eliminate the target");
  assert.equal(game.phase, "draw");
});

test("Bad Karma persists until the chosen player launches a weapon at their own bunny", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(206),
  });
  game.phase = "playerTarget";
  game.pendingAction = { playerIndex: 0, effect: "playerTarget", card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(51)) };
  game = chooseKillerBunniesPlayerTarget(game, 0, 1);
  assert.equal(game.players[1].badKarma, true);

  const own = bunny("Karma Bunny", "red", "karma-bunny");
  game.players[1].bunnies = [own];
  game.phase = "target";
  game.pendingAction = { playerIndex: 1, effect: "weapon", allowOwnTarget: true, card: { id: "karma-weapon", name: "Weapon", kind: "weapon", power: 1 } };
  game = chooseKillerBunniesTarget(game, 1, 1, own.id);
  assert.equal(game.players[1].badKarma, false);
});

test("Area 51 returns the previous abductee, strips attachments, and abducts one bunny at a time", () => {
  let game = createKillerBunniesGame({ playerSeeds: [{ name: "Ada" }, { name: "Grace" }], random: seededRandom(207) });
  const first = bunny("First Abductee", "blue", "area-first");
  const second = bunny("Second Abductee", "green", "area-second");
  second.modifiers = [createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(61))];
  game.players[0].bunnies = [first];
  game.players[1].bunnies = [second];
  game.bunnyCircle = [first.id, second.id];
  game.phase = "utilityBunnyTarget";
  game.pendingAction = { playerIndex: 0, effect: "utilityBunnyTarget", card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(49)) };
  game = chooseKillerBunniesUtilityBunnyTarget(game, 0, 1, second.id);
  assert.equal(game.area51Abducted.bunny.id, second.id);
  assert.equal(game.area51Abducted.bunny.modifiers.length, 0);

  game.phase = "utilityBunnyTarget";
  game.pendingAction = { playerIndex: 1, effect: "utilityBunnyTarget", card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(50)) };
  game = chooseKillerBunniesUtilityBunnyTarget(game, 1, 0, first.id);
  assert.ok(game.players[1].bunnies.some((entry) => entry.id === second.id), "the first abductee returns to its owner");
  assert.equal(game.area51Abducted.bunny.id, first.id);
});

test("Heavenly Halo resolves an Area 51 attempt instead of trapping the game in target selection", () => {
  let game = createKillerBunniesGame({ playerSeeds: [{ name: "Ada" }, { name: "Grace" }], random: seededRandom(207) });
  const protectedBunny = bunny("Protected Bunny", "yellow", "area-halo-bunny");
  protectedBunny.modifiers = [createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(58))];
  const area51 = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(49));
  game.players[1].bunnies = [protectedBunny];
  game.bunnyCircle = [protectedBunny.id];
  game.phase = "utilityBunnyTarget";
  game.pendingAction = { playerIndex: 0, effect: "utilityBunnyTarget", card: area51 };

  game = chooseKillerBunniesUtilityBunnyTarget(game, 0, 1, protectedBunny.id);

  assert.equal(game.pendingAction, null);
  assert.equal(game.phase, "draw");
  assert.equal(game.area51Abducted?.bunny, undefined);
  assert.ok(game.discardPile.some((card) => card.id === area51.id));
  assert.match(game.message, /Heavenly Halo blocked Area 51/);
});

test("The Magic Fountain rolls five dice and revives one discarded bunny per match", () => {
  let game = createKillerBunniesGame({ playerSeeds: [{ name: "Ada" }, { name: "Grace" }], random: seededRandom(208) });
  const fountain = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(76));
  const discarded = bunny("Revived Bunny", "orange", "revived-bunny");
  game.discardPile.push(discarded);
  game.phase = "numberChoice";
  game.pendingAction = { playerIndex: 0, effect: "magicFountain", card: fountain };
  game = chooseKillerBunniesNumber(game, 0, 1);
  game = resolveKillerBunniesBlueSpecialRoll(game, 0, () => 0);
  assert.equal(game.phase, "reviveBunny");
  assert.equal(game.pendingAction.reviveCount, 1, "revival count is capped by available discarded bunnies");
  game = chooseKillerBunniesRevivedBunny(game, 0, discarded.id);
  assert.ok(game.players[0].bunnies.some((entry) => entry.id === discarded.id));
  assert.equal(game.phase, "draw");
});

test("Cyber Bunny attacks under the target owner's control and remains roaming", () => {
  let game = createKillerBunniesGame({ playerSeeds: [{ name: "Ada" }, { name: "Grace" }], random: seededRandom(209) });
  const own = bunny("Launch Bunny", "blue", "cyber-launch");
  const target = bunny("Cyber Target", "green", "cyber-target");
  game.players[0].bunnies = [own];
  game.players[1].bunnies = [target];
  game.bunnyCircle = [own.id, target.id];
  game.phase = "roamingTarget";
  game.pendingAction = { playerIndex: 0, effect: "roamingTarget", card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(54)) };
  game = chooseKillerBunniesRoamingTarget(game, 0, 1, target.id);
  assert.equal(game.pendingAction.playerIndex, 1);
  game = resolveKillerBunniesRoamingRoll(game, 1, () => 0.99);
  assert.equal(game.players[1].bunnies.length, 1);
  assert.equal(game.roamingEffects.length, 1);
  assert.equal(game.roamingEffects[0].currentBunnyId, own.id, "Cyber Bunny moves clockwise to the next viable bunny");
  assert.equal(game.phase, "draw");
});

test("Red free-supply Specials draw Cabbage, Water, and Defense Cards from their shops", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["red", "violet"],
    random: seededRandom(210),
  });
  game = programAllPlayers(game);
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  const cabbageBefore = player.cabbage.length;
  const waterBefore = player.water.length;
  player.topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(198));

  game = playTopRun(game, playerIndex, seededRandom(211));
  game = resolveKillerBunniesSpecialChoice(game, playerIndex, "use", seededRandom(212));
  assert.equal(game.phase, "draw");
  assert.equal(game.players[playerIndex].cabbage.length, cabbageBefore + 1);
  assert.equal(game.players[playerIndex].water.length, waterBefore + 1);

  game.phase = "play";
  game.currentPlayerIndex = playerIndex;
  game.runPlaysThisTurn = 0;
  game.players[playerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(199));
  const defenseBefore = game.players[playerIndex].defenseCards.length;
  const shopBefore = game.rooneysEmporium.defenseSupply.length;
  game = playTopRun(game, playerIndex, seededRandom(213));
  game = resolveKillerBunniesSpecialChoice(game, playerIndex, "use", seededRandom(214));
  assert.equal(game.phase, "draw");
  assert.equal(game.players[playerIndex].defenseCards.length, defenseBefore + 2);
  assert.equal(game.rooneysEmporium.defenseSupply.length, shopBefore - 2);

  for (const [cardNumber, resource, amount] of [[473, "cabbage", 2], [474, "water", 2]]) {
    game.phase = "play";
    game.currentPlayerIndex = playerIndex;
    game.runPlaysThisTurn = 0;
    const before = game.players[playerIndex][resource].length;
    game.players[playerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(cardNumber));
    game = playTopRun(game, playerIndex, seededRandom(cardNumber));
    game = resolveKillerBunniesSpecialChoice(game, playerIndex, "use", seededRandom(cardNumber + 1));
    assert.equal(game.phase, "draw");
    assert.equal(game.players[playerIndex][resource].length, before + amount);
  }

  game.phase = "play";
  game.currentPlayerIndex = playerIndex;
  game.runPlaysThisTurn = 0;
  game.players[playerIndex].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(359));
  const repeatedDefenseBefore = game.players[playerIndex].defenseCards.length;
  game = playTopRun(game, playerIndex, seededRandom(359));
  game = resolveKillerBunniesSpecialChoice(game, playerIndex, "use", seededRandom(360));
  assert.equal(game.players[playerIndex].defenseCards.length, repeatedDefenseBefore + 2);
});

test("Red and Violet range weapons queue every affected Bunny Circle target", () => {
  const makeRangeGame = () => {
    const game = createKillerBunniesGame({
      playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Lin" }],
      expansionIds: ["red", "violet"],
      random: seededRandom(215),
    });
    const circle = Array.from({ length: 6 }, (_, index) => bunny(`Range ${index}`, "blue", `range-${index}`));
    game.players[0].bunnies = [circle[0], circle[3]];
    game.players[1].bunnies = [circle[1], circle[4]];
    game.players[2].bunnies = [circle[2], circle[5]];
    game.bunnyCircle = circle.map((entry) => entry.id);
    return { game, circle };
  };

  for (const [cardNumber, expected, expectedRolls] of [
    [182, new Map([["range-1", 11], ["range-3", 9], ["range-5", 9]]), 5],
    [236, new Map([["range-1", 10], ["range-0", 9], ["range-2", 9]]), 3],
    [237, new Map([["range-0", 12], ["range-1", 12], ["range-2", 12], ["range-3", 12], ["range-4", 12], ["range-5", 12]]), 6],
  ]) {
    let { game, circle } = makeRangeGame();
    game.phase = "target";
    game.pendingAction = { playerIndex: 0, effect: "weapon", card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(cardNumber)) };
    game = chooseKillerBunniesTarget(game, 0, 1, circle[1].id);
    assert.equal(game.phase, "areaWeaponRoll", `#${cardNumber} should enter multi-target resolution`);
    const actual = new Map(game.pendingAction.affected.map((entry) => [entry.bunnyId, entry.power]));
    assert.deepEqual(actual, expected, `#${cardNumber} should apply its printed range levels`);
    let rollCount = 0;
    while (game.phase === "areaWeaponRoll") {
      game = resolveKillerBunniesAreaWeaponRoll(game, game.pendingAction.playerIndex, () => 0.99);
      rollCount += 1;
    }
    assert.equal(rollCount, expectedRolls, `#${cardNumber} should resolve every printed hit`);
  }
});

test("all twenty-two optional official decks are independently modular and use exact numbered-card counts", () => {
  assert.equal(KILLER_BUNNIES_EXPANSIONS.length, 22);
  assert.equal(new Set(KILLER_BUNNIES_EXPANSIONS.map((pack) => pack.id)).size, 22);
  assert.equal(KILLER_BUNNIES_EXPANSIONS.find((pack) => pack.id === "red").cardCounts.total, 55);
  assert.equal(KILLER_BUNNIES_EXPANSIONS.find((pack) => pack.id === "orange").cardCounts.total, 55);
  assert.equal(KILLER_BUNNIES_EXPANSIONS.find((pack) => pack.id === "ominous-onyx").cardCounts.total, 110);
  assert.equal(KILLER_BUNNIES_EXPANSIONS.find((pack) => pack.id === "conquest-blue").cardCounts.total, 110);

  const expansionIds = ["red", "violet"];
  const content = createKillerBunniesExpansionContent(expansionIds);
  const game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Bot", isComputer: true }],
    expansionIds,
    random: seededRandom(19),
  });

  assert.equal(content.mainDeck.length, 101);
  assert.deepEqual(game.expansionIds, expansionIds);
  assert.equal(game.expansionSummary.packCount, 2);
  assert.equal(game.cardCounts.numbered, 275);
  assert.equal(game.cardCounts.total, 325);
  assert.equal(game.cardCounts.mainDeck, 253);
  assert.equal(game.cardCounts.carrotMarket, 20);
  assert.equal(game.cardCounts.magicCarrots, 20);
  assert.equal(game.cardCounts.cabbage, 12);
  assert.equal(game.cardCounts.water, 12);
  assert.ok(game.mainDeck.some((card) => card.packId === "red"));
  assert.ok(game.mainDeck.some((card) => card.packId === "violet"));
});

test("Red and Orange boosters add Rooney's Weapons Emporium and Weil's Pawn Shop", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["red", "orange"],
    random: seededRandom(20),
  });
  game = programAllPlayers(game);
  game.players[0].bank.push({ id: "shop-dolla-20", kind: "money", name: "Kaballa Dolla", value: 20 });

  assert.equal(game.cardCounts.numbered, 275);
  assert.equal(game.cardCounts.total, 321);
  assert.equal(game.rooneysEmporium.isOpen, true);
  assert.equal(game.rooneysEmporium.defenseSupply.length, 6);
  assert.equal(game.rooneysEmporium.defensePrice, 3);
  assert.equal(game.weilsPawnShop.isOpen, true);
  assert.equal(game.weilsPawnShop.pawnSupply.length, 6);
  assert.equal(game.weilsPawnShop.pawnPrice, 5);
  assert.equal(game.weilsPawnShop.bunnyPrice, 10);

  assert.equal(getKillerBunniesShopItemStatus(game, 0, "rooneys", "defense").enabled, true);
  game = buyKillerBunniesShopItem(game, 0, "rooneys", "defense");
  assert.equal(game.players[0].defenseCards.length, 1);
  assert.equal(game.rooneysEmporium.defenseSupply.length, 5);

  const pawnId = game.weilsPawnShop.pawnSupply[0].id;
  game = buyKillerBunniesShopItem(game, 0, "weils", "pawn", pawnId);
  assert.equal(game.players[0].pawns.length, 1);
  assert.equal(game.weilsPawnShop.pawnSupply.length, 5);
});

test("selecting every deck loads each official CIN exactly once into its primary tabletop zone", () => {
  const game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: KILLER_BUNNIES_EXPANSIONS.map((pack) => pack.id),
    random: seededRandom(201),
  });
  const numberedCards = [
    ...game.mainDeck,
    ...game.players.flatMap((player) => [...player.hand, ...player.bank]),
    ...game.carrotMarket,
    ...game.starterCards,
  ];

  assert.equal(numberedCards.length, 1485);
  assert.equal(new Set(numberedCards.map((card) => card.catalogNumber)).size, 1485);
  assert.ok(numberedCards.every((card) => card.name === getKillerBunniesCatalogCard(card.number).name));
});

test("used weapons and eliminated bunnies become face-up shop inventory", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    expansionIds: ["red", "orange"],
    random: seededRandom(21),
  });
  game = programAllPlayers(game);
  const bunny = { id: "shop-bunny", kind: "bunny", type: "RUN", name: "Shop Bunny", color: "blue" };
  const weapon = { id: "shop-weapon", kind: "weapon", type: "RUN", name: "Shop Weapon", power: 6 };
  game.players[1].bunnies.push(bunny);
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: weapon };
  game = chooseKillerBunniesTarget(game, 0, 1, bunny.id);
  game = resolveKillerBunniesDefense(game, 1, "roll", () => 0);

  assert.equal(game.rooneysEmporium.weaponDiscard[0].id, weapon.id);
  assert.equal(game.weilsPawnShop.bunnyDiscard[0].id, bunny.id);
});

test("a computer-only game can finish with every expansion enabled", () => {
  const random = seededRandom(29);
  let game = createKillerBunniesGame({
    playerSeeds: [
      { name: "Bot One", isComputer: true },
      { name: "Bot Two", isComputer: true },
      { name: "Bot Three", isComputer: true },
    ],
    expansionIds: KILLER_BUNNIES_EXPANSIONS.map((pack) => pack.id),
    random,
  });
  game = runKillerBunniesComputers(game, random);

  assert.equal(game.phase, "reveal");
  assert.equal(game.expansionSummary.packCount, 22);
  assert.equal(game.cardCounts.numbered, 1485);
  assert.equal(game.cardCounts.total, 1561);
  assert.equal(game.players.reduce((total, player) => total + player.carrots.length, 0), 46);
});

test("the main pile unlocks only after TOP RUN resolves", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Bot", isComputer: true }],
    random: seededRandom(21),
  });
  game = programAllPlayers(game);
  assert.equal(getKillerBunniesPileStatus(game, 0, "main").enabled, false);

  game = playTopRun(game, 0, seededRandom(22));
  assert.equal(game.phase, "draw");
  assert.equal(getKillerBunniesPileStatus(game, 0, "main").enabled, true);

  while (game.phase === "draw") game = drawKillerBunniesPile(game, 0, "main", {}, seededRandom(23));
  assert.equal(game.phase, "replace");
  const chosenCard = game.players[0].hand[0];
  game = replaceBottomRun(game, 0, chosenCard.id);
  assert.equal(game.currentPlayerIndex, 1);
  assert.equal(game.phase, "play");
});

test("aggressive RUN cards require a living bunny and are discarded without resolving", () => {
  const aggressiveCards = [
    { id: "needs-bunny-weapon", kind: "weapon", type: "RUN", name: "Test Weapon", power: 8 },
    { id: "needs-bunny-feed", kind: "feed", type: "RUN", name: "Test Feed", cabbageCost: 1, waterCost: 1 },
  ];

  for (const card of aggressiveCards) {
    let game = createKillerBunniesGame({
      playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
      random: seededRandom(221),
    });
    game = programAllPlayers(game);
    game.discardPile.push(game.players[0].topRun);
    game.players[0].topRun = card;
    const carrotCount = game.carrotMarket.length;

    assert.equal(getKillerBunniesCardPlayStatus(game.players[0], card).enabled, false);
    assert.match(getKillerBunniesCardPlayStatus(game.players[0], card).reason, /living bunny/);
    game = playTopRun(game, 0, seededRandom(222));

    assert.equal(game.phase, "draw");
    assert.equal(game.pendingAction, null);
    assert.equal(game.discardPile.some((entry) => entry.id === card.id), true);
    assert.equal(game.carrotMarket.length, carrotCount);
    assert.match(game.message, /without a living bunny/);
  }
});

test("aggressive RUN cards become playable once their owner has a living bunny", () => {
  const player = { bunnies: [{ id: "living-bunny" }] };
  for (const kind of ["weapon", "feed"]) {
    assert.equal(getKillerBunniesCardPlayStatus(player, { kind, name: kind }).enabled, true);
  }
});

test("Half Price Coupon uses its automated handler instead of a guided ruling", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(224),
  });
  game = programAllPlayers(game);
  const guidedCard = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(71));
  game.players[0].bunnies.push(bunny("Required Bunny", "blue", "manual-required"));
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = guidedCard;

  game = playTopRun(game, 0, seededRandom(225));
  game = resolveKillerBunniesSpecialChoice(game, 0, "use", seededRandom(225));
  assert.equal(game.phase, "draw");
  assert.equal(game.pendingAction, null);
  assert.equal(game.discardPile.some((card) => card.catalogNumber === "0071"), true);
  assert.equal(getKillerBunniesKaballasPrice(game, 0, "cabbage"), 2);
});

test("Poverty Poker pools a combined stake from every eligible player and resolves rerolls and ties", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Linus" }],
    expansionIds: ["orange", "green"],
    random: seededRandom(240),
  });
  game = programAllPlayers(game);
  const callerIndex = game.currentPlayerIndex;
  const eligibleIndex = (callerIndex + 1) % 3;
  const ineligibleIndex = (callerIndex + 2) % 3;
  const poker = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(65));

  for (const [index, player] of game.players.entries()) {
    player.bank = [{ id: `bank-${index}`, value: index === ineligibleIndex ? 1 : 5 }];
    player.dollaCredit = 0;
    player.cabbage = [{ id: `cabbage-${index}`, units: 2 }];
    player.water = [{ id: `water-${index}`, units: 1 }];
    player.resourceCredits = { cabbage: 0, water: 0 };
    player.defenseCards = [{ id: `defense-${index}`, units: 3 }];
    player.pawns = [{ id: `pawn-${index}`, name: `Pawn ${index}`, color: "blue" }];
    player.savedSpecials = [{ id: `special-${index}`, name: `Special ${index}`, type: "SPECIAL" }];
    player.carrots = [{ id: `carrot-${index}`, label: index + 1 }];
    player.bunnies = [bunny(`Poker Bunny ${index}`, "blue", `poker-bunny-${index}`)];
  }
  game.players[eligibleIndex].feedingObligations = [{
    id: "traveling-feed",
    bunnyId: `poker-bunny-${eligibleIndex}`,
    card: { id: "feed-card", name: "Feed The Bunny" },
    cabbageCost: 1,
    waterCost: 1,
  }];
  game.discardPile.push(game.players[callerIndex].topRun);
  game.players[callerIndex].topRun = poker;

  game = playTopRun(game, callerIndex, seededRandom(241));
  assert.equal(game.phase, "povertyPokerCall");
  assert.throws(() => callKillerBunniesPovertyPoker(game, callerIndex, { dolla: 6 }), /cannot cover/i);

  const stakes = { dolla: 2, cabbage: 2, water: 1, defense: 3, carrots: 1, bunnies: 1, specials: 1, pawns: 1 };
  game = callKillerBunniesPovertyPoker(game, callerIndex, stakes);
  assert.equal(game.phase, "povertyPokerAnte");
  assert.deepEqual(game.pendingAction.eligiblePlayerIndexes, [callerIndex, eligibleIndex]);
  assert.equal(game.pendingAction.playerIndex, callerIndex);

  const selectionFor = (index) => ({
    bunnyIds: [`poker-bunny-${index}`],
    carrotIds: [`carrot-${index}`],
    specialIds: [`special-${index}`],
    pawnIds: [`pawn-${index}`],
  });
  game = anteKillerBunniesPovertyPoker(game, callerIndex, selectionFor(callerIndex));
  assert.equal(game.pendingAction.playerIndex, eligibleIndex);
  game = anteKillerBunniesPovertyPoker(game, eligibleIndex, selectionFor(eligibleIndex));
  assert.equal(game.phase, "povertyPokerRoll");
  assert.equal(game.pendingAction.pot.dolla, 4);
  assert.equal(game.pendingAction.pot.cabbage, 4);
  assert.equal(game.pendingAction.pot.water, 2);
  assert.equal(game.pendingAction.pot.defense, 6);

  game = resolveKillerBunniesPovertyPokerRoll(game, callerIndex, "roll", () => 0.25); // 4
  game = resolveKillerBunniesPovertyPokerRoll(game, eligibleIndex, "roll", () => 0.75); // 10
  assert.equal(game.phase, "povertyPokerReroll");
  game = resolveKillerBunniesPovertyPokerRoll(game, callerIndex, "reroll", () => 0.75); // replacement 10
  assert.equal(game.phase, "povertyPokerRoll");
  assert.deepEqual(game.pendingAction.contenderIndexes, [callerIndex, eligibleIndex]);

  game = resolveKillerBunniesPovertyPokerRoll(game, callerIndex, "roll", () => 0.25); // 4
  game = resolveKillerBunniesPovertyPokerRoll(game, eligibleIndex, "roll", () => 0.9); // 11

  assert.equal(game.phase, "draw");
  assert.equal(game.pendingAction, null);
  assert.equal(bankTotal(game.players[eligibleIndex]), 7);
  assert.equal(getKillerBunniesSupplyUnits(game.players[eligibleIndex], "cabbage"), 4);
  assert.equal(getKillerBunniesSupplyUnits(game.players[eligibleIndex], "water"), 2);
  assert.equal(game.players[eligibleIndex].defenseCredit, 6);
  assert.equal(game.players[eligibleIndex].bunnies.length, 2);
  assert.equal(game.players[eligibleIndex].carrots.length, 2);
  assert.equal(game.players[eligibleIndex].savedSpecials.length, 2);
  assert.equal(game.players[eligibleIndex].pawns.length, 2);
  assert.equal(game.players[eligibleIndex].feedingObligations.some((entry) => entry.id === "traveling-feed"), true);
  assert.equal(game.players[ineligibleIndex].bunnies.length, 1);
  assert.equal(game.discardPile.some((card) => card.catalogNumber === "0065"), true);
});

test("Carrot Thief offers the available numbered dice and steals the matching Carrot", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["violet"],
    random: seededRandom(226),
  });
  game = programAllPlayers(game);
  const thief = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(136));
  const stolenCarrot = game.carrotMarket.find((card) => card.label === "6");
  game.carrotMarket = game.carrotMarket.filter((card) => card.id !== stolenCarrot.id);
  game.players[1].carrots.push(stolenCarrot);
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = thief;

  game = playTopRun(game, 0, seededRandom(227));
  assert.equal(game.phase, "cardDiceRoll");
  assert.deepEqual(game.pendingAction.diceChoices.map((choice) => choice.id), ["orange-d12", "clear-d20"]);

  game = resolveKillerBunniesCardDiceRoll(game, 0, "orange-d12", () => 5 / 12);
  assert.equal(game.phase, "draw");
  assert.equal(game.players[0].carrots.some((card) => card.label === "6"), true);
  assert.equal(game.players[1].carrots.some((card) => card.label === "6"), false);
  assert.deepEqual(game.lastRoll, {
    id: 1,
    dice: [{ value: 6, sides: 12, color: "orange" }],
    value: 6,
    sides: 12,
    color: "orange",
    label: "Carrot Thief",
    rollerName: "Ada",
  });

  let closedMarketGame = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["violet"],
    random: seededRandom(230),
  });
  closedMarketGame = programAllPlayers(closedMarketGame);
  closedMarketGame.kaballasMarket.isOpen = false;
  closedMarketGame.discardPile.push(closedMarketGame.players[0].topRun);
  closedMarketGame.players[0].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(136));
  closedMarketGame = playTopRun(closedMarketGame, 0, seededRandom(231));
  closedMarketGame = resolveKillerBunniesCardDiceRoll(closedMarketGame, 0, "clear-d20", () => 16 / 20);
  assert.equal(closedMarketGame.players[0].carrots.some((card) => card.label === "17"), true);
  assert.deepEqual(closedMarketGame.lastRoll, {
    id: 1,
    dice: [{ value: 17, sides: 20, color: "clear" }],
    value: 17,
    sides: 20,
    color: "clear",
    label: "Carrot Thief",
    rollerName: "Ada",
  });

  let noVioletGame = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(232),
  });
  noVioletGame = programAllPlayers(noVioletGame);
  noVioletGame.discardPile.push(noVioletGame.players[0].topRun);
  noVioletGame.players[0].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(136));
  noVioletGame = playTopRun(noVioletGame, 0, seededRandom(233));
  assert.deepEqual(noVioletGame.pendingAction.diceChoices.map((choice) => choice.id), ["orange-d12"]);
});

test("Bunny Block Bid auctions a selected bunny in turn order and pays Kaballa", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Lin" }],
    random: seededRandom(234),
  });
  game = programAllPlayers(game);
  const auctionCard = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(135));
  const auctionedBunny = bunny("Halo Auction Bunny", "green", "halo-auction-bunny");
  auctionedBunny.modifiers = [{ id: "auction-halo", name: "The Heavenly Halo", cloverValue: 0 }];
  game.players[0].bunnies.push(bunny("Ada Bid Bunny", "blue", "ada-bid-bunny"));
  game.players[1].bunnies.push(auctionedBunny);
  game.players[1].feedingObligations.push({
    id: "auction-feed",
    bunnyId: auctionedBunny.id,
    card: { id: "auction-feed-card", name: "Feed The Bunny" },
    cabbageCost: 1,
    waterCost: 1,
  });
  game.bunnyCircle = ["ada-bid-bunny", auctionedBunny.id];
  for (const player of game.players) {
    player.bank = [];
    player.dollaCredit = 0;
  }
  game.players[0].bank.push({ id: "ada-dolla", kind: "money", value: 10, name: "Kaballa Dolla – 10" });
  game.players[1].bank.push({ id: "grace-dolla", kind: "money", value: 5, name: "Kaballa Dolla – 5" });
  game.players[2].bank.push({ id: "lin-dolla", kind: "money", value: 10, name: "Kaballa Dolla – 10" });
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = auctionCard;

  game = playTopRun(game, 0, seededRandom(235));
  assert.equal(game.phase, "auctionTarget");
  game = chooseKillerBunniesAuctionTarget(game, 0, 1, auctionedBunny.id);
  assert.equal(game.phase, "auctionBid");
  assert.equal(game.pendingAction.playerIndex, 0, "the card player bids first");

  game = placeKillerBunniesAuctionBid(game, 0, 2);
  assert.equal(game.pendingAction.playerIndex, 1);
  game = placeKillerBunniesAuctionBid(game, 1, 4);
  assert.equal(game.pendingAction.playerIndex, 2);
  game = placeKillerBunniesAuctionBid(game, 2, 6);
  assert.equal(game.pendingAction.playerIndex, 0);
  game = placeKillerBunniesAuctionBid(game, 0, null);
  assert.equal(game.pendingAction.playerIndex, 1);
  game = placeKillerBunniesAuctionBid(game, 1, null);

  assert.equal(game.phase, "draw");
  assert.equal(game.players[1].bunnies.some((entry) => entry.id === auctionedBunny.id), false);
  assert.equal(game.players[2].bunnies.some((entry) => entry.id === auctionedBunny.id), true);
  assert.equal(game.players[2].bunnies.find((entry) => entry.id === auctionedBunny.id).modifiers[0].id, "auction-halo");
  assert.equal(game.players[1].feedingObligations.length, 0);
  assert.equal(game.players[2].feedingObligations[0].bunnyId, auctionedBunny.id);
  assert.deepEqual(game.bunnyCircle, ["ada-bid-bunny", auctionedBunny.id]);
  assert.equal(bankTotal(game.players[2]), 4, "change from the winning 10 Dolla card remains available");
  assert.equal(game.discardPile.some((card) => card.id === "lin-dolla"), true);
  assert.equal(game.discardPile.some((card) => card.catalogNumber === "0135"), true);
});

test("Bunny Block Bid leaves the bunny in place when every player passes", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(236),
  });
  game = programAllPlayers(game);
  const target = bunny("Unsold Bunny", "yellow", "unsold-bunny");
  game.players[0].bunnies.push(bunny("Required Bunny", "blue", "required-auction-bunny"));
  game.players[1].bunnies.push(target);
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(135));

  game = playTopRun(game, 0, seededRandom(237));
  game = chooseKillerBunniesAuctionTarget(game, 0, 1, target.id);
  game = placeKillerBunniesAuctionBid(game, 0, null);
  game = placeKillerBunniesAuctionBid(game, 1, null);

  assert.equal(game.phase, "draw");
  assert.equal(game.players[1].bunnies.some((entry) => entry.id === target.id), true);
  assert.match(game.message, /no bids/i);
});

test("Bunny Exchange trades one selected bunny for two selected opposing bunnies", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["violet"],
    random: seededRandom(238),
  });
  game = programAllPlayers(game);
  const given = bunny("Given Bunny", "blue", "exchange-given");
  given.modifiers = [{ id: "given-clover", name: "Lucky Clover", cloverValue: 1 }];
  const takenOne = bunny("Taken One", "green", "exchange-taken-one");
  const takenTwo = bunny("Taken Two", "orange", "exchange-taken-two");
  takenTwo.modifiers = [{ id: "taken-halo", name: "The Heavenly Halo", cloverValue: 0 }];
  game.players[0].bunnies = [given];
  game.players[1].bunnies = [takenOne, takenTwo];
  game.players[0].feedingObligations = [{ id: "give-feed", bunnyId: given.id, card: { id: "give-feed-card", name: "Feed" } }];
  game.players[1].feedingObligations = [{ id: "take-feed", bunnyId: takenOne.id, card: { id: "take-feed-card", name: "Feed" } }];
  game.bunnyCircle = [given.id, takenOne.id, takenTwo.id];
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(240));

  game = playTopRun(game, 0, seededRandom(239));
  assert.equal(game.phase, "bunnyExchangeGive");
  game = chooseKillerBunniesBunnyExchangeGive(game, 0, given.id);
  assert.equal(game.phase, "bunnyExchangeTake");
  game = resolveKillerBunniesBunnyExchange(game, 0, 1, [takenOne.id, takenTwo.id]);

  assert.equal(game.phase, "draw");
  assert.deepEqual(game.players[0].bunnies.map((entry) => entry.id).sort(), [takenOne.id, takenTwo.id].sort());
  assert.deepEqual(game.players[1].bunnies.map((entry) => entry.id), [given.id]);
  assert.equal(game.players[0].bunnies.find((entry) => entry.id === takenTwo.id).modifiers[0].id, "taken-halo");
  assert.equal(game.players[1].bunnies[0].modifiers[0].id, "given-clover");
  assert.equal(game.players[0].feedingObligations[0].bunnyId, takenOne.id);
  assert.equal(game.players[1].feedingObligations[0].bunnyId, given.id);
  assert.deepEqual(game.bunnyCircle, [given.id, takenOne.id, takenTwo.id]);
  assert.equal(game.discardPile.some((card) => card.catalogNumber === "0240"), true);
});

test("Bunny Exchange falls back to a one-for-one swap when the opponent has one bunny", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["violet"],
    random: seededRandom(240),
  });
  game = programAllPlayers(game);
  const given = bunny("Solo Give", "violet", "solo-give");
  const received = bunny("Solo Receive", "yellow", "solo-receive");
  game.players[0].bunnies = [given];
  game.players[1].bunnies = [received];
  game.bunnyCircle = [given.id, received.id];
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(240));

  game = playTopRun(game, 0, seededRandom(241));
  game = chooseKillerBunniesBunnyExchangeGive(game, 0, given.id);
  game = resolveKillerBunniesBunnyExchange(game, 0, 1, [received.id]);

  assert.deepEqual(game.players[0].bunnies.map((entry) => entry.id), [received.id]);
  assert.deepEqual(game.players[1].bunnies.map((entry) => entry.id), [given.id]);
  assert.match(game.message, /one bunny for one bunny/i);
});

test("Russian Roulette 0143 lets every owner choose and roll, then eliminates the unique low bunny", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(228),
  });
  game = programAllPlayers(game);
  const russianRoulette = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(143));
  game.players[0].bunnies.push(bunny("Ada Bunny", "blue", "ada-roulette"));
  game.players[1].bunnies.push(bunny("Grace Bunny", "green", "grace-roulette"));
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = russianRoulette;

  game = playTopRun(game, 0, seededRandom(229));
  assert.equal(game.phase, "russianRouletteChoose");
  game = resolveKillerBunniesCardAction(game, 0, { bunnyId: "ada-roulette" });
  game = resolveKillerBunniesCardAction(game, 1, { bunnyId: "grace-roulette" });
  game = resolveKillerBunniesCardAction(game, 0, {}, () => 0.5);
  assert.equal(game.lastRoll.value, 7);
  game = resolveKillerBunniesCardAction(game, 1, {}, () => 0);
  assert.equal(game.phase, "russianRouletteReroll");
  game = resolveKillerBunniesCardAction(game, 0, { choice: "keep" });
  assert.equal(game.players[1].bunnies.some((entry) => entry.id === "grace-roulette"), false);
  assert.ok(game.discardPile.some((card) => card.id === russianRoulette.id));
});

test("SPECIAL cards may be saved only after reaching TOP RUN and played later as an extra action", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(24),
  });
  game = programAllPlayers(game);
  const special = {
    id: "test-saved-special",
    kind: "defense",
    type: "SPECIAL",
    name: "Emergency Burrow",
    detail: "Prepare a shield.",
  };
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = special;

  game = playTopRun(game, 0, seededRandom(25));
  assert.equal(game.phase, "specialChoice");
  assert.equal(game.pendingAction.card.id, special.id);
  assert.equal(game.players[0].savedSpecials.length, 0);

  game = resolveKillerBunniesSpecialChoice(game, 0, "save", seededRandom(26));
  assert.equal(game.phase, "draw");
  assert.equal(game.players[0].savedSpecials[0].id, special.id);
  assert.equal(game.discardPile.some((card) => card.id === special.id), false);

  const programmedTopId = game.players[0].topRun.id;
  game.phase = "play";
  game.runPlaysThisTurn = 0;
  game = playSavedKillerBunniesSpecial(game, 0, special.id, seededRandom(27));
  assert.equal(game.phase, "play");
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.players[0].topRun.id, programmedTopId);
  assert.equal(game.players[0].savedSpecials.length, 0);
  assert.equal(game.players[0].shields, 1);
  assert.equal(game.discardPile.some((card) => card.id === special.id), true);
});

test("VERY SPECIAL cards saved through TOP RUN can be played during another human player's play phase", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(28),
  });
  game.players[0].savedSpecials.push({
    id: "test-very-special",
    kind: "verySpecial",
    type: "VERY SPECIAL",
    name: "Portable Burrow",
    effect: "burrow",
    detail: "Prepare a shield.",
  });
  game.currentPlayerIndex = 1;
  game.phase = "play";

  game = playSavedKillerBunniesSpecial(game, 0, "test-very-special", seededRandom(29));
  assert.equal(game.players[0].shields, 1);
  assert.equal(game.players[0].savedSpecials.length, 0);
  assert.equal(game.currentPlayerIndex, 1);
  assert.equal(game.phase, "play");
});

test("a weapon waits for the targeted player to roll the die", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    random: seededRandom(30),
  });
  const bunny = { id: "defending-bunny", kind: "bunny", type: "RUN", name: "Blue Bunny", color: "blue" };
  const weapon = { id: "test-weapon", kind: "weapon", type: "RUN", name: "Test Mallet", power: 6 };
  game.players[1].bunnies.push(bunny);
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: weapon };

  game = chooseKillerBunniesTarget(game, 0, 1, bunny.id, () => 0);
  assert.equal(game.phase, "defend");
  assert.equal(game.pendingAction.playerIndex, 1);
  assert.equal(game.pendingAction.bunnyId, bunny.id);
  assert.equal(game.lastRoll, null);
  assert.match(game.message, /must roll a d12/);

  game = resolveKillerBunniesDefense(game, 1, "roll", () => 0);
  assert.deepEqual(game.lastRoll, {
    id: 1,
    dice: [{ value: 1, sides: 12, color: null }],
    value: 1,
    sides: 12,
    label: weapon.name,
    rollerName: "Defender",
  });
  assert.equal(game.players[1].bunnies.length, 0);
  assert.equal(game.phase, "draw");
});

test("a feeding card stays on its target until the end of that player's turn", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    random: seededRandom(32),
  });
  const bunny = { id: "hungry-bunny", kind: "bunny", type: "RUN", name: "Green Bunny", color: "green" };
  const feeding = {
    id: "test-feeding",
    kind: "feed",
    type: "RUN",
    name: "Feed the Bunny",
    cabbageCost: 2,
    waterCost: 1,
  };
  game.players[1].bunnies.push(bunny);
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "feed", card: feeding };

  game = chooseKillerBunniesTarget(game, 0, 1, bunny.id);
  assert.equal(game.phase, "draw");
  assert.equal(game.pendingAction, null);
  assert.equal(game.players[1].bunnies.length, 1);
  assert.equal(game.players[1].feedingObligations.length, 1);
  assert.equal(game.players[1].feedingObligations[0].bunnyId, bunny.id);
  assert.match(game.message, /until the end of their next turn/);
});

test("the targeted player can buy food and automatically feeds the bunny at turn end", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    random: seededRandom(33),
  });
  const bunny = { id: "fed-later-bunny", kind: "bunny", type: "RUN", name: "Yellow Bunny", color: "yellow" };
  const feeding = { id: "fed-later-card", kind: "feed", type: "RUN", name: "Feed the Bunny", cabbageCost: 1, waterCost: 1 };
  game.players[1].bunnies.push(bunny);
  game.players[1].bank.push(
    { id: "feed-money-one", kind: "money", name: "Kaballa Dolla", value: 10 },
    { id: "feed-money-two", kind: "money", name: "Kaballa Dolla", value: 10 },
  );
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "feed", card: feeding };
  game = chooseKillerBunniesTarget(game, 0, 1, bunny.id);

  game.currentPlayerIndex = 1;
  game.phase = "play";
  game.purchases = { cabbage: false, water: false, carrot: false };
  game.players[1].hand = [];
  assert.match(getKillerBunniesPileStatus(game, 1, "cabbage").reason, /feeding/);
  assert.match(getKillerBunniesPileStatus(game, 1, "water").reason, /feeding/);
  game = drawKillerBunniesPile(game, 1, "cabbage");
  game = drawKillerBunniesPile(game, 1, "water");
  assert.equal(game.players[1].feedingObligations.length, 1);
  assert.equal(game.players[1].cabbage.length, 1);
  assert.equal(game.players[1].water.length, 1);

  game.players[1].topRun = { id: "safe-top", kind: "bunny", type: "RUN", name: "Safe Bunny", color: "blue" };
  game.players[1].bottomRun = { id: "safe-bottom", kind: "bunny", type: "RUN", name: "Next Bunny", color: "green" };
  game = playTopRun(game, 1, seededRandom(34));
  const playableIndex = game.mainDeck.findIndex((card) => card.kind !== "money");
  const [playable] = game.mainDeck.splice(playableIndex, 1);
  game.mainDeck.push(playable);
  game = drawKillerBunniesPile(game, 1, "main", {}, seededRandom(35));
  game = replaceBottomRun(game, 1, playable.id);

  assert.equal(game.players[1].feedingObligations.length, 0);
  assert.ok(game.players[1].bunnies.some((entry) => entry.id === bunny.id));
  assert.equal(game.players[1].cabbage.length, 0);
  assert.equal(game.players[1].water.length, 0);
  assert.ok(game.discardPile.some((card) => card.id === feeding.id));
});

test("a bunny that is not fed leaves only when its owner's turn ends", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    random: seededRandom(36),
  });
  const bunny = { id: "unfed-bunny", kind: "bunny", type: "RUN", name: "Hungry Bunny", color: "orange" };
  const feeding = { id: "unfed-card", kind: "feed", type: "RUN", name: "Feed the Bunny", cabbageCost: 2, waterCost: 2 };
  game.players[1].bunnies.push(bunny);
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "feed", card: feeding };
  game = chooseKillerBunniesTarget(game, 0, 1, bunny.id);
  assert.ok(game.players[1].bunnies.some((entry) => entry.id === bunny.id));

  game.currentPlayerIndex = 1;
  game.phase = "replace";
  game.players[1].hand = [{ id: "replacement", kind: "bunny", type: "RUN", name: "Replacement Bunny", color: "red" }];
  game = replaceBottomRun(game, 1, "replacement");

  assert.equal(game.players[1].feedingObligations.length, 0);
  assert.ok(!game.players[1].bunnies.some((entry) => entry.id === bunny.id));
  assert.ok(game.discardPile.some((card) => card.id === feeding.id));
});

test("Everyone Feed A Bunny 0231 makes every opponent choose one bunny and excludes its player", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Left" }, { name: "Right" }],
    expansionIds: ["violet"],
    random: seededRandom(231),
  });
  game = programAllPlayers(game);
  const attackerIndex = game.currentPlayerIndex;
  const opponentIndexes = game.players.map((_, index) => index).filter((index) => index !== attackerIndex);
  game.players[attackerIndex].bunnies = [bunny("Attacker Bunny", "red", "attacker-bunny")];
  for (const index of opponentIndexes) {
    game.players[index].bunnies = [
      bunny(`${game.players[index].name} First Bunny`, "blue", `${index}-first-bunny`),
      bunny(`${game.players[index].name} Second Bunny`, "green", `${index}-second-bunny`),
    ];
  }
  const everyoneFeed = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(231));
  game.players[attackerIndex].topRun = everyoneFeed;

  game = playTopRun(game, attackerIndex, seededRandom(232));
  assert.equal(game.phase, "everyoneFeedTarget");
  assert.equal(game.pendingAction.playerIndex, opponentIndexes[0]);
  assert.equal(game.pendingAction.attackingPlayerIndex, attackerIndex);

  for (const opponentIndex of opponentIndexes) {
    const chosen = game.players[opponentIndex].bunnies[1];
    assert.equal(game.pendingAction.playerIndex, opponentIndex);
    game = chooseKillerBunniesEveryoneFeedBunny(game, opponentIndex, chosen.id);
    assert.equal(game.players[opponentIndex].feedingObligations.length, 1);
    assert.equal(game.players[opponentIndex].feedingObligations[0].bunnyId, chosen.id);
    assert.equal(game.players[opponentIndex].feedingObligations[0].cabbageCost, 3);
    assert.equal(game.players[opponentIndex].feedingObligations[0].waterCost, 3);
  }

  assert.equal(game.phase, "draw");
  assert.equal(game.currentPlayerIndex, attackerIndex);
  assert.equal(game.players[attackerIndex].feedingObligations.length, 0);
  assert.equal(game.discardPile.filter((card) => card.id === everyoneFeed.id).length, 1);
});

test("Half Price Coupon 0071 discounts Kaballa's Market for the rest of the turn", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(71),
  }));
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  const coupon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(71));
  player.savedSpecials.push(coupon);
  player.dollaCredit = 20;

  game = playSavedKillerBunniesSpecial(game, playerIndex, coupon.id);

  assert.equal(game.phase, "play");
  assert.equal(getKillerBunniesKaballasPrice(game, playerIndex, "cabbage"), 2);
  assert.equal(getKillerBunniesKaballasPrice(game, playerIndex, "water"), 2);
  assert.equal(getKillerBunniesKaballasPrice(game, playerIndex, "carrot"), 5);
  const balanceBeforeShopping = bankTotal(game.players[playerIndex]);
  game = drawKillerBunniesPile(game, playerIndex, "cabbage");
  assert.equal(bankTotal(game.players[playerIndex]), balanceBeforeShopping - 2);
  assert.equal(game.players[playerIndex].cabbage.length, 1);
  assert.ok(game.discardPile.some((card) => card.id === coupon.id));
});

test("Half Price Coupon 0071 still permits shopping after being used from TOP RUN", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(72),
  }));
  const playerIndex = game.currentPlayerIndex;
  const coupon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(71));
  game.players[playerIndex].topRun = coupon;
  game.players[playerIndex].dollaCredit = 10;

  game = playTopRun(game, playerIndex);
  game = resolveKillerBunniesSpecialChoice(game, playerIndex, "use");

  assert.equal(game.phase, "draw");
  assert.equal(getKillerBunniesPileStatus(game, playerIndex, "water").enabled, true);
  game = drawKillerBunniesPile(game, playerIndex, "water");
  assert.equal(bankTotal(game.players[playerIndex]), 8);
  assert.equal(game.phase, "draw");
});

test("Magic Spatula 0080 interrupts and cancels a weapon before its roll", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    random: seededRandom(80),
  }));
  const attackerIndex = game.currentPlayerIndex;
  const defenderIndex = (attackerIndex + 1) % 2;
  const target = bunny("Target Bunny", "blue", "magic-spatula-target");
  game.players[attackerIndex].bunnies = [bunny("Attacker Bunny", "red", "magic-spatula-attacker")];
  game.players[defenderIndex].bunnies = [target];
  const weapon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(31));
  const spatula = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(80));
  game.players[defenderIndex].savedSpecials.push(spatula);
  game.phase = "target";
  game.pendingAction = { playerIndex: attackerIndex, effect: "weapon", card: weapon };
  game = chooseKillerBunniesTarget(game, attackerIndex, defenderIndex, target.id);

  assert.equal(game.phase, "defend");
  assert.equal(getKillerBunniesSavedSpecialStatus(game, defenderIndex, spatula).enabled, true);
  game = playSavedKillerBunniesSpecial(game, defenderIndex, spatula.id);

  assert.equal(game.phase, "draw");
  assert.equal(game.players[defenderIndex].bunnies.some((entry) => entry.id === target.id), true);
  assert.equal(game.players[defenderIndex].savedSpecials.length, 0);
  assert.ok(game.discardPile.some((card) => card.id === weapon.id));
  assert.ok(game.discardPile.some((card) => card.id === spatula.id));
});

test("Rooney's Reusables 0081 pauses a resolved weapon and launches it once more", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    random: seededRandom(81),
  }));
  const attackerIndex = game.currentPlayerIndex;
  const defenderIndex = (attackerIndex + 1) % 2;
  game.players[attackerIndex].bunnies = [bunny("Attacker Bunny", "red", "rooney-attacker")];
  game.players[defenderIndex].bunnies = [bunny("First Target", "blue", "rooney-first"), bunny("Second Target", "green", "rooney-second")];
  const weapon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(31));
  const reusables = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(81));
  game.players[attackerIndex].savedSpecials.push(reusables);
  game.phase = "target";
  game.pendingAction = { playerIndex: attackerIndex, effect: "weapon", card: weapon };
  game = chooseKillerBunniesTarget(game, attackerIndex, defenderIndex, "rooney-first");
  game = resolveKillerBunniesDefense(game, defenderIndex, "roll", () => 0.99);

  assert.equal(game.phase, "weaponReuseChoice");
  assert.equal(game.discardPile.some((card) => card.id === weapon.id), false);
  game = resolveKillerBunniesWeaponReuse(game, attackerIndex, "reuse");
  assert.equal(game.phase, "target");
  game = chooseKillerBunniesTarget(game, attackerIndex, defenderIndex, "rooney-second");
  game = resolveKillerBunniesDefense(game, defenderIndex, "roll", () => 0.99);

  assert.equal(game.phase, "draw");
  assert.equal(game.players[attackerIndex].savedSpecials.length, 0);
  assert.ok(game.discardPile.some((card) => card.id === weapon.id));
  assert.ok(game.discardPile.some((card) => card.id === reusables.id));
});

test("Timid Bunny 0170 offers one replacement roll and makes the replacement stand", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Attacker" }, { name: "Defender" }],
    expansionIds: ["red"],
    random: seededRandom(170),
  }));
  const attackerIndex = game.currentPlayerIndex;
  const defenderIndex = (attackerIndex + 1) % 2;
  const timid = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(170));
  const weapon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(31));
  game.players[attackerIndex].bunnies = [bunny("Attacker Bunny", "blue", "timid-attacker")];
  game.players[defenderIndex].bunnies = [timid];
  game.phase = "defend";
  game.pendingAction = {
    playerIndex: defenderIndex,
    targetPlayerIndex: defenderIndex,
    attackingPlayerIndex: attackerIndex,
    effect: "weapon",
    bunnyId: timid.id,
    card: weapon,
  };

  game = resolveKillerBunniesDefense(game, defenderIndex, "roll", () => 0);
  assert.equal(game.phase, "timidRerollChoice");
  assert.equal(game.players[defenderIndex].bunnies.length, 0);

  game = resolveKillerBunniesCardAction(game, defenderIndex, { choice: "reroll" }, () => 0.99);
  assert.equal(game.lastRoll.value, 12);
  assert.equal(game.players[defenderIndex].bunnies.some((entry) => entry.id === timid.id), true);
  assert.notEqual(game.phase, "timidRerollChoice");
});

test("Red Barriers stop adjacent Weapon spillover while leaving the target attack intact", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }, { name: "Linus" }],
    expansionIds: ["red"],
    random: seededRandom(185),
  }));
  const attacker = bunny("Attacker Bunny", "blue", "barrier-attacker");
  const target = bunny("Target Bunny", "green", "barrier-target");
  const blocked = bunny("Blocked Neighbor", "orange", "barrier-blocked");
  game.players[0].bunnies = [attacker];
  game.players[1].bunnies = [target];
  game.players[2].bunnies = [blocked];
  game.bunnyCircle = [attacker.id, target.id, blocked.id];
  game.barriers = [{ id: "test-barrier", leftPlayerIndex: 1, rightPlayerIndex: 2, card: createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(185)) }];
  const weapon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(131));
  game.phase = "target";
  game.pendingAction = { playerIndex: 0, effect: "weapon", card: weapon };

  game = chooseKillerBunniesTarget(game, 0, 1, target.id);
  assert.equal(game.pendingAction.affected.some((entry) => entry.bunnyId === target.id), true);
  assert.equal(game.pendingAction.affected.some((entry) => entry.bunnyId === blocked.id), false);
});

test("multi-die rolls record each result with its printed die color", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["red"],
    random: seededRandom(194),
  }));
  const rainbo = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(194));
  game.phase = "rainboRoll";
  game.pendingAction = { playerIndex: 0, targetPlayerIndex: 0, cardPlayerIndex: 0, effect: "playerTarget", card: rainbo };

  let nextValue = 0;
  game = resolveKillerBunniesCardAction(game, 0, {}, () => (nextValue++ % 12) / 12);

  assert.deepEqual(game.lastRoll.dice.map(({ color, value, sides }) => ({ color, value, sides })), [
    { color: "violet", value: 1, sides: 12 },
    { color: "orange", value: 2, sides: 12 },
    { color: "green", value: 3, sides: 12 },
    { color: "yellow", value: 4, sides: 12 },
    { color: "blue", value: 5, sides: 12 },
    { color: "black", value: 6, sides: 12 },
    { color: "red", value: 7, sides: 12 },
    { color: "pink", value: 8, sides: 12 },
  ]);
  assert.equal(game.lastRoll.rollerName, "Ada");
});

test("Holographic Bunny 0191 is not living until Ancient Star Rod makes it real", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["red", "violet"],
    random: seededRandom(191),
  }));
  const hologram = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(191));
  const livingHelper = bunny("Helper Bunny", "blue", "holo-helper");
  const weapon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(31));
  const starRod = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(257));
  game.players[0].bunnies = [hologram];
  assert.equal(getKillerBunniesCardPlayStatus(game.players[0], weapon).enabled, false);

  game.players[0].bunnies.push(livingHelper);
  game.phase = "modifierTarget";
  game.pendingAction = { playerIndex: 0, effect: "modifier", card: starRod };
  game = chooseKillerBunniesModifierTarget(game, 0, 0, hologram.id);
  game.players[0].bunnies = game.players[0].bunnies.filter((entry) => entry.id !== livingHelper.id);
  assert.equal(hologram.hologramMadeLiving, undefined);
  assert.equal(game.players[0].bunnies[0].hologramMadeLiving, true);
  assert.equal(getKillerBunniesCardPlayStatus(game.players[0], weapon).enabled, true);
});

test("Bounty Mounty 0197 pays its pooled Dolla to the bunny's killer", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["red"],
    random: seededRandom(197),
  }));
  const target = bunny("Wanted Bunny", "green", "wanted-bunny");
  game.players[0].bunnies = [bunny("Ada Bunny", "blue", "bounty-attacker")];
  game.players[1].bunnies = [target];
  game.bunnyCircle = [game.players[0].bunnies[0].id, target.id];
  game.players[0].dollaCredit = 3;
  const bounty = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(197));
  game.phase = "bountyTarget";
  game.pendingAction = { playerIndex: 0, effect: "bountyMounty", card: bounty };
  game = resolveKillerBunniesCardAction(game, 0, { bunnyId: target.id });
  game = resolveKillerBunniesCardAction(game, 0, { amount: 2 });
  assert.equal(game.players[1].bunnies[0].bounty.amount, 2);

  const weapon = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(31));
  game.phase = "defend";
  game.pendingAction = { playerIndex: 1, targetPlayerIndex: 1, attackingPlayerIndex: 0, effect: "weapon", bunnyId: target.id, card: weapon };
  game = resolveKillerBunniesDefense(game, 1, "roll", () => 0);
  assert.equal(game.players[1].bunnies.length, 0);
  assert.equal(game.players[0].dollaCredit, 3);
  assert.ok(game.discardPile.some((card) => card.id === bounty.id));
});

test("Guardian Angle 0204 cancels a pending Terrible Misfortune", () => {
  let game = programAllPlayers(createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    expansionIds: ["red"],
    random: seededRandom(204),
  }));
  const guardian = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(204));
  const misfortune = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(83));
  const protectedBunny = bunny("Protected Bunny", "blue", "guardian-target");
  game.players[0].bunnies = [protectedBunny];
  game.players[0].savedSpecials.push(guardian);
  game.phase = "immediateTarget";
  game.pendingAction = { playerIndex: 0, effect: "terribleMisfortune", card: misfortune, targetScope: "own" };

  game = playSavedKillerBunniesSpecial(game, 0, guardian.id);
  assert.equal(game.players[0].bunnies.some((entry) => entry.id === protectedBunny.id), true);
  assert.ok(game.discardPile.some((card) => card.id === guardian.id));
  assert.ok(game.discardPile.some((card) => card.id === misfortune.id));
});

test("computer players can complete the hunt without deadlocking", () => {
  const random = seededRandom(31);
  let game = createKillerBunniesGame({
    playerSeeds: [
      { name: "Bot One", isComputer: true },
      { name: "Bot Two", isComputer: true },
      { name: "Bot Three", isComputer: true },
    ],
    random,
  });
  game = runKillerBunniesComputers(game, random);

  assert.equal(game.phase, "reveal");
  assert.equal(game.carrotMarket.length, 0);
  assert.equal(game.players.reduce((total, player) => total + player.carrots.length, 0), 12);

  game = drawKillerBunniesPile(game, 0, "magic", {}, random);
  assert.equal(game.phase, "gameOver");
  assert.ok(game.revealedMagicCarrot);
});

function seededRandom(initialSeed) {
  let seed = initialSeed;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function programAllPlayers(initialGame) {
  let game = initialGame;
  while (game.phase === "setupRun") {
    const player = game.players[game.currentPlayerIndex];
    const top = player.hand.find((card) => card.kind === "bunny") || player.hand[0];
    const bottom = player.hand.find((card) => card.id !== top.id);
    game = chooseInitialKillerBunniesRun(game, game.currentPlayerIndex, top.id, bottom.id);
  }
  return game;
}

function bunny(name, color = null, id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
  return { id, kind: "bunny", type: "RUN", name, color };
}

function plainRun(id) {
  return { id, kind: "action", type: "RUN", name: id, effectImplemented: true };
}
