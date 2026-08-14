import {
  createKillerBunniesExpansionContent,
  getKillerBunniesExpansionSummary,
  normalizeKillerBunniesExpansionIds,
} from "./killer-bunnies-expansions.js";
import { createKillerBunniesCatalogDeckContent } from "./killer-bunnies-card-adapter.js";

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
      shields: 0,
    })),
    mainDeck,
    discardPile: [],
    carrotMarket: shuffle([...BASE_CARROTS, ...expansionContent.carrotMarket], random),
    magicCarrotDeck: shuffle([...BASE_MAGIC_CARROTS, ...expansionContent.magicCarrots], random),
    cabbageSupply: createSupply("cabbage", KILLER_BUNNIES_CARD_COUNTS.cabbage),
    waterSupply: createSupply("water", KILLER_BUNNIES_CARD_COUNTS.water),
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
    pendingAction: null,
    revealedMagicCarrot: null,
    winnerIndexes: [],
    purchases: { cabbage: false, water: false, carrot: false },
    lastRoll: null,
    message: `${playerSeeds[startingPlayerIndex].name || `Player ${startingPlayerIndex + 1}`}: choose your opening TOP RUN and BOTTOM RUN cards.`,
    log: ["Players are programming their opening RUN cards."],
    cardCounts,
  };

  for (const player of game.players) {
    while (player.hand.length < 7) dealPlayableCard(game, player);
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
  const card = player.topRun;
  if (!card) throw new Error("Your TOP RUN slot is empty.");

  player.topRun = player.bottomRun;
  player.bottomRun = null;
  next.lastRoll = null;
  pushLog(next, `${player.name} flipped ${card.name}.`);
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

export function chooseKillerBunniesTarget(game, playerIndex, targetPlayerIndex, bunnyId, random = Math.random) {
  requirePendingController(game, playerIndex, "target");
  const next = clone(game);
  const pending = next.pendingAction;
  if (!pending || pending.playerIndex !== playerIndex) throw new Error("There is no target to choose.");
  const target = next.players[targetPlayerIndex];
  const bunnyIndex = target?.bunnies.findIndex((bunny) => bunny.id === bunnyId) ?? -1;
  if (targetPlayerIndex === playerIndex || bunnyIndex < 0) throw new Error("Choose an opponent's living bunny.");
  const bunny = target.bunnies[bunnyIndex];

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
  next.pendingAction = {
    ...pending,
    playerIndex: targetPlayerIndex,
    attackingPlayerIndex: playerIndex,
    targetPlayerIndex,
    bunnyId,
  };
  next.message = `${target.name} must roll a d12 for ${bunny.name}.`;
  pushLog(next, `${next.players[playerIndex].name} targeted ${bunny.name} with ${pending.card.name}.`);
  return next;
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
    if (choice === "defense") {
      const defenseTotal = target.defenseCards.reduce((total, card) => total + card.units, 0);
      if (defenseTotal < pending.card.power) throw new Error(`You need ${pending.card.power} Defense units to stop this weapon.`);
      spendDefenseCards(target, pending.card.power, next.discardPile);
      pushLog(next, `${target.name} used Defense Cards to stop ${pending.card.name}.`);
    } else if (choice === "roll") {
      const roll = 1 + Math.floor(random() * 12);
      next.lastRoll = { value: roll, sides: 12, label: pending.card.name };
      if (target.shields > 0) {
        target.shields -= 1;
        pushLog(next, `${target.name} rolled ${roll}; their burrow shield stopped ${pending.card.name}.`);
      } else if (roll <= pending.card.power) {
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
    const canFeed = target.cabbage.length >= cabbageCost && target.water.length >= waterCost;
    if (choice === "feed") {
      if (!canFeed) throw new Error("You do not have enough cabbage and water to feed this bunny.");
      moveCards(target.cabbage, next.cabbageSupply, cabbageCost);
      moveCards(target.water, next.waterSupply, waterCost);
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
  player.bottomRun = card;
  if (player.hand.length > 5) {
    next.phase = "trimHand";
    next.message = `Choose ${player.hand.length - 5} extra card${player.hand.length - 5 === 1 ? "" : "s"} to discard before ending your turn.`;
    return next;
  }
  return finishTurn(next, playerIndex);
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
  return finishTurn(next, playerIndex);
}

function finishTurn(game, playerIndex) {
  const next = game;
  const feedingSummary = settleFeedingObligations(next, playerIndex);
  next.currentPlayerIndex = (playerIndex + 1) % next.players.length;
  next.turnNumber += 1;
  next.phase = "play";
  next.purchases = { cabbage: false, water: false, carrot: false };
  next.message = `${feedingSummary ? `${feedingSummary} ` : ""}${next.players[next.currentPlayerIndex].name}'s turn: shop or flip TOP RUN.`;
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
    const cabbageCost = obligation.cabbageCost || obligation.card.cabbageCost || 0;
    const waterCost = obligation.waterCost || obligation.card.waterCost || 0;
    const canFeed = player.cabbage.length >= cabbageCost && player.water.length >= waterCost;

    if (canFeed) {
      moveCards(player.cabbage, game.cabbageSupply, cabbageCost);
      moveCards(player.water, game.waterSupply, waterCost);
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
    } else if (next.phase === "target") {
      const target = findBotTarget(next, playerIndex);
      if (!target) {
        discardUsedWeapon(next, next.pendingAction.card);
        next.pendingAction = null;
        next = advanceToDraw(next);
      } else {
        next = chooseKillerBunniesTarget(next, playerIndex, target.playerIndex, target.bunny.id, random);
      }
    } else if (next.phase === "chooseCarrot") {
      const carrot = next.carrotMarket[Math.floor(random() * next.carrotMarket.length)];
      next = chooseKillerBunniesCarrot(next, playerIndex, carrot.id);
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
  return player.bank.reduce((total, card) => total + card.value, 0);
}

export function getKaballasMarket(game) {
  return game?.kaballasMarket || KABALLAS_MARKET_STARTER;
}

export function getKillerBunniesCardPlayStatus(player, card) {
  if (!card) return { enabled: false, reason: "No card is programmed." };
  const requiresBunny = card.aggressive === true || ["weapon", "feed", "chooseCarrot"].includes(card.kind);
  if (requiresBunny && !player?.bunnies?.length) {
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
    cabbageShortfall: Math.max(0, cabbageDue - (player?.cabbage?.length || 0)),
    waterShortfall: Math.max(0, waterDue - (player?.water?.length || 0)),
    canFeedAll: (player?.cabbage?.length || 0) >= cabbageDue && (player?.water?.length || 0) >= waterDue,
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
    pushLog(game, `${card.name} joined ${player.name}'s Bunny Circle.`);
    return finishCardEffect(game, options);
  }
  if (card.kind === "weapon" || card.kind === "feed") {
    if (!findBotTarget(game, playerIndex)) {
      discardUsedWeapon(game, card);
      pushLog(game, `No opposing bunny could be targeted by ${card.name}.`);
      return finishCardEffect(game, options);
    }
    game.phase = "target";
    game.pendingAction = { playerIndex, effect: card.kind, card, ...effectReturnState(options) };
    game.message = `Choose an opponent's bunny for ${card.name}.`;
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
  game.discardPile.push(card);
  return finishCardEffect(game, options);
}

function isSavableSpecial(card) {
  return card?.type === "SPECIAL" || card?.type === "VERY SPECIAL";
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

function resumePlay(game, playerIndex) {
  game.currentPlayerIndex = Number.isInteger(playerIndex) ? playerIndex : game.currentPlayerIndex;
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
  const eligible = game.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.bunnies.length > 0);
  for (const { player } of game.players.map((player, index) => ({ player, index }))) {
    if (player.bunnies.length || !player.carrots.length || !eligible.length) continue;
    const recipient = [...eligible].sort((a, b) => bankTotal(b.player) - bankTotal(a.player))[0].player;
    recipient.carrots.push(...player.carrots.splice(0));
  }
  game.winnerIndexes = game.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.bunnies.length && player.carrots.some((carrot) => carrot.carrotKey === magic.carrotKey))
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
  let remaining = cost;
  player.bank.sort((a, b) => a.value - b.value);
  while (remaining > 0) {
    const card = player.bank.shift();
    remaining -= card.value;
    discardPile.push(card);
  }
}

function dealPlayableCard(game, player) {
  const card = drawMain(game);
  if (!card) return;
  if (card.kind === "money") player.bank.push(card);
  else player.hand.push(card);
}

function drawMain(game) {
  if (!game.mainDeck.length && (game.discardPile.length || game.rooneysEmporium?.weaponDiscard.length || game.weilsPawnShop?.bunnyDiscard.length)) {
    if (game.rooneysEmporium?.weaponDiscard.length) game.discardPile.push(...game.rooneysEmporium.weaponDiscard.splice(0));
    if (game.weilsPawnShop?.bunnyDiscard.length) game.discardPile.push(...game.weilsPawnShop.bunnyDiscard.splice(0));
    const recyclable = game.discardPile.filter((card) => ["bunny", "weapon", "feed", "chooseCarrot", "defense", "special", "verySpecial", "money", "action", "market", "shopMarket"].includes(card.kind));
    game.discardPile = game.discardPile.filter((card) => !recyclable.includes(card));
    game.mainDeck = shuffle(recyclable, Math.random);
  }
  return game.mainDeck.pop() || null;
}

function createSupply(kind, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index + 1}`, kind, type: "SUPPLY", name: capitalize(kind),
    detail: `Spend this to keep a targeted bunny fed.`,
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
  if (game.weilsPawnShop) game.weilsPawnShop.bunnyDiscard.push(bunny);
  else game.discardPile.push(bunny);
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
function shuffle(values, random) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}
function removeFirst(values, predicate) {
  const index = values.findIndex(predicate);
  if (index < 0) return null;
  return values.splice(index, 1)[0];
}
function moveCards(source, destination, count) { destination.push(...source.splice(-count)); }
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
function chooseBotRunCard(player) {
  return player.hand.find((card) => card.kind === "bunny" && !player.bunnies.length)
    || player.hand.find((card) => card.kind === "chooseCarrot")
    || player.hand[0];
}
