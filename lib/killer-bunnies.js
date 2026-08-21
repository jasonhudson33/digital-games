import {
  createKillerBunniesExpansionContent,
  getKillerBunniesExpansionSummary,
  normalizeKillerBunniesExpansionIds,
} from "./killer-bunnies-expansions.js";
import { shuffled } from "./shuffle.js";
import { createKillerBunniesCatalogDeckContent } from "./killer-bunnies-card-adapter.js";
import { getKillerBunniesExtraRunStatus } from "./killer-bunnies-triplets.js";
import { getKillerBunniesCloverReduction } from "./killer-bunnies-modifiers.js";
import {
  addKillerBunnyToCircle,
  ensureKillerBunniesCircle,
  findKillerBunnyInCircle,
  getKillerBunniesCircleEntries,
  getKillerBunniesCircleRange,
  getNextKillerBunnyInCircle,
  removeKillerBunnyFromCircle,
} from "./killer-bunnies-circle.js";

export { getKillerBunniesExtraRunStatus } from "./killer-bunnies-triplets.js";
export { getKillerBunniesCloverReduction } from "./killer-bunnies-modifiers.js";
export { getKillerBunniesCircleEntries } from "./killer-bunnies-circle.js";

const BLUE_STARTER_CONTENT = createKillerBunniesCatalogDeckContent("blue");
const YELLOW_BOOSTER_CONTENT = createKillerBunniesCatalogDeckContent("yellow");
const BASE_MAIN_DECK = [...BLUE_STARTER_CONTENT.mainDeck, ...YELLOW_BOOSTER_CONTENT.mainDeck];
const BASE_CARROTS = [...BLUE_STARTER_CONTENT.carrotMarket, ...YELLOW_BOOSTER_CONTENT.carrotMarket];
const BASE_MAGIC_CARROTS = [...BLUE_STARTER_CONTENT.magicCarrots, ...YELLOW_BOOSTER_CONTENT.magicCarrots];

export const KILLER_BUNNIES_CARD_COUNTS = Object.freeze({
  mainDeck: 152,
  marketStarter: 1,
  carrotMarket: 12,
  magicCarrots: 12,
  cabbage: 12,
  water: 12,
  numbered: 165,
  total: 201,
});

export const KABALLAS_MARKET_STARTER = Object.freeze(BLUE_STARTER_CONTENT.starterCards.find((card) => card.shop === "kaballas"));

export const ROONEYS_WEAPONS_EMPORIUM_STARTER = Object.freeze({
  id: "kbq-0216",
  number: 216,
  catalogNumber: "0216",
  name: "Rooney's Weapons Emporium (Starter Card)",
  kind: "marketStarter",
  type: "STARTER CARD",
  shop: "rooneys",
  isOpen: true,
  defensePrice: 3,
  detail: "Defense Cards cost 3 Dolla. Used Weapon Cards cost their Weapon Level and must be run through.",
});

export const WEILS_PAWN_SHOP_STARTER = Object.freeze({
  id: "kbq-0330",
  number: 330,
  catalogNumber: "0330",
  name: "Weil's Pawn Shop (Starter Card)",
  kind: "marketStarter",
  type: "STARTER CARD",
  shop: "weils",
  isOpen: true,
  pawnPrice: 5,
  bunnyPrice: 10,
  detail: "Colored Pawns cost 5 Dolla. Discarded bunnies cost 10 Dolla and must be run through.",
});

export function createKillerBunniesGame({ playerSeeds, expansionIds = [], random = Math.random }) {
  if (!Array.isArray(playerSeeds) || playerSeeds.length < 2 || playerSeeds.length > 8) {
    throw new Error("Killer Bunnies needs two to eight players.");
  }

  const selectedExpansionIds = normalizeKillerBunniesExpansionIds(expansionIds);
  const expansionContent = createKillerBunniesExpansionContent(selectedExpansionIds);
  const expansionSummary = getKillerBunniesExpansionSummary(selectedExpansionIds);
  const hasRooneys = expansionContent.shops.includes("rooneys");
  const hasWeils = expansionContent.shops.includes("weils");
  const rooneysStarter = expansionContent.starterCards.find((card) => card.shop === "rooneys") || ROONEYS_WEAPONS_EMPORIUM_STARTER;
  const weilsStarter = expansionContent.starterCards.find((card) => card.shop === "weils") || WEILS_PAWN_SHOP_STARTER;
  const cardCounts = {
    mainDeck: KILLER_BUNNIES_CARD_COUNTS.mainDeck + expansionContent.mainDeck.length,
    marketStarter: KILLER_BUNNIES_CARD_COUNTS.marketStarter + expansionContent.starterCards.length,
    defense: hasRooneys ? 6 : 0,
    carrotMarket: KILLER_BUNNIES_CARD_COUNTS.carrotMarket + expansionContent.carrotMarket.length,
    magicCarrots: KILLER_BUNNIES_CARD_COUNTS.magicCarrots + expansionContent.magicCarrots.length,
    cabbage: KILLER_BUNNIES_CARD_COUNTS.cabbage,
    water: KILLER_BUNNIES_CARD_COUNTS.water,
    numbered: KILLER_BUNNIES_CARD_COUNTS.numbered + expansionSummary.addedCards,
  };
  cardCounts.total = cardCounts.numbered + cardCounts.magicCarrots + cardCounts.cabbage + cardCounts.water + cardCounts.defense;
  const startingPlayerIndex = Math.floor(random() * playerSeeds.length);
  const mainDeck = shuffle([...BASE_MAIN_DECK, ...expansionContent.mainDeck], random);
  const game = {
    phase: "setupRun",
    players: playerSeeds.map((seed, index) => ({
      playerId: seed.playerId ?? `player-${index + 1}`,
      name: seed.name || `Player ${index + 1}`,
      isComputer: Boolean(seed.isComputer),
      hand: [],
      topRun: null,
      bottomRun: null,
      bunnies: [],
      carrots: [],
      cabbage: [],
      water: [],
      bank: [],
      savedSpecials: [],
      defenseCards: [],
      pawns: [],
      feedingObligations: [],
      resourceCredits: { cabbage: 0, water: 0 },
      shields: 0,
    })),
    mainDeck,
    discardPile: [],
    bunnyCircle: [],
    carrotMarket: shuffle([...BASE_CARROTS, ...expansionContent.carrotMarket], random),
    magicCarrotDeck: shuffle([...BASE_MAGIC_CARROTS, ...expansionContent.magicCarrots], random),
    cabbageSupply: shuffle(createSupply("cabbage"), random),
    waterSupply: shuffle(createSupply("water"), random),
    cabbageDiscard: [],
    waterDiscard: [],
    starterCards: [KABALLAS_MARKET_STARTER, ...expansionContent.starterCards],
    kaballasMarket: structuredClone(KABALLAS_MARKET_STARTER),
    rooneysEmporium: hasRooneys ? {
      ...structuredClone(rooneysStarter),
      defenseSupply: createDefenseSupply(),
      weaponDiscard: [],
    } : null,
    weilsPawnShop: hasWeils ? {
      ...structuredClone(weilsStarter),
      pawnSupply: createPawnSupply(),
      bunnyDiscard: [],
    } : null,
    expansionIds: selectedExpansionIds,
    expansionSummary,
    startingPlayerIndex,
    currentPlayerIndex: startingPlayerIndex,
    turnNumber: 1,
    runPlaysThisTurn: 0,
    pendingAction: null,
    immediateQueue: [],
    revealedMagicCarrot: null,
    winnerIndexes: [],
    purchases: { cabbage: false, water: false, carrot: false },
    lastRoll: null,
    message: `${playerSeeds[startingPlayerIndex].name || `Player ${startingPlayerIndex + 1}`}: choose your opening TOP RUN and BOTTOM RUN cards.`,
    log: ["Players are programming their opening RUN cards."],
    cardCounts,
  };

  for (const [playerIndex, player] of game.players.entries()) {
    while (player.hand.length < 7) dealPlayableCard(game, player, playerIndex);
  }
  if (game.immediateQueue.length) {
    return startNextQueuedImmediate(game, {
      returnPhase: "setupRun",
      resumePlayerIndex: startingPlayerIndex,
    });
  }

  return game;
}

export function chooseInitialKillerBunniesRun(game, playerIndex, topCardId, bottomCardId) {
  requireCurrent(game, playerIndex, "setupRun");
  if (!topCardId || !bottomCardId || topCardId === bottomCardId) {
    throw new Error("Choose two different cards for TOP RUN and BOTTOM RUN.");
  }
  const next = clone(game);
  const player = next.players[playerIndex];
  const topIndex = player.hand.findIndex((card) => card.id === topCardId);
  const bottomIndex = player.hand.findIndex((card) => card.id === bottomCardId);
  if (topIndex < 0 || bottomIndex < 0) throw new Error("Both opening RUN cards must come from your hand.");

  const topRun = player.hand[topIndex];
  const bottomRun = player.hand[bottomIndex];
  if (isPlayImmediately(topRun) || isPlayImmediately(bottomRun)) {
    throw new Error("PLAY IMMEDIATELY cards cannot be programmed into RUN slots.");
  }
  player.hand = player.hand.filter((card) => card.id !== topCardId && card.id !== bottomCardId);
  player.topRun = topRun;
  player.bottomRun = bottomRun;
  pushLog(next, `${player.name} programmed two opening RUN cards.`);

  const startingPlayerIndex = next.startingPlayerIndex ?? 0;
  const nextPlayerIndex = (playerIndex + 1) % next.players.length;
  if (nextPlayerIndex === startingPlayerIndex) {
    next.currentPlayerIndex = startingPlayerIndex;
    next.phase = "play";
    next.message = `${next.players[startingPlayerIndex].name}'s turn: shop or flip TOP RUN.`;
  } else {
    next.currentPlayerIndex = nextPlayerIndex;
    next.message = `${next.players[next.currentPlayerIndex].name}: choose your opening TOP RUN and BOTTOM RUN cards.`;
  }
  return next;
}

export function playTopRun(game, playerIndex, random = Math.random) {
  requireCurrent(game, playerIndex, "play");
  const next = clone(game);
  const player = next.players[playerIndex];
  const completedRunPlays = next.runPlaysThisTurn || 0;
  if (completedRunPlays >= 2) throw new Error("Both RUN cards have already been played this turn.");
  if (completedRunPlays === 1 && !getKillerBunniesExtraRunStatus(player).enabled) {
    throw new Error("You no longer have a Bunny Triplet or another two-RUN ability.");
  }
  const card = player.topRun;
  if (!card) throw new Error("Your TOP RUN slot is empty.");

  next.runPlaysThisTurn = completedRunPlays + 1;
  player.topRun = player.bottomRun;
  player.bottomRun = null;
  next.lastRoll = null;
  pushLog(next, `${player.name} flipped ${card.name}${next.runPlaysThisTurn === 2 ? " as their second RUN" : ""}.`);
  if (isSavableSpecial(card)) {
    next.phase = "specialChoice";
    next.pendingAction = { playerIndex, effect: "specialChoice", card };
    next.message = `Use ${card.name} now, or save it for a later turn.`;
    return next;
  }
  return resolveRunCard(next, playerIndex, card, random);
}

export function resolveKillerBunniesSpecialChoice(game, playerIndex, choice, random = Math.random) {
  const pending = requirePendingController(game, playerIndex, "specialChoice");
  if (!isSavableSpecial(pending.card)) throw new Error("That card cannot be saved.");
  const next = clone(game);
  const nextPending = next.pendingAction;
  next.pendingAction = null;

  if (choice === "save") {
    next.players[playerIndex].savedSpecials ||= [];
    next.players[playerIndex].savedSpecials.push(nextPending.card);
    pushLog(next, `${next.players[playerIndex].name} saved ${nextPending.card.name}.`);
    return advanceToDraw(next);
  }
  if (choice !== "use") throw new Error("Choose whether to use or save the card.");
  return resolveRunCard(next, playerIndex, nextPending.card, random);
}

export function playSavedKillerBunniesSpecial(game, playerIndex, cardId, random = Math.random) {
  if (game.phase !== "play") throw new Error("Saved cards may be played while a player is choosing their TOP RUN action.");
  const saved = game.players[playerIndex]?.savedSpecials || [];
  const cardIndex = saved.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) throw new Error("That saved card is not available.");
  const card = saved[cardIndex];
  if (card.type !== "VERY SPECIAL" && game.currentPlayerIndex !== playerIndex) {
    throw new Error("SPECIAL cards may only be played during your own turn.");
  }

  const next = clone(game);
  const [playedCard] = next.players[playerIndex].savedSpecials.splice(cardIndex, 1);
  const resumePlayerIndex = next.currentPlayerIndex;
  pushLog(next, `${next.players[playerIndex].name} played saved ${playedCard.name}.`);
  return resolveRunCard(next, playerIndex, playedCard, random, { returnPhase: "play", resumePlayerIndex });
}

