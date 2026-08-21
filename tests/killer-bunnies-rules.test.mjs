import assert from "node:assert/strict";
import test from "node:test";

import {
  KILLER_BUNNIES_CARD_COUNTS,
  buyKillerBunniesShopItem,
  chooseKillerBunniesCarrot,
  chooseKillerBunniesBlueRollTarget,
  chooseKillerBunniesDefectorTarget,
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
  getKillerBunniesCardPlayStatus,
  getKillerBunniesExtraRunStatus,
  getKillerBunniesCloverReduction,
  getKillerBunniesShopItemStatus,
  getKillerBunniesSupplyUnits,
  playSavedKillerBunniesSpecial,
  playTopRun,
  replaceBottomRun,
  resolveKillerBunniesDefense,
  resolveKillerBunniesAreaWeaponRoll,
  resolveKillerBunniesBlueCardRoll,
  resolveKillerBunniesBlueSpecialRoll,
  resolveKillerBunniesDefectorRoll,
  resolveKillerBunniesImmediateCard,
  resolveKillerBunniesManualCard,
  resolveKillerBunniesRoamingRoll,
  resolveKillerBunniesSpecialChoice,
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

test("non-Misfortune PLAY IMMEDIATELY cards expose their action before replacement draw", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(16),
  });
  game.phase = "draw";
  game.currentPlayerIndex = 0;
  const immediateCard = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(207));
  game.mainDeck.push(immediateCard);

  game = drawKillerBunniesPile(game, 0, "main", {}, seededRandom(17));
  assert.equal(game.phase, "immediateResolve");
  assert.equal(game.pendingAction.card.id, immediateCard.id);
  assert.match(game.pendingAction.card.ability, /first-time player/i);
  assert.equal(game.players[0].hand.some((card) => card.id === immediateCard.id), false);

  game = resolveKillerBunniesImmediateCard(game, 0);
  assert.equal(game.phase, "draw");
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

test("documented but unautomated cards pause for a visible guided ruling", () => {
  let game = createKillerBunniesGame({
    playerSeeds: [{ name: "Ada" }, { name: "Grace" }],
    random: seededRandom(224),
  });
  game = programAllPlayers(game);
  const blackCat = createKillerBunniesPlayableCard(getKillerBunniesCatalogCard(53));
  game.players[0].bunnies.push(bunny("Required Bunny", "blue", "manual-required"));
  game.discardPile.push(game.players[0].topRun);
  game.players[0].topRun = blackCat;

  game = playTopRun(game, 0, seededRandom(225));
  assert.equal(game.phase, "manualResolve");
  assert.equal(game.pendingAction.card.catalogNumber, "0053");
  assert.match(game.pendingAction.card.ability, /Clover/i);
  assert.ok(game.pendingAction.card.requirements.length > 0);

  game = resolveKillerBunniesManualCard(game, 0);
  assert.equal(game.phase, "draw");
  assert.equal(game.pendingAction, null);
  assert.equal(game.discardPile.some((card) => card.catalogNumber === "0053"), true);
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
  assert.deepEqual(game.lastRoll, { value: 1, sides: 12, label: weapon.name });
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
