import assert from "node:assert/strict";
import test from "node:test";

import {
  KILLER_BUNNIES_CARD_COUNTS,
  buyKillerBunniesShopItem,
  chooseKillerBunniesCarrot,
  chooseKillerBunniesTarget,
  chooseInitialKillerBunniesRun,
  createKillerBunniesGame,
  drawKillerBunniesPile,
  getKillerBunniesPileStatus,
  getKillerBunniesCardPlayStatus,
  getKillerBunniesShopItemStatus,
  playSavedKillerBunniesSpecial,
  playTopRun,
  replaceBottomRun,
  resolveKillerBunniesDefense,
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
    { id: "needs-bunny-carrot", kind: "chooseCarrot", type: "RUN", name: "Test Carrot Grab" },
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
  for (const kind of ["weapon", "feed", "chooseCarrot"]) {
    assert.equal(getKillerBunniesCardPlayStatus(player, { kind, name: kind }).enabled, true);
  }
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