export function resolveKillerBunniesManualCard(game, playerIndex) {
  requirePendingController(game, playerIndex, "manualResolve");
  const next = clone(game);
  const nextPending = next.pendingAction;
  next.discardPile.push(nextPending.card);
  next.pendingAction = null;
  pushLog(next, `${next.players[playerIndex].name} confirmed the table resolution for ${nextPending.card.name}.`);
  return finishPendingEffect(next, nextPending);
}

export function resolveKillerBunniesImmediateCard(game, playerIndex) {
  requirePendingController(game, playerIndex, "immediateResolve");
  const next = clone(game);
  const pending = next.pendingAction;
  next.pendingAction = null;
  next.discardPile.push(pending.card);
  pushLog(next, `${next.players[playerIndex].name} resolved PLAY IMMEDIATELY card ${pending.card.name}.`);
  return finishImmediateEffect(next, pending);
}

export function chooseKillerBunniesMisfortuneTarget(game, playerIndex, bunnyId, targetPlayerIndex = playerIndex) {
  requirePendingController(game, playerIndex, "immediateTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const allowedTarget = pending.targetScope === "opponent" ? targetPlayerIndex !== playerIndex : targetPlayerIndex === playerIndex;
  const bunnyIndex = target?.bunnies.findIndex((bunny) => bunny.id === bunnyId && !hasHeavenlyHalo(bunny)) ?? -1;
  if (!allowedTarget || bunnyIndex < 0) throw new Error(`Choose ${pending.targetScope === "opponent" ? "an opponent's" : "one of your own"} vulnerable bunnies.`);
  const [bunny] = target.bunnies.splice(bunnyIndex, 1);
  discardBunny(next, bunny);
  next.discardPile.push(pending.card);
  next.pendingAction = null;
  pushLog(next, `${pending.card.name} immediately eliminated ${target.name}'s ${bunny.name}.`);
  return finishImmediateEffect(next, pending);
}

export function chooseKillerBunniesTarget(game, playerIndex, targetPlayerIndex, bunnyId, random = Math.random) {
  requirePendingController(game, playerIndex, "target");
  const next = clone(game);
  const pending = next.pendingAction;
  if (!pending || pending.playerIndex !== playerIndex) throw new Error("There is no target to choose.");
  const target = next.players[targetPlayerIndex];
  const bunnyIndex = target?.bunnies.findIndex((bunny) => bunny.id === bunnyId) ?? -1;
  if ((!pending.allowOwnTarget && targetPlayerIndex === playerIndex) || bunnyIndex < 0) {
    throw new Error(pending.allowOwnTarget ? "Choose one of your own living bunnies." : "Choose an opponent's living bunny.");
  }
  const bunny = target.bunnies[bunnyIndex];

  if (pending.effect === "weapon" && isAreaWeapon(pending.card)) {
    if (pending.allowOwnTarget) next.players[playerIndex].badKarma = false;
    return beginAreaWeapon(next, pending, playerIndex, bunnyId);
  }

  if (hasHeavenlyHalo(bunny)) {
    if (pending.card.kind === "weapon") discardUsedWeapon(next, pending.card);
    else next.discardPile.push(pending.card);
    next.pendingAction = null;
    pushLog(next, `${bunny.name}'s Heavenly Halo blocked ${pending.card.name}.`);
    const continued = finishPendingEffect(next, pending);
    continued.message = `${bunny.name}'s Heavenly Halo blocked ${pending.card.name}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
    return continued;
  }

  if (pending.effect === "feed") {
    target.feedingObligations ||= [];
    target.feedingObligations.push({
      id: `feeding-${pending.card.id}-${bunnyId}`,
      bunnyId,
      card: pending.card,
      attackingPlayerIndex: playerIndex,
      cabbageCost: pending.card.cabbageCost || 0,
      waterCost: pending.card.waterCost || 0,
      assignedTurnNumber: next.turnNumber,
    });
    next.pendingAction = null;
    pushLog(next, `${target.name} must feed ${bunny.name} by the end of their next turn.`);
    const continued = finishPendingEffect(next, pending);
    continued.message = `${target.name} has until the end of their next turn to feed ${bunny.name}. ${continued.phase === "draw" ? `${next.players[playerIndex].name}, click the main draw pile.` : "Continue the turn."}`;
    return continued;
  }

  next.phase = "defend";
  const cloverReduction = pending.effect === "weapon" ? getKillerBunniesCloverReduction(bunny) : 0;
  const effectivePower = pending.effect === "weapon" ? Math.max(0, (pending.card.power || 0) - cloverReduction) : undefined;
  next.pendingAction = {
    ...pending,
    playerIndex: targetPlayerIndex,
    attackingPlayerIndex: playerIndex,
    targetPlayerIndex,
    bunnyId,
    cloverReduction,
    effectivePower,
  };
  if (pending.effect === "weapon" && pending.allowOwnTarget) next.players[playerIndex].badKarma = false;
  next.message = pending.effect === "weapon" && cloverReduction > 0
    ? `${bunny.name}'s Lucky Clovers reduce ${pending.card.name} from level ${pending.card.power} to ${effectivePower}. ${target.name} must roll higher than ${effectivePower}.`
    : `${target.name} must roll a d12 for ${bunny.name}.`;
  pushLog(next, `${next.players[playerIndex].name} targeted ${bunny.name} with ${pending.card.name}.`);
  return next;
}

export function resolveKillerBunniesAreaWeaponRoll(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "areaWeaponRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const current = pending.affected.find((entry) => entry.bunnyId === pending.rollQueue[0]);
  const circleEntry = current ? findKillerBunnyInCircle(next, current.bunnyId) : null;
  if (!current || !circleEntry) {
    pending.rollQueue.shift();
    return continueAreaWeapon(next);
  }

  const cloverReduction = getKillerBunniesCloverReduction(circleEntry.bunny);
  const effectivePower = Math.max(0, current.power - cloverReduction);
  const value = rollD12(random);
  current.roll = value;
  current.effectivePower = effectivePower;
  next.lastRoll = { value, sides: 12, label: pending.card.name };
  pending.rollQueue.shift();

  if (value <= effectivePower) {
    circleEntry.player.bunnies.splice(circleEntry.bunnyIndex, 1);
    discardBunny(next, circleEntry.bunny);
    current.eliminated = true;
    pushLog(next, `${circleEntry.player.name} rolled ${value}; ${pending.card.name} eliminated ${circleEntry.bunny.name}.`);
  } else {
    pushLog(next, `${circleEntry.player.name} rolled ${value}; ${circleEntry.bunny.name} survived level ${effectivePower}.`);
  }
  return continueAreaWeapon(next);
}

export function chooseKillerBunniesPlayerTarget(game, playerIndex, targetPlayerIndex) {
  requirePendingController(game, playerIndex, "playerTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  if (!target) throw new Error("Choose a player.");
  const number = Number(pending.card.number);

  if (number === 51) {
    target.badKarma = true;
    pushLog(next, `${target.name}'s next Weapon must target one of their own bunnies.`);
  } else if (number === 52) {
    target.skipTurns = (target.skipTurns || 0) + 1;
    pushLog(next, `${target.name} will lose their next turn to Baker Street.`);
  } else if (number === 56 || number === 64) {
    const resource = number === 56 ? "water" : "cabbage";
    next[`${resource}Discard`] ||= [];
    next[`${resource}Discard`].push(...target[resource].splice(0));
    target.resourceCredits ||= { cabbage: 0, water: 0 };
    target.resourceCredits[resource] = 0;
    pushLog(next, `${target.name} lost all ${resource} units to ${pending.card.name}.`);
  } else if (number === 70) {
    const weapons = target.hand.filter((card) => card.kind === "weapon");
    target.hand = target.hand.filter((card) => card.kind !== "weapon");
    for (const weapon of weapons) discardUsedWeapon(next, weapon);
    pushLog(next, `${target.name} discarded ${weapons.length} Weapon card${weapons.length === 1 ? "" : "s"}.`);
  } else {
    throw new Error("That player-target card is not automated yet.");
  }

  next.discardPile.push(pending.card);
  next.pendingAction = null;
  return finishPendingEffect(next, pending);
}

export function chooseKillerBunniesUtilityBunnyTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "utilityBunnyTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose a bunny in the Bunny Circle.");
  const number = Number(pending.card.number);
  if ([49, 50].includes(number)) {
    if (hasHeavenlyHalo(bunny)) throw new Error("The Heavenly Halo prevents Area 51 abduction.");
    restoreArea51Bunny(next);
    const refreshedTarget = next.players[targetPlayerIndex];
    const refreshedIndex = refreshedTarget.bunnies.findIndex((entry) => entry.id === bunnyId);
    if (refreshedIndex < 0) throw new Error("That bunny is no longer in the Bunny Circle.");
    const [abducted] = refreshedTarget.bunnies.splice(refreshedIndex, 1);
    removeKillerBunnyFromCircle(next, abducted.id);
    if (abducted.modifiers?.length) {
      next.discardPile.push(...abducted.modifiers);
      abducted.modifiers = [];
    }
    const pendingFeeds = (refreshedTarget.feedingObligations || []).filter((obligation) => obligation.bunnyId === abducted.id);
    refreshedTarget.feedingObligations = (refreshedTarget.feedingObligations || []).filter((obligation) => obligation.bunnyId !== abducted.id);
    next.discardPile.push(...pendingFeeds.map((obligation) => obligation.card));
    next.area51Abducted = { bunny: abducted, ownerIndex: targetPlayerIndex };
    pushLog(next, `${pending.card.name} abducted ${refreshedTarget.name}'s ${abducted.name}.`);
  } else if ([72, 73].includes(number)) {
    const obligations = target.feedingObligations || [];
    const cleared = obligations.filter((obligation) => obligation.bunnyId === bunnyId);
    target.feedingObligations = obligations.filter((obligation) => obligation.bunnyId !== bunnyId);
    next.discardPile.push(...cleared.map((obligation) => obligation.card));
    pushLog(next, `${pending.card.name} satisfied ${cleared.length} feeding obligation${cleared.length === 1 ? "" : "s"} on ${bunny.name}.`);
  } else {
    throw new Error("That bunny-target card is not automated yet.");
  }
  next.discardPile.push(pending.card);
  next.pendingAction = null;
  return finishPendingEffect(next, pending);
}

function restoreArea51Bunny(game) {
  const abducted = game.area51Abducted;
  if (!abducted?.bunny || !game.players[abducted.ownerIndex]) return;
  game.players[abducted.ownerIndex].bunnies.push(abducted.bunny);
  addKillerBunnyToCircle(game, abducted.bunny.id);
  pushLog(game, `${game.players[abducted.ownerIndex].name}'s ${abducted.bunny.name} returned from Area 51.`);
  game.area51Abducted = null;
}

export function chooseKillerBunniesBlueRollTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "blueRollTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose any bunny in the Bunny Circle.");
  next.phase = "blueCardRoll";
  next.pendingAction = {
    ...pending,
    playerIndex: targetPlayerIndex,
    cardPlayerIndex: playerIndex,
    targetPlayerIndex,
    bunnyId,
    diceCount: [66, 67].includes(Number(pending.card.number)) ? 5 : 1,
  };
  next.message = `${target.name}: roll ${next.pendingAction.diceCount === 1 ? "the d12" : "five colored d12s"} for ${bunny.name}.`;
  return next;
}

export function chooseKillerBunniesNumber(game, playerIndex, value) {
  requirePendingController(game, playerIndex, "numberChoice");
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 12) throw new Error("Choose a number from 1 through 12.");
  const next = clone(game);
  next.phase = "blueSpecialRoll";
  next.pendingAction = { ...next.pendingAction, effect: "magicFountain", chosenNumber: number, diceCount: 5 };
  next.message = `${next.players[playerIndex].name}: roll five d12s. Each ${number} revives one bunny.`;
  return next;
}

export function resolveKillerBunniesBlueSpecialRoll(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "blueSpecialRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const rolls = Array.from({ length: 5 }, () => rollD12(random));
  next.lastRoll = { value: rolls.join(", "), sides: 12, label: pending.card.name };
  if (pending.effect === "magicFountain") {
    pending.reviveCount = rolls.filter((roll) => roll === pending.chosenNumber).length;
    pending.carrotCount = 0;
    pushLog(next, `${pending.card.name} rolled ${rolls.join(", ")} and may revive ${pending.reviveCount} bunnies.`);
    return continueBlueRewards(next, pending);
  }
  if (pending.effect === "suppliesSurprise") {
    const lowest = Math.min(...rolls);
    const winners = rolls.map((roll, index) => roll === lowest ? index : -1).filter((index) => index >= 0);
    const player = next.players[playerIndex];
    pending.reviveCount = winners.includes(0) ? 1 : 0;
    pending.carrotCount = winners.includes(1) && getKaballasMarket(next).isOpen && next.carrotMarket.length ? 1 : 0;
    if (getKaballasMarket(next).isOpen) {
      if (winners.includes(2) && next.cabbageSupply.length) player.cabbage.push(next.cabbageSupply.pop());
      if (winners.includes(4) && next.waterSupply.length) player.water.push(next.waterSupply.pop());
    }
    if (winners.includes(3)) awardDollaFromDiscard(next, player, 10);
    pushLog(next, `${pending.card.name} rolled ${rolls.join(", ")}; ${winners.length} lowest-die reward${winners.length === 1 ? "" : "s"} triggered.`);
    return continueBlueRewards(next, pending);
  }
  throw new Error("That five-dice card is not automated yet.");
}

export function chooseKillerBunniesRoamingTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "roamingTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const entry = findKillerBunnyInCircle(next, bunnyId);
  if (!entry || entry.playerIndex !== targetPlayerIndex || !isViableRoamingTarget(entry.bunny, pending.card)) {
    throw new Error("Choose a bunny that is not protected from this roaming attack.");
  }
  next.phase = "roamingRoll";
  next.pendingAction = {
    ...pending,
    effect: "roamingAttack",
    cardPlayerIndex: playerIndex,
    targetPlayerIndex,
    bunnyId,
    playerIndex: targetPlayerIndex,
    direction: Number(pending.card.number) === 47 ? -1 : 1,
    power: Number(pending.card.number) === 47 ? 11 : 9,
    visitedBunnyIds: [],
    initialAttack: true,
  };
  next.message = `${next.players[targetPlayerIndex].name}: roll a d12 for ${entry.bunny.name} against ${pending.card.name}.`;
  return next;
}

export function resolveKillerBunniesRoamingRoll(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "roamingRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = findKillerBunnyInCircle(next, pending.bunnyId);
  if (!target) return finishRoamingAttack(next, pending, null);
  const nextTarget = getNextKillerBunnyInCircle(next, target.bunny.id, pending.direction, (entry) =>
    isViableRoamingTarget(entry.bunny, pending.card)
      && (Number(pending.card.number) !== 47 || !pending.visitedBunnyIds.includes(entry.bunny.id)));
  const value = rollD12(random);
  next.lastRoll = { value, sides: 12, label: pending.card.name };
  pending.visitedBunnyIds = [...new Set([...(pending.visitedBunnyIds || []), target.bunny.id])];
  if (value <= pending.power) {
    target.player.bunnies.splice(target.bunnyIndex, 1);
    discardBunny(next, target.bunny);
    pushLog(next, `${target.player.name} rolled ${value}; ${pending.card.name} eliminated ${target.bunny.name}.`);
  } else {
    pushLog(next, `${target.player.name} rolled ${value}; ${target.bunny.name} survived ${pending.card.name}.`);
  }
  return finishRoamingAttack(next, pending, nextTarget?.bunny.id || null);
}

export function chooseKillerBunniesRevivedBunny(game, playerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "reviveBunny");
  const next = clone(game);
  const pending = next.pendingAction;
  const source = next.weilsPawnShop?.bunnyDiscard || next.discardPile;
  let revived = removeFirst(source, (card) => card.id === bunnyId && card.kind === "bunny");
  if (!revived && next.weilsPawnShop) revived = removeFirst(next.discardPile, (card) => card.id === bunnyId && card.kind === "bunny");
  if (!revived) throw new Error("Choose an available discarded bunny.");
  next.players[playerIndex].bunnies.push(revived);
  addKillerBunnyToCircle(next, revived.id);
  pending.reviveCount -= 1;
  pushLog(next, `${next.players[playerIndex].name} revived ${revived.name}.`);
  return continueBlueRewards(next, pending);
}

export function resolveKillerBunniesBlueCardRoll(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "blueCardRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const rolls = Array.from({ length: pending.diceCount }, () => rollD12(random));
  pending.rolls = rolls;
  next.lastRoll = { value: rolls.join(", "), sides: 12, label: pending.card.name };
  const number = Number(pending.card.number);
  if ([66, 67].includes(number)) return resolveCarrotTopCasino(next, pending, rolls);
  if ([74, 75].includes(number)) return resolveMadBakery(next, pending, rolls[0]);
  throw new Error("That Blue Bunny Bits roll is not automated yet.");
}

export function chooseKillerBunniesModifierTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "modifierTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose any bunny in the Bunny Circle.");
  bunny.modifiers ||= [];
  bunny.modifiers.push(pending.card);
  next.pendingAction = null;
  pushLog(next, `${next.players[playerIndex].name} placed ${pending.card.name} under ${target.name}'s ${bunny.name}.`);
  const continued = finishPendingEffect(next, pending);
  continued.message = `${pending.card.name} is now attached to ${bunny.name}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

export function chooseKillerBunniesDefectorTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "defectorTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose any bunny in the Bunny Circle.");

  const rollOrder = next.players.map((_, offset) => (playerIndex + offset) % next.players.length);
  next.phase = "defectorRoll";
  next.pendingAction = {
    ...pending,
    playerIndex: rollOrder[0],
    cardPlayerIndex: playerIndex,
    targetPlayerIndex,
    bunnyId,
    scores: next.players.map(() => null),
    rollHistory: [],
    contenderIndexes: [...rollOrder],
    rollQueue: [...rollOrder],
    roundNumber: 1,
    optionalRerollResolved: false,
  };
  next.message = `${next.players[rollOrder[0]].name}: roll a d12 for ${bunny.name}. Highest roll takes the bunny.`;
  pushLog(next, `${next.players[playerIndex].name} placed Defector Detector on ${target.name}'s ${bunny.name}.`);
  return next;
}

export function discardKillerBunniesDefectorDetector(game, playerIndex) {
  requirePendingController(game, playerIndex, "defectorTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  next.discardPile.push(pending.card);
  next.pendingAction = null;
  pushLog(next, `${next.players[playerIndex].name} discarded Defector Detector without choosing a bunny.`);
  return finishPendingEffect(next, pending);
}

export function resolveKillerBunniesDefectorRoll(game, playerIndex, choice, random = Math.random) {
  if (!["defectorRoll", "defectorReroll"].includes(game.phase) || game.pendingAction?.playerIndex !== playerIndex) {
    throw new Error("It is not your Defector Detector decision.");
  }
  const next = clone(game);
  const pending = next.pendingAction;

  if (next.phase === "defectorReroll") {
    if (choice === "keep") {
      pending.optionalRerollResolved = true;
      pushLog(next, `${next.players[playerIndex].name} kept their first Defector Detector roll of ${pending.scores[playerIndex]}.`);
      return completeDefectorRollRound(next);
    }
    if (choice !== "reroll") throw new Error("Keep the first roll or use the one optional reroll.");
    const value = rollD12(random);
    pending.scores[playerIndex] = value;
    pending.rollHistory.push({ playerIndex, value, roundNumber: pending.roundNumber, optionalReroll: true });
    pending.optionalRerollResolved = true;
    next.lastRoll = { value, sides: 12, label: `${pending.card.name} optional reroll` };
    pushLog(next, `${next.players[playerIndex].name} used the optional reroll and rolled ${value}.`);
    return completeDefectorRollRound(next);
  }

  if (choice !== "roll") throw new Error("Roll the d12 for Defector Detector.");
  const value = rollD12(random);
  pending.scores[playerIndex] = value;
  pending.rollHistory.push({ playerIndex, value, roundNumber: pending.roundNumber, optionalReroll: false });
  next.lastRoll = { value, sides: 12, label: pending.card.name };
  pending.rollQueue.shift();
  pushLog(next, `${next.players[playerIndex].name} rolled ${value} for Defector Detector.`);

  if (pending.rollQueue.length) {
    pending.playerIndex = pending.rollQueue[0];
    next.message = `${next.players[pending.playerIndex].name}: roll a d12 for Defector Detector.`;
    return next;
  }
  return completeDefectorRollRound(next);
}

export function resolveKillerBunniesDefense(game, playerIndex, choice, random = Math.random) {
  requirePendingController(game, playerIndex, "defend");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[pending.targetPlayerIndex];
  const bunnyIndex = target?.bunnies.findIndex((bunny) => bunny.id === pending.bunnyId) ?? -1;
  if (bunnyIndex < 0) throw new Error("That bunny is no longer available.");
  const bunny = target.bunnies[bunnyIndex];

  if (pending.effect === "weapon") {
    const effectivePower = Number.isFinite(pending.effectivePower) ? pending.effectivePower : pending.card.power;
    if (choice === "defense") {
      // Clovers change the weapon's die-roll threshold, not its printed cost in Defense units.
      const printedPower = pending.card.power;
      const defenseTotal = target.defenseCards.reduce((total, card) => total + card.units, 0);
      if (defenseTotal < printedPower) throw new Error(`You need ${printedPower} Defense units to stop this weapon.`);
      spendDefenseCards(target, printedPower, next.discardPile);
      pushLog(next, `${target.name} used Defense Cards to stop ${pending.card.name}.`);
    } else if (choice === "roll") {
      const roll = 1 + Math.floor(random() * 12);
      next.lastRoll = { value: roll, sides: 12, label: pending.card.name };
      if (target.shields > 0) {
        target.shields -= 1;
        pushLog(next, `${target.name} rolled ${roll}; their burrow shield stopped ${pending.card.name}.`);
      } else if (roll <= effectivePower) {
        target.bunnies.splice(bunnyIndex, 1);
        discardBunny(next, bunny);
        pushLog(next, `${target.name} rolled ${roll}; ${pending.card.name} knocked out ${bunny.name}.`);
      } else {
        pushLog(next, `${target.name} rolled ${roll}; ${bunny.name} escaped ${pending.card.name}.`);
      }
    } else throw new Error("Roll the d12 or use enough Defense Cards to resolve this attack.");
  } else if (pending.effect === "feed") {
    const cabbageCost = pending.card.cabbageCost;
    const waterCost = pending.card.waterCost;
    const canFeed = supplyUnitTotal(target, "cabbage") >= cabbageCost && supplyUnitTotal(target, "water") >= waterCost;
    if (choice === "feed") {
      if (!canFeed) throw new Error("You do not have enough cabbage and water to feed this bunny.");
      spendSupplyUnits(next, target, "cabbage", cabbageCost);
      spendSupplyUnits(next, target, "water", waterCost);
      pushLog(next, `${target.name} fed ${bunny.name} with ${cabbageCost} cabbage and ${waterCost} water.`);
    } else if (choice !== "decline") {
      throw new Error("Choose whether to feed the bunny.");
    } else if (target.shields > 0) {
      target.shields -= 1;
      pushLog(next, `${target.name}'s emergency burrow protected ${bunny.name} from hunger.`);
    } else {
      target.bunnies.splice(bunnyIndex, 1);
      discardBunny(next, bunny);
      pushLog(next, `${bunny.name} went hungry and left the Bunny Circle.`);
    }
  }

  if (pending.card.kind === "weapon") discardUsedWeapon(next, pending.card);
  else next.discardPile.push(pending.card);
  next.pendingAction = null;
  return finishPendingEffect(next, pending);
}

export function chooseKillerBunniesCarrot(game, playerIndex, carrotId) {
  requirePendingController(game, playerIndex, "chooseCarrot");
  const next = clone(game);
  const carrotIndex = next.carrotMarket.findIndex((card) => card.id === carrotId);
  if (carrotIndex < 0) throw new Error("That carrot is no longer in the market.");
  const [carrot] = next.carrotMarket.splice(carrotIndex, 1);
  next.players[playerIndex].carrots.push(carrot);
  const pending = next.pendingAction;
  pushLog(next, `${next.players[playerIndex].name} claimed Carrot ${carrot.label}.`);
  const remainingCount = Math.max(0, (pending?.remainingCount || 1) - 1);
  if (remainingCount > 0 && next.carrotMarket.length) {
    next.pendingAction.remainingCount = remainingCount;
    next.message = `Choose ${remainingCount} more face-up carrot${remainingCount === 1 ? "" : "s"}.`;
    return next;
  }
  if (pending?.blueRewards) {
    pending.carrotCount = 0;
    return next.carrotMarket.length ? continueBlueRewards(next, pending) : beginMagicReveal(next);
  }
  if (pending?.card) next.discardPile.push(pending.card);
  next.pendingAction = null;
  return next.carrotMarket.length ? finishPendingEffect(next, pending) : beginMagicReveal(next);
}

export function drawKillerBunniesPile(game, playerIndex, pile, options = {}, random = Math.random) {
  const next = clone(game);
  if (pile === "main") {
    requireCurrent(next, playerIndex, "draw");
    const player = next.players[playerIndex];
    const card = drawMain(next);
    if (!card) throw new Error("The main deck is empty.");
    if (card.kind === "money") {
      player.bank.push(card);
      pushLog(next, `${player.name} banked ${card.value} Bunny Bucks and may draw again.`);
      next.message = "Bunny Bucks bank automatically. Click the main deck again.";
    } else if (isPlayImmediately(card)) {
      return beginImmediateCard(next, playerIndex, card, {
        returnPhase: "draw",
        resumePlayerIndex: playerIndex,
      });
    } else {
      player.hand.push(card);
      next.phase = "replace";
      next.message = "Choose a card from your hand for the empty BOTTOM RUN slot.";
    }
    return next;
  }

  if (pile === "magic") {
    if (next.phase !== "reveal") throw new Error("The Magic Carrot stays hidden until the market is empty.");
    if (next.revealedMagicCarrot) throw new Error("The Magic Carrot has already been revealed.");
    const magic = next.magicCarrotDeck.pop();
    next.revealedMagicCarrot = magic;
    settleMagicCarrot(next, magic);
    return next;
  }

  requireCurrent(next, playerIndex, "play");
  if (pile === "cabbage" || pile === "water") {
    buySupply(next, playerIndex, pile);
    return next;
  }
  if (pile === "carrot") {
    const carrotId = options.cardId || next.carrotMarket[0]?.id;
    buyCarrot(next, playerIndex, carrotId);
    return next.carrotMarket.length ? next : beginMagicReveal(next);
  }
  throw new Error("That pile cannot be drawn from.");
}

export function replaceBottomRun(game, playerIndex, cardId) {
  requireCurrent(game, playerIndex, "replace");
  const next = clone(game);
  const player = next.players[playerIndex];
  const cardIndex = player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) throw new Error("Choose a card from your hand.");
  const [card] = player.hand.splice(cardIndex, 1);
  if (isPlayImmediately(card)) throw new Error("PLAY IMMEDIATELY cards cannot be held or programmed into RUN slots.");
  player.bottomRun = card;
  if (player.hand.length > 5) {
    next.phase = "trimHand";
    next.message = `Choose ${player.hand.length - 5} extra card${player.hand.length - 5 === 1 ? "" : "s"} to discard before ending your turn.`;
    return next;
  }
  return finishRunReplacement(next, playerIndex);
}

export function discardExtraKillerBunniesCard(game, playerIndex, cardId) {
  requireCurrent(game, playerIndex, "trimHand");
  const next = clone(game);
  const player = next.players[playerIndex];
  const cardIndex = player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) throw new Error("Choose an extra card from your hand to discard.");
  const [card] = player.hand.splice(cardIndex, 1);
  next.discardPile.push(card);
  pushLog(next, `${player.name} discarded ${card.name} to return to five cards.`);
  if (player.hand.length > 5) {
    next.message = `Choose ${player.hand.length - 5} more extra card${player.hand.length - 5 === 1 ? "" : "s"} to discard.`;
    return next;
  }
  return finishRunReplacement(next, playerIndex);
}

function finishRunReplacement(game, playerIndex) {
  const player = game.players[playerIndex];
  const tripletStatus = getKillerBunniesExtraRunStatus(player);
  if ((game.runPlaysThisTurn || 0) === 1 && tripletStatus.enabled) {
    game.phase = "play";
    game.message = `${tripletStatus.reason} ${player.name} may shop or play their second TOP RUN card.`;
    pushLog(game, `${player.name} qualified to play a second RUN card.`);
    return game;
  }
  return finishTurn(game, playerIndex);
}

function finishTurn(game, playerIndex) {
  const next = game;
  const summaries = [settleFeedingObligations(next, playerIndex)].filter(Boolean);
  const dueRoaming = (next.roamingEffects || []).filter((effect) => effect.launchPlayerIndex === playerIndex && effect.launchedTurnNumber < next.turnNumber);
  if (dueRoaming.length) return beginRoamingTurnAttack(next, dueRoaming, summaries);
  return completeTurnAdvance(next, playerIndex, summaries);
}

function completeTurnAdvance(next, playerIndex, summaries = []) {
  next.currentPlayerIndex = (playerIndex + 1) % next.players.length;
  next.turnNumber += 1;
  let skipped = 0;
  while ((next.players[next.currentPlayerIndex].skipTurns || 0) > 0 && skipped < next.players.length) {
    const skippedPlayer = next.players[next.currentPlayerIndex];
    skippedPlayer.skipTurns -= 1;
    summaries.push(`${skippedPlayer.name} lost this turn to Baker Street.`);
    const feeding = settleFeedingObligations(next, next.currentPlayerIndex);
    if (feeding) summaries.push(feeding);
    next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
    next.turnNumber += 1;
    skipped += 1;
  }
  next.runPlaysThisTurn = 0;
  next.phase = "play";
  next.purchases = { cabbage: false, water: false, carrot: false };
  next.message = `${summaries.length ? `${summaries.join(" ")} ` : ""}${next.players[next.currentPlayerIndex].name}'s turn: shop or flip TOP RUN.`;
  return next;
}

function settleFeedingObligations(game, playerIndex) {
  const player = game.players[playerIndex];
  const obligations = player.feedingObligations || [];
  if (!obligations.length) return "";
  const outcomes = [];

  for (const obligation of obligations) {
    const bunnyIndex = player.bunnies.findIndex((bunny) => bunny.id === obligation.bunnyId);
    if (bunnyIndex < 0) {
      game.discardPile.push(obligation.card);
      continue;
    }
    const bunny = player.bunnies[bunnyIndex];
    if (hasHeavenlyHalo(bunny)) {
      game.discardPile.push(obligation.card);
      outcomes.push(`${bunny.name}'s Halo prevented hunger.`);
      pushLog(game, `${bunny.name}'s Heavenly Halo blocked ${obligation.card.name}.`);
      continue;
    }
    const cabbageCost = obligation.cabbageCost || obligation.card.cabbageCost || 0;
    const waterCost = obligation.waterCost || obligation.card.waterCost || 0;
    const canFeed = supplyUnitTotal(player, "cabbage") >= cabbageCost && supplyUnitTotal(player, "water") >= waterCost;

    if (canFeed) {
      spendSupplyUnits(game, player, "cabbage", cabbageCost);
      spendSupplyUnits(game, player, "water", waterCost);
      outcomes.push(`${player.name} fed ${bunny.name}.`);
      pushLog(game, `${player.name} fed ${bunny.name} with ${cabbageCost} cabbage and ${waterCost} water at turn end.`);
    } else if (player.shields > 0) {
      player.shields -= 1;
      outcomes.push(`${player.name}'s burrow protected ${bunny.name}.`);
      pushLog(game, `${player.name}'s emergency burrow protected ${bunny.name} from hunger at turn end.`);
    } else {
      player.bunnies.splice(bunnyIndex, 1);
      discardBunny(game, bunny);
      outcomes.push(`${bunny.name} went hungry.`);
      pushLog(game, `${bunny.name} was not fed by turn end and left ${player.name}'s Bunny Circle.`);
    }
    game.discardPile.push(obligation.card);
  }

  player.feedingObligations = [];
  return outcomes.join(" ");
}

export function runKillerBunniesComputers(game, random = Math.random) {
  let next = clone(game);
  let steps = 0;
  while (steps < 10000 && next.phase !== "gameOver" && next.phase !== "reveal") {
    if (next.phase === "defend") {
      const defenderIndex = next.pendingAction?.playerIndex;
      const defender = next.players[defenderIndex];
      if (!defender?.isComputer) break;
      const choice = next.pendingAction.effect === "weapon"
        ? "roll"
        : defender.cabbage.length >= next.pendingAction.card.cabbageCost
          && defender.water.length >= next.pendingAction.card.waterCost ? "feed" : "decline";
      next = resolveKillerBunniesDefense(next, defenderIndex, choice, random);
      steps += 1;
      continue;
    }
    if (next.phase === "defectorRoll" || next.phase === "defectorReroll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      const roller = next.players[rollerIndex];
      if (!roller?.isComputer) break;
      next = resolveKillerBunniesDefectorRoll(next, rollerIndex, next.phase === "defectorReroll" ? "reroll" : "roll", random);
      steps += 1;
      continue;
    }
    if (next.phase === "areaWeaponRoll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      if (!next.players[rollerIndex]?.isComputer) break;
      next = resolveKillerBunniesAreaWeaponRoll(next, rollerIndex, random);
      steps += 1;
      continue;
    }
    if (next.phase === "blueCardRoll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      if (!next.players[rollerIndex]?.isComputer) break;
      next = resolveKillerBunniesBlueCardRoll(next, rollerIndex, random);
      steps += 1;
      continue;
    }
    if (next.phase === "blueSpecialRoll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      if (!next.players[rollerIndex]?.isComputer) break;
      next = resolveKillerBunniesBlueSpecialRoll(next, rollerIndex, random);
      steps += 1;
      continue;
    }
    if (next.phase === "roamingRoll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      if (!next.players[rollerIndex]?.isComputer) break;
      next = resolveKillerBunniesRoamingRoll(next, rollerIndex, random);
      steps += 1;
      continue;
    }
    if (next.phase === "immediateResolve" || next.phase === "immediateTarget") {
      const controllerIndex = next.pendingAction?.playerIndex;
      const controller = next.players[controllerIndex];
      if (!controller?.isComputer) break;
      if (next.phase === "immediateTarget") {
        const scope = next.pendingAction.targetScope;
        const target = scope === "opponent"
          ? next.players.map((player, index) => ({ player, index })).find(({ player, index }) => index !== controllerIndex && player.bunnies.some((bunny) => !hasHeavenlyHalo(bunny)))
          : { player: controller, index: controllerIndex };
        const bunny = target?.player.bunnies.find((entry) => !hasHeavenlyHalo(entry));
        next = chooseKillerBunniesMisfortuneTarget(next, controllerIndex, bunny?.id, target?.index);
      } else {
        next = resolveKillerBunniesImmediateCard(next, controllerIndex);
      }
      steps += 1;
      continue;
    }
    const playerIndex = next.currentPlayerIndex;
    const player = next.players[playerIndex];
    if (!player?.isComputer) break;

    if (next.phase === "setupRun") {
      const topChoice = chooseBotRunCard(player);
      const bottomChoice = chooseBotRunCard({
        ...player,
        hand: player.hand.filter((card) => card.id !== topChoice.id),
      });
      next = chooseInitialKillerBunniesRun(next, playerIndex, topChoice.id, bottomChoice.id);
    } else if (next.phase === "play") {
      const market = getKaballasMarket(next);
      const feedingNeeds = getKillerBunniesFeedingStatus(player);
      if (market.isOpen && !next.purchases.cabbage && feedingNeeds.cabbageShortfall > 0 && bankTotal(player) >= market.prices.cabbage && next.cabbageSupply.length) {
        next = drawKillerBunniesPile(next, playerIndex, "cabbage", {}, random);
      } else if (market.isOpen && !next.purchases.water && feedingNeeds.waterShortfall > 0 && bankTotal(player) >= market.prices.water && next.waterSupply.length) {
        next = drawKillerBunniesPile(next, playerIndex, "water", {}, random);
      } else if (market.isOpen && !next.purchases.carrot && bankTotal(player) >= market.prices.carrot && next.carrotMarket.length) {
        next = drawKillerBunniesPile(next, playerIndex, "carrot", { cardId: next.carrotMarket[0].id }, random);
        if (["reveal", "gameOver"].includes(next.phase)) break;
      } else if (market.isOpen && !next.purchases.cabbage && player.cabbage.length < 1 && bankTotal(player) >= market.prices.cabbage && next.cabbageSupply.length) {
        next = drawKillerBunniesPile(next, playerIndex, "cabbage", {}, random);
      } else if (market.isOpen && !next.purchases.water && player.water.length < 1 && bankTotal(player) >= market.prices.water && next.waterSupply.length) {
        next = drawKillerBunniesPile(next, playerIndex, "water", {}, random);
      } else {
        next = playTopRun(next, playerIndex, random);
      }
    } else if (next.phase === "specialChoice") {
      next = resolveKillerBunniesSpecialChoice(next, playerIndex, "use", random);
    } else if (next.phase === "manualResolve") {
      next = resolveKillerBunniesManualCard(next, next.pendingAction.playerIndex);
    } else if (next.phase === "modifierTarget") {
      const target = findBotModifierTarget(next, playerIndex);
      next = chooseKillerBunniesModifierTarget(next, playerIndex, target.playerIndex, target.bunny.id);
    } else if (next.phase === "defectorTarget") {
      const target = findBotDefectorTarget(next, playerIndex);
      next = target
        ? chooseKillerBunniesDefectorTarget(next, playerIndex, target.playerIndex, target.bunny.id)
        : discardKillerBunniesDefectorDetector(next, playerIndex);
    } else if (next.phase === "playerTarget") {
      const targetPlayerIndex = (playerIndex + 1) % next.players.length;
      next = chooseKillerBunniesPlayerTarget(next, playerIndex, targetPlayerIndex);
    } else if (next.phase === "utilityBunnyTarget") {
      const target = next.players.map((entry, index) => ({ entry, index })).find(({ entry }) => entry.feedingObligations?.length)
        || next.players.map((entry, index) => ({ entry, index })).find(({ entry }) => entry.bunnies.length);
      const bunny = target.entry.bunnies.find((entry) => target.entry.feedingObligations?.some((obligation) => obligation.bunnyId === entry.id)) || target.entry.bunnies[0];
      next = chooseKillerBunniesUtilityBunnyTarget(next, playerIndex, target.index, bunny.id);
    } else if (next.phase === "blueRollTarget") {
      const target = findBotDefectorTarget(next, playerIndex);
      next = chooseKillerBunniesBlueRollTarget(next, playerIndex, target.playerIndex, target.bunny.id);
    } else if (next.phase === "roamingTarget") {
      const card = next.pendingAction.card;
      const target = getKillerBunniesCircleEntries(next).find((entry) => isViableRoamingTarget(entry.bunny, card));
      next = chooseKillerBunniesRoamingTarget(next, playerIndex, target.playerIndex, target.bunny.id);
    } else if (next.phase === "numberChoice") {
      next = chooseKillerBunniesNumber(next, playerIndex, 1 + Math.floor(random() * 12));
    } else if (next.phase === "reviveBunny") {
      const revived = next.weilsPawnShop?.bunnyDiscard?.[0] || next.discardPile.find((card) => card.kind === "bunny");
      next = chooseKillerBunniesRevivedBunny(next, playerIndex, revived.id);
    } else if (next.phase === "target") {
      const target = next.pendingAction.allowOwnTarget
        ? { playerIndex, bunny: next.players[playerIndex].bunnies[0] }
        : findBotTarget(next, playerIndex);
      if (!target) {
        discardUsedWeapon(next, next.pendingAction.card);
        next.pendingAction = null;
        next = advanceToDraw(next);
      } else {
        next = chooseKillerBunniesTarget(next, playerIndex, target.playerIndex, target.bunny.id, random);
      }
    } else if (next.phase === "chooseCarrot") {
      const chooserIndex = next.pendingAction?.playerIndex;
      if (!next.players[chooserIndex]?.isComputer) break;
      const carrot = next.carrotMarket[Math.floor(random() * next.carrotMarket.length)];
      next = chooseKillerBunniesCarrot(next, chooserIndex, carrot.id);
    } else if (next.phase === "draw") {
      next = drawKillerBunniesPile(next, playerIndex, "main", {}, random);
    } else if (next.phase === "replace") {
      const choice = chooseBotRunCard(next.players[playerIndex]);
      next = replaceBottomRun(next, playerIndex, choice.id);
    } else if (next.phase === "trimHand") {
      const choice = next.players[playerIndex].hand.find((card) => card.kind !== "bunny") || next.players[playerIndex].hand.at(-1);
      next = discardExtraKillerBunniesCard(next, playerIndex, choice.id);
    } else {
      break;
    }
    steps += 1;
  }
  if (steps >= 10000) throw new Error("Computer turns did not finish.");
  return next;
}

export function getKillerBunniesPileStatus(game, playerIndex, pile) {
  if (!game) return { enabled: false, reason: "Start a game first." };
  const isCurrent = game.currentPlayerIndex === playerIndex;
  const player = game.players[playerIndex];
  if (pile === "main") {
    return game.phase === "draw" && isCurrent
      ? { enabled: true, reason: "Draw your replacement card." }
      : { enabled: false, reason: "Available after resolving TOP RUN." };
  }
  if (pile === "magic") {
    return game.phase === "reveal"
      ? { enabled: true, reason: "Reveal the winning carrot." }
      : { enabled: false, reason: "Locked until every market carrot is claimed." };
  }
  if (!isCurrent || game.phase !== "play") return { enabled: false, reason: "Shop only before flipping TOP RUN on your turn." };
  const market = getKaballasMarket(game);
  if (["cabbage", "water", "carrot"].includes(pile) && !market.isOpen) {
    return { enabled: false, reason: "Kaballa’s Market is closed." };
  }
  if (pile === "cabbage" || pile === "water") {
    if (game.purchases[pile]) return { enabled: false, reason: `Already bought ${pile} this turn.` };
    if (!game[`${pile}Supply`].length) return { enabled: false, reason: "Supply is empty." };
    const price = market.prices[pile];
    const feeding = getKillerBunniesFeedingStatus(player);
    const due = pile === "cabbage" ? feeding.cabbageShortfall : feeding.waterShortfall;
    return bankTotal(player) >= price
      ? { enabled: true, reason: `Buy one ${pile} card for ${price} Dolla.${due > 0 ? ` You still need ${due} for feeding.` : ""}` }
      : { enabled: false, reason: `You need ${price} Dolla.` };
  }
  if (pile === "carrot") {
    if (game.purchases.carrot) return { enabled: false, reason: "Already bought a carrot this turn." };
    const price = market.prices.carrot;
    return bankTotal(player) >= price
      ? { enabled: true, reason: `Choose a market carrot for ${price} Dolla.` }
      : { enabled: false, reason: `You need ${price} Dolla.` };
  }
  return { enabled: false, reason: "Unavailable." };
}

export function bankTotal(player) {
  return (player.dollaCredit || 0) + player.bank.reduce((total, card) => total + card.value, 0);
}

export function getKillerBunniesSupplyUnits(player, resource) {
  return supplyUnitTotal(player, resource);
}

export function getKaballasMarket(game) {
  return game?.kaballasMarket || KABALLAS_MARKET_STARTER;
}

export function getKillerBunniesCardPlayStatus(player, card) {
  if (!card) return { enabled: false, reason: "No card is programmed." };
  const requiresBunny = card.requiresBunny === true || card.aggressive === true || ["weapon", "feed"].includes(card.kind);
  const eligibleBunnyCount = (player?.bunnies || []).filter((bunny) => !hasHeavenlyHalo(bunny)).length;
  if (requiresBunny && !eligibleBunnyCount) {
    return { enabled: false, reason: `${card.name} requires a living bunny in your Bunny Circle.` };
  }
  return { enabled: true, reason: "This card may be played." };
}

export function getKillerBunniesFeedingStatus(player) {
  const obligations = player?.feedingObligations || [];
  const livingBunnyIds = new Set((player?.bunnies || []).map((bunny) => bunny.id));
  const active = obligations.filter((obligation) => livingBunnyIds.has(obligation.bunnyId));
  const cabbageDue = active.reduce((total, obligation) => total + (obligation.cabbageCost || 0), 0);
  const waterDue = active.reduce((total, obligation) => total + (obligation.waterCost || 0), 0);
  return {
    obligations: active,
    cabbageDue,
    waterDue,
    cabbageShortfall: Math.max(0, cabbageDue - supplyUnitTotal(player, "cabbage")),
    waterShortfall: Math.max(0, waterDue - supplyUnitTotal(player, "water")),
    canFeedAll: supplyUnitTotal(player, "cabbage") >= cabbageDue && supplyUnitTotal(player, "water") >= waterDue,
  };
}

export function getKillerBunniesShopItemStatus(game, playerIndex, shop, item, cardId) {
  if (!game) return { enabled: false, reason: "Start a game first.", price: 0 };
  if (game.currentPlayerIndex !== playerIndex || game.phase !== "play") {
    return { enabled: false, reason: "Shop before flipping TOP RUN on your turn.", price: 0 };
  }
  const player = game.players[playerIndex];
  if (shop === "rooneys") {
    const store = game.rooneysEmporium;
    if (!store) return { enabled: false, reason: "Add the Red Booster to open Rooney’s.", price: 0 };
    if (!store.isOpen) return { enabled: false, reason: "Rooney’s Weapons Emporium is closed.", price: 0 };
    const card = item === "weapon" ? store.weaponDiscard.find((entry) => entry.id === cardId) : store.defenseSupply.at(-1);
    const price = item === "weapon" ? card?.power || 0 : store.defensePrice;
    if (!card) return { enabled: false, reason: `No ${item} cards are available.`, price };
    return bankTotal(player) >= price
      ? { enabled: true, reason: `Buy for ${price} Dolla. It goes to your hand.`, price }
      : { enabled: false, reason: `You need ${price} Dolla.`, price };
  }
  if (shop === "weils") {
    const store = game.weilsPawnShop;
    if (!store) return { enabled: false, reason: "Add the Orange Booster to open Weil’s.", price: 0 };
    if (!store.isOpen) return { enabled: false, reason: "Weil’s Pawn Shop is closed.", price: 0 };
    const card = item === "pawn"
      ? store.pawnSupply.find((entry) => entry.id === cardId)
      : store.bunnyDiscard.find((entry) => entry.id === cardId);
    const price = item === "pawn" ? store.pawnPrice : store.bunnyPrice;
    if (!card) return { enabled: false, reason: `No ${item === "pawn" ? "pawns" : "bunnies"} are available.`, price };
    return bankTotal(player) >= price
      ? { enabled: true, reason: item === "bunny" ? `Buy for ${price} Dolla. This bunny must be run through.` : `Buy this pawn for ${price} Dolla.`, price }
      : { enabled: false, reason: `You need ${price} Dolla.`, price };
  }
  return { enabled: false, reason: "That shop is unavailable.", price: 0 };
}

export function buyKillerBunniesShopItem(game, playerIndex, shop, item, cardId) {
  const status = getKillerBunniesShopItemStatus(game, playerIndex, shop, item, cardId);
  if (!status.enabled) throw new Error(status.reason);
  const next = clone(game);
  const player = next.players[playerIndex];
  spendBank(player, status.price, next.discardPile);
  let purchased;

  if (shop === "rooneys" && item === "defense") purchased = next.rooneysEmporium.defenseSupply.pop();
  else if (shop === "rooneys" && item === "weapon") purchased = removeFirst(next.rooneysEmporium.weaponDiscard, (card) => card.id === cardId);
  else if (shop === "weils" && item === "pawn") purchased = removeFirst(next.weilsPawnShop.pawnSupply, (pawn) => pawn.id === cardId);
  else if (shop === "weils" && item === "bunny") purchased = removeFirst(next.weilsPawnShop.bunnyDiscard, (card) => card.id === cardId);
  if (!purchased) throw new Error("That shop item is no longer available.");

  if (item === "defense") player.defenseCards.push(purchased);
  else if (item === "pawn") player.pawns.push(purchased);
  else player.hand.push(purchased);
  next.message = `${player.name} bought ${purchased.name} for ${status.price} Dolla. Shop again or flip TOP RUN.`;
  pushLog(next, `${player.name} bought ${purchased.name} from ${shop === "rooneys" ? "Rooney’s" : "Weil’s"}.`);
  return next;
}

function resolveRunCard(game, playerIndex, card, random, options = {}) {
  const player = game.players[playerIndex];
  const playStatus = getKillerBunniesCardPlayStatus(player, card);
  if (!playStatus.enabled) {
    game.discardPile.push(card);
    pushLog(game, `${player.name} discarded ${card.name} because they had no living bunny.`);
    const next = finishCardEffect(game, options);
    next.message = options.returnPhase === "play"
      ? `${card.name} could not be played without a living bunny and was discarded. Continue your turn.`
      : `${card.name} could not be played without a living bunny and was discarded. Click the main draw pile.`;
    return next;
  }
  if (card.kind === "bunny") {
    player.bunnies.push(card);
    addKillerBunnyToCircle(game, card.id);
    pushLog(game, `${card.name} joined ${player.name}'s Bunny Circle.`);
    return finishCardEffect(game, options);
  }
  if (card.kind === "modifier" || card.originalKind === "modifier") {
    if (!game.players.some((entry) => entry.bunnies.length)) {
      game.discardPile.push(card);
      pushLog(game, `${card.name} was discarded because there were no bunnies in the Bunny Circle.`);
      return finishCardEffect(game, options);
    }
    game.phase = "modifierTarget";
    game.pendingAction = { playerIndex, effect: "modifier", card, ...effectReturnState(options) };
    game.message = `Choose any bunny in the Bunny Circle for ${card.name}. Once attached, it cannot be moved.`;
    return game;
  }
  if (card.catalogNumber === "0055" || /^Defector Detector$/i.test(card.name)) {
    game.phase = "defectorTarget";
    game.pendingAction = { playerIndex, effect: "defectorDetector", card, ...effectReturnState(options) };
    game.message = "Choose any bunny for Defector Detector, or discard the card without using it.";
    return game;
  }
  if ([47, 54].includes(Number(card.number))) {
    const viable = getKillerBunniesCircleEntries(game).some((entry) => isViableRoamingTarget(entry.bunny, card));
    if (!viable) {
      discardUsedWeapon(game, card);
      return finishCardEffect(game, options);
    }
    game.phase = "roamingTarget";
    game.pendingAction = { playerIndex, effect: "roamingTarget", card, ...effectReturnState(options) };
    game.message = `Choose the first bunny for ${card.name}. Its owner must roll.`;
    return game;
  }
  if ([51, 52, 56, 64, 70].includes(Number(card.number))) {
    game.phase = "playerTarget";
    game.pendingAction = { playerIndex, effect: "playerTarget", card, ...effectReturnState(options) };
    game.message = `Choose a player for ${card.name}.`;
    return game;
  }
  if ([49, 50, 72, 73].includes(Number(card.number))) {
    if (!game.players.some((target) => target.bunnies.length)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "utilityBunnyTarget";
    game.pendingAction = { playerIndex, effect: "utilityBunnyTarget", card, ...effectReturnState(options) };
    game.message = [49, 50].includes(Number(card.number))
      ? `Choose any unprotected bunny for ${card.name}. The previously abducted bunny, if any, will return.`
      : `Choose a bunny whose feeding obligations ${card.name} will satisfy.`;
    return game;
  }
  if ([66, 67, 74, 75].includes(Number(card.number))) {
    if (!game.players.some((target) => target.bunnies.length)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "blueRollTarget";
    game.pendingAction = { playerIndex, effect: "blueRollTarget", card, ...effectReturnState(options) };
    game.message = `Choose any bunny for ${card.name}. Its owner will roll.`;
    return game;
  }
  if ([68, 69, 82, 146, 150].includes(Number(card.number))) {
    return resolveAutomaticBlueYellowCard(game, playerIndex, card, options);
  }
  if ([76, 77].includes(Number(card.number))) {
    game.phase = "numberChoice";
    game.pendingAction = { playerIndex, effect: "magicFountain", card, ...effectReturnState(options) };
    game.message = "Choose a lucky number from 1 through 12 for The Magic Fountain.";
    return game;
  }
  if ([78, 79].includes(Number(card.number))) {
    game.phase = "blueSpecialRoll";
    game.pendingAction = { playerIndex, effect: "suppliesSurprise", card, diceCount: 5, ...effectReturnState(options) };
    game.message = `${player.name}: roll the five colored d12s for Supplies Surprise.`;
    return game;
  }
  if (card.kind === "weapon" || card.kind === "feed") {
    const badKarma = card.kind === "weapon" && player.badKarma;
    const hasTarget = badKarma ? player.bunnies.length > 0 : Boolean(findBotTarget(game, playerIndex));
    if (!hasTarget) {
      discardUsedWeapon(game, card);
      pushLog(game, `No opposing bunny could be targeted by ${card.name}.`);
      return finishCardEffect(game, options);
    }
    game.phase = "target";
    game.pendingAction = { playerIndex, effect: card.kind, card, allowOwnTarget: badKarma, ...effectReturnState(options) };
    game.message = badKarma ? `Bad Karma: choose one of your own bunnies for ${card.name}.` : `Choose an opponent's bunny for ${card.name}.`;
    return game;
  }
  if (card.kind === "chooseCarrot" || card.effect === "goldenCarrot") {
    if (!game.carrotMarket.length) {
      game.discardPile.push(card);
      return beginMagicReveal(game);
    }
    game.phase = "chooseCarrot";
    const remainingCount = Math.min(card.carrotCount || 1, game.carrotMarket.length);
    game.pendingAction = { playerIndex, effect: "chooseCarrot", card, remainingCount, ...effectReturnState(options) };
    game.message = `Choose ${remainingCount === 1 ? "any" : remainingCount} face-up carrot${remainingCount === 1 ? "" : "s"} from the market.`;
    return game;
  }
  if (card.kind === "defense" || card.effect === "burrow") {
    player.shields += 1;
    game.discardPile.push(card);
    pushLog(game, `${player.name} prepared a burrow shield.`);
    return finishCardEffect(game, options);
  }
  if (card.effect === "resupply") {
    if (getKaballasMarket(game).isOpen) {
      if (game.cabbageSupply.length) player.cabbage.push(game.cabbageSupply.pop());
      if (game.waterSupply.length) player.water.push(game.waterSupply.pop());
    }
    game.discardPile.push(card);
    pushLog(game, getKaballasMarket(game).isOpen
      ? `${player.name} collected emergency food and water.`
      : `${player.name} found Kaballa’s Market closed and collected nothing.`);
    return finishCardEffect(game, options);
  }
  if (card.effect === "cashCrop") {
    const bonus = removeFirst(game.mainDeck, (candidate) => candidate.kind === "money")
      || removeFirst(game.discardPile, (candidate) => candidate.kind === "money");
    if (bonus) player.bank.push(bonus);
    game.discardPile.push(card);
    pushLog(game, bonus ? `${player.name} harvested ${bonus.value} Bunny Bucks.` : `${player.name}'s cash crop came up empty.`);
    return finishCardEffect(game, options);
  }
  if (card.kind === "shopMarket") {
    const shop = card.shop === "rooneys" ? game.rooneysEmporium : game.weilsPawnShop;
    if (shop) {
      shop.isOpen = card.shopOpen;
      shop.activeCard = { id: card.id, name: card.name, detail: card.detail };
      pushLog(game, `${shop.name} ${card.shopOpen ? "opened" : "closed"}.`);
    }
    game.discardPile.push(card);
    return finishCardEffect(game, options);
  }
  if (card.kind === "market") {
    game.kaballasMarket = {
      ...structuredClone(KABALLAS_MARKET_STARTER),
      isOpen: card.marketOpen,
      prices: card.prices ? { ...card.prices } : { ...getKaballasMarket(game).prices },
      activeCard: { id: card.id, name: card.name, detail: card.detail },
    };
    game.discardPile.push(card);
    pushLog(game, card.marketOpen
      ? `Kaballa’s Market opened: Cabbage ${game.kaballasMarket.prices.cabbage}, Water ${game.kaballasMarket.prices.water}, Carrots ${game.kaballasMarket.prices.carrot}.`
      : "Kaballa’s Market closed. Purchases are suspended.");
    return finishCardEffect(game, options);
  }
  if (card.effectImplemented === false) {
    game.phase = "manualResolve";
    game.pendingAction = { playerIndex, effect: "manualCard", card, ...effectReturnState(options) };
    game.message = `${card.name}: review the ability and requirements, resolve the listed choices at the table, then confirm.`;
    pushLog(game, `${player.name} is resolving ${card.name} with the guided card ruling.`);
    return game;
  }
  game.discardPile.push(card);
  return finishCardEffect(game, options);
}

function isSavableSpecial(card) {
  return card?.type === "SPECIAL" || card?.type === "VERY SPECIAL";
}

function resolveAutomaticBlueYellowCard(game, playerIndex, card, options) {
  const player = game.players[playerIndex];
  const number = Number(card.number);
  if ([68, 69, 146].includes(number)) {
    const resources = number === 68 ? ["cabbage", "cabbage"] : number === 69 ? ["water", "water"] : ["cabbage", "water"];
    if (getKaballasMarket(game).isOpen) {
      for (const resource of resources) {
        const supply = game[`${resource}Supply`];
        if (supply.length) player[resource].push(supply.pop());
      }
      pushLog(game, `${player.name} collected ${resources.join(" and ")} from Kaballa's Market.`);
    } else {
      pushLog(game, `${card.name} found Kaballa's Market closed.`);
    }
  } else if (number === 82) {
    let cleared = 0;
    for (const target of game.players) {
      for (const obligation of target.feedingObligations || []) game.discardPile.push(obligation.card);
      cleared += target.feedingObligations?.length || 0;
      target.feedingObligations = [];
    }
    game.roamingEffects = (game.roamingEffects || []).filter((effect) => {
      const removes = /Ebola Virus/i.test(effect.card?.name || "");
      if (removes) game.discardPile.push(effect.card);
      return !removes;
    });
    pushLog(game, `Sunny Day cleared ${cleared} feeding obligation${cleared === 1 ? "" : "s"} and every Ebola Virus.`);
  } else if (number === 150) {
    const topRuns = game.players.map((target) => target.topRun);
    game.players.forEach((target, index) => {
      target.topRun = topRuns[(index + 1) % topRuns.length];
    });
    pushLog(game, "Every TOP RUN card rotated one seat counter-clockwise.");
  }
  game.discardPile.push(card);
  return finishCardEffect(game, options);
}

function resolveCarrotTopCasino(game, pending, rolls) {
  const counts = new Map();
  for (const roll of rolls) counts.set(roll, (counts.get(roll) || 0) + 1);
  const largestMatch = Math.max(...counts.values());
  const targetEntry = findKillerBunnyInCircle(game, pending.bunnyId);
  if (!targetEntry) return finishRolledBlueCard(game, pending);

  if (largestMatch >= 3) {
    if (!hasHeavenlyHalo(targetEntry.bunny)) {
      targetEntry.player.bunnies.splice(targetEntry.bunnyIndex, 1);
      discardBunny(game, targetEntry.bunny);
      pushLog(game, `Casino bosses eliminated ${targetEntry.bunny.name} after rolls ${rolls.join(", ")}.`);
    }
    return finishRolledBlueCard(game, pending);
  }
  if (largestMatch >= 2) {
    immediatelyFeedOrEliminate(game, targetEntry, 1, 1, pending.card.name);
    return finishRolledBlueCard(game, pending);
  }

  awardDollaFromDiscard(game, targetEntry.player, 7);
  if (getKaballasMarket(game).isOpen && game.carrotMarket.length) {
    game.phase = "chooseCarrot";
    game.pendingAction = { ...pending, playerIndex: targetEntry.playerIndex, effect: "chooseCarrot", remainingCount: 1 };
    game.message = `${targetEntry.player.name}: choose a Carrot and collect 7 Dolla for five different rolls.`;
    return game;
  }
  return finishRolledBlueCard(game, pending);
}

function resolveMadBakery(game, pending, roll) {
  const targetEntry = findKillerBunnyInCircle(game, pending.bunnyId);
  if (!targetEntry) return finishRolledBlueCard(game, pending);
  if (roll >= 10) {
    if (getKaballasMarket(game).isOpen && game.carrotMarket.length) {
      game.phase = "chooseCarrot";
      game.pendingAction = { ...pending, playerIndex: targetEntry.playerIndex, effect: "chooseCarrot", remainingCount: 1 };
      game.message = `${targetEntry.player.name}: choose a Carrot for rolling ${roll}.`;
      return game;
    }
  } else if (roll >= 7) {
    if (getKaballasMarket(game).isOpen) {
      if (game.cabbageSupply.length) targetEntry.player.cabbage.push(game.cabbageSupply.pop());
      if (game.waterSupply.length) targetEntry.player.water.push(game.waterSupply.pop());
    }
  } else if (roll >= 4) {
    immediatelyFeedOrEliminate(game, targetEntry, 1, 1, pending.card.name);
  } else if (roll >= 2) {
    eliminateCircleEntry(game, targetEntry, `${pending.card.name} roll ${roll}`);
  } else {
    const affected = getKillerBunniesCircleRange(game, pending.bunnyId, 1);
    for (const entry of affected) {
      if (!hasHeavenlyHalo(entry.bunny)) eliminateCircleEntry(game, findKillerBunnyInCircle(game, entry.bunny.id), `${pending.card.name} pitchfork`);
    }
  }
  return finishRolledBlueCard(game, pending);
}

function immediatelyFeedOrEliminate(game, targetEntry, cabbageCost, waterCost, sourceName) {
  if (hasHeavenlyHalo(targetEntry.bunny)) {
    pushLog(game, `${targetEntry.bunny.name}'s Heavenly Halo blocked ${sourceName}.`);
    return;
  }
  if (supplyUnitTotal(targetEntry.player, "cabbage") >= cabbageCost && supplyUnitTotal(targetEntry.player, "water") >= waterCost) {
    spendSupplyUnits(game, targetEntry.player, "cabbage", cabbageCost);
    spendSupplyUnits(game, targetEntry.player, "water", waterCost);
    pushLog(game, `${targetEntry.player.name} immediately fed ${targetEntry.bunny.name}.`);
  } else {
    eliminateCircleEntry(game, targetEntry, `${sourceName} hunger`);
  }
}

function eliminateCircleEntry(game, entry, source) {
  if (!entry) return;
  const current = findKillerBunnyInCircle(game, entry.bunny.id);
  if (!current) return;
  current.player.bunnies.splice(current.bunnyIndex, 1);
  discardBunny(game, current.bunny);
  pushLog(game, `${source} eliminated ${current.bunny.name}.`);
}

function finishRolledBlueCard(game, pending) {
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function awardDollaFromDiscard(game, player, amount) {
  let remaining = amount;
  const available = game.discardPile.filter((card) => card.kind === "money").sort((a, b) => b.value - a.value);
  for (const card of available) {
    if (card.value > remaining) continue;
    const removed = removeFirst(game.discardPile, (candidate) => candidate.id === card.id);
    if (removed) {
      player.bank.push(removed);
      remaining -= removed.value;
    }
    if (!remaining) break;
  }
  if (remaining) player.dollaCredit = (player.dollaCredit || 0) + remaining;
}

function continueBlueRewards(game, pending) {
  const playerIndex = pending.cardPlayerIndex ?? pending.playerIndex;
  pending.playerIndex = playerIndex;
  const discardedBunnies = [
    ...(game.weilsPawnShop?.bunnyDiscard || []),
    ...game.discardPile.filter((card) => card.kind === "bunny"),
  ];
  pending.reviveCount = Math.min(pending.reviveCount || 0, discardedBunnies.length);
  if (pending.reviveCount > 0) {
    game.phase = "reviveBunny";
    game.pendingAction = pending;
    game.message = `${game.players[playerIndex].name}: choose ${pending.reviveCount} discarded bunn${pending.reviveCount === 1 ? "y" : "ies"} to revive.`;
    return game;
  }
  if ((pending.carrotCount || 0) > 0 && getKaballasMarket(game).isOpen && game.carrotMarket.length) {
    game.phase = "chooseCarrot";
    game.pendingAction = { ...pending, playerIndex, effect: "chooseCarrot", remainingCount: 1, blueRewards: true };
    game.message = `${game.players[playerIndex].name}: choose a Carrot from Kaballa's Market.`;
    return game;
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function isViableRoamingTarget(bunny, card) {
  if (!bunny || hasHeavenlyHalo(bunny)) return false;
  return Number(card?.number) !== 47 || !hasContainmentSuit(bunny);
}

function discardRoamingCard(game, card) {
  if (card.kind === "weapon") discardUsedWeapon(game, card);
  else game.discardPile.push(card);
}

function finishRoamingAttack(game, pending, nextBunnyId) {
  if (pending.initialAttack) {
    if (nextBunnyId) {
      game.roamingEffects ||= [];
      game.roamingEffects.push({
        id: `roaming-${pending.card.id}`,
        card: pending.card,
        launchPlayerIndex: pending.cardPlayerIndex,
        currentBunnyId: nextBunnyId,
        direction: pending.direction,
        power: pending.power,
        visitedBunnyIds: pending.visitedBunnyIds,
        launchedTurnNumber: game.turnNumber,
      });
      pushLog(game, `${pending.card.name} moved to the next bunny and will attack again next round.`);
    } else {
      discardRoamingCard(game, pending.card);
      pushLog(game, `${pending.card.name} had no viable bunny left and was discarded.`);
    }
    game.pendingAction = null;
    return finishPendingEffect(game, pending);
  }

  const effectIndex = (game.roamingEffects || []).findIndex((effect) => effect.id === pending.roamingId);
  if (effectIndex >= 0) {
    if (nextBunnyId) {
      game.roamingEffects[effectIndex] = {
        ...game.roamingEffects[effectIndex],
        currentBunnyId: nextBunnyId,
        visitedBunnyIds: pending.visitedBunnyIds,
      };
    } else {
      const [finished] = game.roamingEffects.splice(effectIndex, 1);
      discardRoamingCard(game, finished.card);
      pushLog(game, `${finished.card.name} ran out of viable targets and left the Bunny Circle.`);
    }
  }
  return beginRoamingTurnAttack(game, pending.remainingRoamingEffects || [], pending.turnEndSummaries || [], pending.turnEndingPlayerIndex);
}

function beginRoamingTurnAttack(game, effects, summaries = [], turnEndingPlayerIndex = game.currentPlayerIndex) {
  const remaining = effects.map((effect) => typeof effect === "string"
    ? (game.roamingEffects || []).find((candidate) => candidate.id === effect)
    : effect).filter(Boolean);
  while (remaining.length) {
    const effect = remaining.shift();
    const entry = findKillerBunnyInCircle(game, effect.currentBunnyId);
    const viable = entry && isViableRoamingTarget(entry.bunny, effect.card)
      && (Number(effect.card.number) !== 47 || !effect.visitedBunnyIds.includes(entry.bunny.id));
    if (!viable) {
      const anchorId = entry?.bunny.id || getKillerBunniesCircleEntries(game)[0]?.bunny.id;
      const replacement = anchorId && getNextKillerBunnyInCircle(game, anchorId, effect.direction, (candidate) =>
        isViableRoamingTarget(candidate.bunny, effect.card)
          && (Number(effect.card.number) !== 47 || !effect.visitedBunnyIds.includes(candidate.bunny.id)));
      if (!replacement) {
        game.roamingEffects = (game.roamingEffects || []).filter((candidate) => candidate.id !== effect.id);
        discardRoamingCard(game, effect.card);
        continue;
      }
      effect.currentBunnyId = replacement.bunny.id;
    }
    const target = findKillerBunnyInCircle(game, effect.currentBunnyId);
    game.phase = "roamingRoll";
    game.pendingAction = {
      effect: "roamingAttack",
      roamingId: effect.id,
      card: effect.card,
      cardPlayerIndex: effect.launchPlayerIndex,
      playerIndex: target.playerIndex,
      targetPlayerIndex: target.playerIndex,
      bunnyId: target.bunny.id,
      direction: effect.direction,
      power: effect.power,
      visitedBunnyIds: effect.visitedBunnyIds,
      initialAttack: false,
      remainingRoamingEffects: remaining.map((entry) => entry.id),
      turnEndSummaries: summaries,
      turnEndingPlayerIndex,
    };
    game.message = `${target.player.name}: ${effect.card.name} attacks ${target.bunny.name}. Roll a d12.`;
    return game;
  }
  game.pendingAction = null;
  return completeTurnAdvance(game, turnEndingPlayerIndex, summaries);
}

function effectReturnState(options) {
  return options.returnPhase === "play"
    ? { returnPhase: "play", resumePlayerIndex: options.resumePlayerIndex }
    : {};
}

function finishCardEffect(game, options = {}) {
  return options.returnPhase === "play"
    ? resumePlay(game, options.resumePlayerIndex)
    : advanceToDraw(game);
}

function finishPendingEffect(game, pending) {
  return pending?.returnPhase === "play"
    ? resumePlay(game, pending.resumePlayerIndex)
    : advanceToDraw(game);
}

function isAreaWeapon(card) {
  return [48, 131, 132, 133].includes(Number(card?.number));
}

function beginAreaWeapon(game, pending, attackingPlayerIndex, bunnyId) {
  const number = Number(pending.card.number);
  const maximumDistance = number === 48 ? 2 : number === 131 ? 1 : number === 133 ? 3 : Infinity;
  const affected = getKillerBunniesCircleRange(game, bunnyId, maximumDistance).map((entry) => {
    const power = number === 131 ? (entry.distance === 0 ? 10 : 9)
      : number === 132 ? Math.max(0, 11 - entry.distance)
        : 12;
    return {
      bunnyId: entry.bunny.id,
      playerIndex: entry.playerIndex,
      name: entry.bunny.name,
      distance: entry.distance,
      power,
      protected: hasHeavenlyHalo(entry.bunny),
    };
  }).filter((entry) => entry.power > 0);
  const rollQueue = affected.filter((entry) => !entry.protected).map((entry) => entry.bunnyId);
  game.phase = "areaWeaponRoll";
  game.pendingAction = {
    ...pending,
    effect: "areaWeapon",
    attackingPlayerIndex,
    targetBunnyId: bunnyId,
    affected,
    rollQueue,
    playerIndex: affected.find((entry) => entry.bunnyId === rollQueue[0])?.playerIndex ?? attackingPlayerIndex,
  };
  pushLog(game, `${game.players[attackingPlayerIndex].name} launched ${pending.card.name} at ${affected[0]?.name || "the Bunny Circle"}.`);
  return rollQueue.length ? continueAreaWeapon(game) : finishAreaWeapon(game);
}

function continueAreaWeapon(game) {
  const pending = game.pendingAction;
  while (pending.rollQueue.length && !findKillerBunnyInCircle(game, pending.rollQueue[0])) pending.rollQueue.shift();
  if (!pending.rollQueue.length) return finishAreaWeapon(game);
  const current = pending.affected.find((entry) => entry.bunnyId === pending.rollQueue[0]);
  pending.playerIndex = current.playerIndex;
  game.phase = "areaWeaponRoll";
  game.message = `${game.players[current.playerIndex].name}: roll a d12 for ${current.name} against ${pending.card.name} level ${current.power}.`;
  return game;
}

function finishAreaWeapon(game) {
  const pending = game.pendingAction;
  discardUsedWeapon(game, pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function resumePlay(game, playerIndex) {
  game.currentPlayerIndex = Number.isInteger(playerIndex) ? playerIndex : game.currentPlayerIndex;
  if ((game.runPlaysThisTurn || 0) === 1 && !getKillerBunniesExtraRunStatus(game.players[game.currentPlayerIndex]).enabled) {
    return finishTurn(game, game.currentPlayerIndex);
  }
  game.phase = "play";
  game.pendingAction = null;
  game.message = `${game.players[game.currentPlayerIndex].name} may play saved cards, shop, or flip TOP RUN.`;
  return game;
}

function advanceToDraw(game) {
  if (!game.carrotMarket.length) return beginMagicReveal(game);
  game.phase = "draw";
  game.message = "Click the main draw pile to refill your hand.";
  return game;
}

function beginMagicReveal(game) {
  game.phase = "reveal";
  game.pendingAction = null;
  game.message = "The market is empty. Click the hidden Magic Carrot pile to reveal the winner!";
  pushLog(game, "Every carrot has been claimed. The Magic Carrot is ready.");
  return game;
}

function settleMagicCarrot(game, magic) {
  const hasLivingBunny = (player, index) => player.bunnies.length > 0 || game.area51Abducted?.ownerIndex === index;
  const eligible = game.players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => hasLivingBunny(player, index));
  for (const { player, index } of game.players.map((player, index) => ({ player, index }))) {
    if (hasLivingBunny(player, index) || !player.carrots.length || !eligible.length) continue;
    const recipient = [...eligible].sort((a, b) => bankTotal(b.player) - bankTotal(a.player))[0].player;
    recipient.carrots.push(...player.carrots.splice(0));
  }
  game.winnerIndexes = game.players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => hasLivingBunny(player, index) && player.carrots.some((carrot) => carrot.carrotKey === magic.carrotKey))
    .map(({ index }) => index);
  game.phase = "gameOver";
  game.message = game.winnerIndexes.length
    ? `${game.winnerIndexes.map((index) => game.players[index].name).join(" & ")} found the Magic Carrot!`
    : "The Magic Carrot escaped everyone. No bunny wins this hunt.";
  pushLog(game, `Magic Carrot ${magic.label} was revealed.`);
}

function buySupply(game, playerIndex, pile) {
  const status = getKillerBunniesPileStatus(game, playerIndex, pile);
  if (!status.enabled) throw new Error(status.reason);
  const player = game.players[playerIndex];
  const price = getKaballasMarket(game).prices[pile];
  spendBank(player, price, game.discardPile);
  const [card] = game[`${pile}Supply`].splice(-1);
  player[pile].push(card);
  game.purchases[pile] = true;
  game.message = `${player.name} bought ${pile} for ${price} Dolla. You may shop again or flip TOP RUN.`;
  pushLog(game, `${player.name} bought one ${pile} card for ${price} Dolla.`);
}

function buyCarrot(game, playerIndex, carrotId) {
  const status = getKillerBunniesPileStatus(game, playerIndex, "carrot");
  if (!status.enabled) throw new Error(status.reason);
  const carrotIndex = game.carrotMarket.findIndex((card) => card.id === carrotId);
  if (carrotIndex < 0) throw new Error("That carrot is no longer in the market.");
  const player = game.players[playerIndex];
  const price = getKaballasMarket(game).prices.carrot;
  spendBank(player, price, game.discardPile);
  const [carrot] = game.carrotMarket.splice(carrotIndex, 1);
  player.carrots.push(carrot);
  game.purchases.carrot = true;
  game.message = `${player.name} bought Carrot ${carrot.label} for ${price} Dolla. Shop again or flip TOP RUN.`;
  pushLog(game, `${player.name} bought Carrot ${carrot.label} for ${price} Dolla.`);
}

function spendBank(player, cost, discardPile) {
  if (bankTotal(player) < cost) throw new Error(`You need ${cost} Bunny Bucks.`);
  const creditSpent = Math.min(player.dollaCredit || 0, cost);
  player.dollaCredit = (player.dollaCredit || 0) - creditSpent;
  let remaining = cost - creditSpent;
  player.bank.sort((a, b) => a.value - b.value);
  while (remaining > 0) {
    const card = player.bank.shift();
    remaining -= card.value;
    discardPile.push(card);
  }
}

function dealPlayableCard(game, player, playerIndex) {
  const card = drawMain(game);
  if (!card) return;
  if (card.kind === "money") player.bank.push(card);
  else if (isPlayImmediately(card)) game.immediateQueue.push({ playerIndex, card });
  else player.hand.push(card);
}

function isPlayImmediately(card) {
  return card?.type === "PLAY IMMEDIATELY";
}

function isTerribleMisfortune(card) {
  return card?.originalKind === "misfortune" || /^Terrible Misfortune\b/i.test(card?.name || "");
}

function beginImmediateCard(game, playerIndex, card, returnState = {}) {
  const player = game.players[playerIndex];
  pushLog(game, `${player.name} drew PLAY IMMEDIATELY card ${card.name}.`);

  if (isTerribleMisfortune(card)) {
    const vulnerableOwnBunnies = player.bunnies.filter((bunny) => !hasHeavenlyHalo(bunny));
    if (!vulnerableOwnBunnies.length) {
      const hasOpponentTarget = game.players.some((candidate, targetPlayerIndex) => targetPlayerIndex !== playerIndex
        && candidate.bunnies.some((bunny) => !hasHeavenlyHalo(bunny)));
      if (!hasOpponentTarget) {
        game.discardPile.push(card);
        pushLog(game, `${card.name} found no vulnerable bunny in the Bunny Circle and was discarded.`);
        return finishImmediateEffect(game, returnState);
      }
      game.phase = "immediateTarget";
      game.pendingAction = { playerIndex, effect: "terribleMisfortune", card, targetScope: "opponent", ...returnState };
      game.message = `${player.name} has no vulnerable bunny and must immediately choose an opponent's bunny to eliminate.`;
      return game;
    }
    if (vulnerableOwnBunnies.length === 1) {
      const bunnyIndex = player.bunnies.findIndex((bunny) => bunny.id === vulnerableOwnBunnies[0].id);
      const [bunny] = player.bunnies.splice(bunnyIndex, 1);
      discardBunny(game, bunny);
      game.discardPile.push(card);
      pushLog(game, `${card.name} immediately eliminated ${player.name}'s ${bunny.name}.`);
      return finishImmediateEffect(game, returnState);
    }
    game.phase = "immediateTarget";
    game.pendingAction = { playerIndex, effect: "terribleMisfortune", card, targetScope: "own", ...returnState };
    game.message = `${player.name} drew ${card.name} and must immediately choose one of their own bunnies to eliminate.`;
    return game;
  }

  game.phase = "immediateResolve";
  game.pendingAction = { playerIndex, effect: "playImmediately", card, ...returnState };
  game.message = returnState.returnPhase === "setupRun"
    ? `${player.name} drew ${card.name}. Perform its action immediately, then discard it before opening RUN programming begins.`
    : `${player.name} drew ${card.name}. Perform its action immediately, then discard it and draw a replacement.`;
  return game;
}

function startNextQueuedImmediate(game, returnState) {
  const queued = game.immediateQueue.shift();
  if (!queued) return returnFromImmediate(game, returnState);
  return beginImmediateCard(game, queued.playerIndex, queued.card, returnState);
}

function finishImmediateEffect(game, returnState) {
  if (game.immediateQueue?.length) return startNextQueuedImmediate(game, returnState);
  return returnFromImmediate(game, returnState);
}

function returnFromImmediate(game, returnState = {}) {
  game.pendingAction = null;
  if (returnState.returnPhase === "setupRun") {
    game.phase = "setupRun";
    game.currentPlayerIndex = Number.isInteger(returnState.resumePlayerIndex)
      ? returnState.resumePlayerIndex
      : game.startingPlayerIndex;
    game.message = `${game.players[game.currentPlayerIndex].name}: choose your opening TOP RUN and BOTTOM RUN cards.`;
    return game;
  }
  game.currentPlayerIndex = Number.isInteger(returnState.resumePlayerIndex)
    ? returnState.resumePlayerIndex
    : game.currentPlayerIndex;
  game.phase = "draw";
  game.message = "PLAY IMMEDIATELY resolved. Click the main draw pile for a replacement card.";
  return game;
}

function drawMain(game) {
  if (!game.mainDeck.length && (game.discardPile.length || game.rooneysEmporium?.weaponDiscard.length || game.weilsPawnShop?.bunnyDiscard.length)) {
    if (game.rooneysEmporium?.weaponDiscard.length) game.discardPile.push(...game.rooneysEmporium.weaponDiscard.splice(0));
    if (game.weilsPawnShop?.bunnyDiscard.length) game.discardPile.push(...game.weilsPawnShop.bunnyDiscard.splice(0));
    const recyclable = game.discardPile.filter((card) => ["bunny", "weapon", "feed", "chooseCarrot", "defense", "special", "verySpecial", "money", "action", "modifier", "misfortune", "market", "shopMarket"].includes(card.kind));
    game.discardPile = game.discardPile.filter((card) => !recyclable.includes(card));
    game.mainDeck = shuffle(recyclable, Math.random);
  }
  return game.mainDeck.pop() || null;
}

function createSupply(kind) {
  return [1, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5, 10].map((units, index) => ({
    id: `${kind}-${index + 1}`, kind, type: "SUPPLY", name: `${units} ${capitalize(kind)}`,
    units,
    detail: `${units} ${capitalize(kind)} Unit${units === 1 ? "" : "s"}.`,
  }));
}

function createDefenseSupply() {
  return [1, 3, 5, 7, 9, 11].map((units) => ({
    id: `rooneys-defense-${units}`,
    kind: "defenseSupply",
    type: "DEFENSE",
    name: `${units} Unit Defense`,
    units,
    detail: "Combine Defense units to meet or exceed a Weapon Level before rolling.",
  }));
}

function createPawnSupply() {
  return ["violet", "orange", "green", "yellow", "blue", "red"].map((color) => ({
    id: `weils-pawn-${color}`,
    kind: "pawn",
    type: "PAWN",
    name: `${capitalize(color)} Pawn`,
    color,
    detail: "A colored pawn used for matching bunny and die benefits.",
  }));
}

function discardUsedWeapon(game, card) {
  if (game.rooneysEmporium) game.rooneysEmporium.weaponDiscard.push(card);
  else game.discardPile.push(card);
}

function discardBunny(game, bunny) {
  removeKillerBunnyFromCircle(game, bunny.id);
  if (bunny.modifiers?.length) {
    game.discardPile.push(...bunny.modifiers);
    pushLog(game, `${bunny.modifiers.length} modifier card${bunny.modifiers.length === 1 ? " was" : "s were"} discarded with ${bunny.name}.`);
    bunny.modifiers = [];
  }
  if (game.weilsPawnShop) game.weilsPawnShop.bunnyDiscard.push(bunny);
  else game.discardPile.push(bunny);
}

function hasBunnyModifier(bunny, pattern) {
  return (bunny?.modifiers || []).some((modifier) => pattern.test(modifier.name || ""));
}

function hasHeavenlyHalo(bunny) {
  return hasBunnyModifier(bunny, /Heavenly Halo/i);
}

function hasContainmentSuit(bunny) {
  return hasBunnyModifier(bunny, /Containment Suit/i);
}

function completeDefectorRollRound(game) {
  const pending = game.pendingAction;
  const contenders = pending.contenderIndexes;
  const highest = Math.max(...contenders.map((index) => pending.scores[index]));

  if (pending.roundNumber === 1 && !pending.optionalRerollResolved
    && pending.scores[pending.cardPlayerIndex] < highest) {
    pending.playerIndex = pending.cardPlayerIndex;
    game.phase = "defectorReroll";
    game.message = `${game.players[pending.cardPlayerIndex].name}: keep your ${pending.scores[pending.cardPlayerIndex]}, or replace it with your one optional reroll.`;
    return game;
  }

  const winners = contenders.filter((index) => pending.scores[index] === highest);
  if (winners.length > 1) {
    pending.roundNumber += 1;
    pending.contenderIndexes = winners;
    pending.rollQueue = [...winners];
    for (const index of winners) pending.scores[index] = null;
    pending.playerIndex = winners[0];
    game.phase = "defectorRoll";
    game.message = `${winners.map((index) => game.players[index].name).join(" and ")} tied. ${game.players[winners[0]].name}: roll again.`;
    pushLog(game, `${winners.map((index) => game.players[index].name).join(" and ")} tied for the highest Defector Detector roll.`);
    return game;
  }

  return awardDefectorBunny(game, pending, winners[0], highest);
}

function awardDefectorBunny(game, pending, winnerIndex, winningRoll) {
  const ownerIndex = game.players.findIndex((player) => player.bunnies.some((bunny) => bunny.id === pending.bunnyId));
  if (ownerIndex < 0) throw new Error("The selected bunny is no longer in the Bunny Circle.");
  const owner = game.players[ownerIndex];
  const bunnyIndex = owner.bunnies.findIndex((bunny) => bunny.id === pending.bunnyId);
  const [bunny] = owner.bunnies.splice(bunnyIndex, 1);
  const winner = game.players[winnerIndex];
  winner.bunnies.push(bunny);

  const travelingObligations = (owner.feedingObligations || []).filter((obligation) => obligation.bunnyId === bunny.id);
  owner.feedingObligations = (owner.feedingObligations || []).filter((obligation) => obligation.bunnyId !== bunny.id);
  winner.feedingObligations ||= [];
  winner.feedingObligations.push(...travelingObligations);

  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${winner.name} won ${bunny.name} with a Defector Detector roll of ${winningRoll}.`);
  const continued = finishPendingEffect(game, pending);
  continued.message = `${winner.name} takes ${bunny.name} with a roll of ${winningRoll}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function supplyUnitTotal(player, resource) {
  const cards = player?.[resource] || [];
  const credit = player?.resourceCredits?.[resource] || 0;
  return credit + cards.reduce((total, card) => total + (Number.isFinite(card.units) ? card.units : 1), 0);
}

function spendSupplyUnits(game, player, resource, requiredUnits) {
  if (requiredUnits <= 0) return;
  player.resourceCredits ||= { cabbage: 0, water: 0 };
  const availableCredit = player.resourceCredits[resource] || 0;
  const creditSpent = Math.min(availableCredit, requiredUnits);
  player.resourceCredits[resource] = availableCredit - creditSpent;
  const cardCost = requiredUnits - creditSpent;
  if (!cardCost) return;

  const paymentIndexes = bestUnitSubset(player[resource], cardCost);
  if (!paymentIndexes) throw new Error(`You need ${requiredUnits} ${resource} units.`);
  const payment = paymentIndexes.sort((a, b) => b - a).map((index) => player[resource].splice(index, 1)[0]);
  const paidUnits = payment.reduce((total, card) => total + (card.units || 1), 0);
  const changeDue = paidUnits - cardCost;
  const discard = game[`${resource}Discard`] ||= [];

  if (changeDue > 0) {
    const changeIndexes = exactUnitSubset(discard, changeDue);
    if (changeIndexes) {
      const changeCards = changeIndexes.sort((a, b) => b - a).map((index) => discard.splice(index, 1)[0]);
      player[resource].push(...changeCards);
    } else {
      player.resourceCredits[resource] += changeDue;
      pushLog(game, `${player.name} is owed ${changeDue} ${resource} unit${changeDue === 1 ? "" : "s"} in change.`);
    }
  }
  discard.push(...payment);
}

function bestUnitSubset(cards, minimum) {
  const combinations = unitCombinations(cards);
  const totals = [...combinations.keys()].filter((total) => total >= minimum).sort((a, b) => a - b);
  return totals.length ? combinations.get(totals[0]) : null;
}

function exactUnitSubset(cards, total) {
  return unitCombinations(cards).get(total) || null;
}

function unitCombinations(cards) {
  const combinations = new Map([[0, []]]);
  cards.forEach((card, index) => {
    const units = Number.isFinite(card.units) ? card.units : 1;
    for (const [total, indexes] of [...combinations.entries()].sort((a, b) => b[0] - a[0])) {
      const nextTotal = total + units;
      if (!combinations.has(nextTotal)) combinations.set(nextTotal, [...indexes, index]);
    }
  });
  return combinations;
}

function spendDefenseCards(player, requiredUnits, discardPile) {
  player.defenseCards.sort((a, b) => b.units - a.units);
  let paid = 0;
  while (paid < requiredUnits) {
    const card = player.defenseCards.shift();
    if (!card) throw new Error(`You need ${requiredUnits} Defense units.`);
    paid += card.units;
    discardPile.push(card);
  }
}

function clone(value) { return structuredClone(value); }
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
const shuffle = shuffled;
function removeFirst(values, predicate) {
  const index = values.findIndex(predicate);
  if (index < 0) return null;
  return values.splice(index, 1)[0];
}
function moveCards(source, destination, count) { destination.push(...source.splice(-count)); }
function rollD12(random) { return 1 + Math.floor(random() * 12); }
function pushLog(game, entry) { game.log = [entry, ...game.log].slice(0, 12); }
function requireCurrent(game, playerIndex, phase) {
  if (game.currentPlayerIndex !== playerIndex || game.phase !== phase) throw new Error("That action is not available right now.");
}
function requirePendingController(game, playerIndex, phase) {
  if (game.phase !== phase || game.pendingAction?.playerIndex !== playerIndex) {
    throw new Error("That action is not available right now.");
  }
  return game.pendingAction;
}
function findBotTarget(game, playerIndex) {
  for (let offset = 1; offset < game.players.length; offset += 1) {
    const index = (playerIndex + offset) % game.players.length;
    if (game.players[index].bunnies.length) return { playerIndex: index, bunny: game.players[index].bunnies[0] };
  }
  return null;
}
function findBotModifierTarget(game, playerIndex) {
  const ownBunny = game.players[playerIndex].bunnies[0];
  if (ownBunny) return { playerIndex, bunny: ownBunny };
  for (let offset = 1; offset < game.players.length; offset += 1) {
    const targetPlayerIndex = (playerIndex + offset) % game.players.length;
    const bunny = game.players[targetPlayerIndex].bunnies[0];
    if (bunny) return { playerIndex: targetPlayerIndex, bunny };
  }
  return null;
}
function findBotDefectorTarget(game, playerIndex) {
  for (let offset = 1; offset < game.players.length; offset += 1) {
    const targetPlayerIndex = (playerIndex + offset) % game.players.length;
    const bunny = game.players[targetPlayerIndex].bunnies[0];
    if (bunny) return { playerIndex: targetPlayerIndex, bunny };
  }
  const ownBunny = game.players[playerIndex].bunnies[0];
  return ownBunny ? { playerIndex, bunny: ownBunny } : null;
}
function chooseBotRunCard(player) {
  return player.hand.find((card) => card.kind === "bunny" && !player.bunnies.length)
    || player.hand.find((card) => card.kind === "chooseCarrot")
    || player.hand[0];
}
