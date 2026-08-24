import {
  createKillerBunniesExpansionContent,
  getKillerBunniesExpansionSummary,
  normalizeKillerBunniesExpansionIds,
} from "./killer-bunnies-expansions.js";
import { shuffled } from "./shuffle.js";
import { createKillerBunniesCatalogDeckContent } from "./killer-bunnies-card-adapter.js";
import { getKillerBunniesExtraRunStatus } from "./killer-bunnies-triplets.js";
import { getKillerBunniesCloverCards, getKillerBunniesCloverReduction } from "./killer-bunnies-modifiers.js";
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
export { getKillerBunniesCloverCards } from "./killer-bunnies-modifiers.js";
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
      defenseCredit: 0,
      pawns: [],
      feedingObligations: [],
      resourceCredits: { cabbage: 0, water: 0 },
      shields: 0,
      turnsStarted: 0,
      hasCompletedKillerBunniesGame: Boolean(seed.hasCompletedKillerBunniesGame),
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
    barriers: [],
    futureBunnies: [],
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
    next.players[startingPlayerIndex].turnsStarted = (next.players[startingPlayerIndex].turnsStarted || 0) + 1;
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
    if (Number(nextPending.card.number) === 147 && !next.players[playerIndex].bunnies.some(isLivingBunny)) {
      throw new Error("The Minilith may only be saved while you have a bunny in the Bunny Circle.");
    }
    next.players[playerIndex].savedSpecials ||= [];
    next.players[playerIndex].savedSpecials.push(nextPending.card);
    pushLog(next, `${next.players[playerIndex].name} saved ${nextPending.card.name}.`);
    return advanceToDraw(next);
  }
  if (choice !== "use") throw new Error("Choose whether to use or save the card.");
  return resolveRunCard(next, playerIndex, nextPending.card, random);
}

export function playSavedKillerBunniesSpecial(game, playerIndex, cardId, random = Math.random) {
  const saved = game.players[playerIndex]?.savedSpecials || [];
  const cardIndex = saved.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) throw new Error("That saved card is not available.");
  const card = saved[cardIndex];
  const status = getKillerBunniesSavedSpecialStatus(game, playerIndex, card);
  if (!status.enabled) throw new Error(status.reason);
  const interruptNumbers = [80, 145, 148, 152, 203, 204];
  if (!interruptNumbers.includes(Number(card.number)) && card.type !== "VERY SPECIAL" && game.currentPlayerIndex !== playerIndex) {
    throw new Error("SPECIAL cards may only be played during your own turn.");
  }

  const next = clone(game);
  const [playedCard] = next.players[playerIndex].savedSpecials.splice(cardIndex, 1);
  const resumePlayerIndex = next.currentPlayerIndex;
  pushLog(next, `${next.players[playerIndex].name} played saved ${playedCard.name}.`);
  if (Number(playedCard.number) === 80) return cancelWithMagicSpatula(next, playerIndex, playedCard);
  if ([145, 148].includes(Number(playedCard.number))) return counterYellowThreat(next, playerIndex, playedCard);
  if (Number(playedCard.number) === 152) return beginReversalOfFortune(next, playerIndex, playedCard);
  if (Number(playedCard.number) === 203) return sendThreatenedBunnyToFuture(next, playerIndex, playedCard);
  if (Number(playedCard.number) === 204) return cancelTerribleMisfortune(next, playerIndex, playedCard);
  return resolveRunCard(next, playerIndex, playedCard, random, { returnPhase: "play", resumePlayerIndex });
}

export function getKillerBunniesSavedSpecialStatus(game, playerIndex, card) {
  if (!game || !card) return { enabled: false, reason: "That saved card is unavailable." };
  if (Number(card.number) === 80) {
    return canMagicSpatulaCancel(game)
      ? { enabled: true, reason: "Interrupt the current threat with The Magic Spatula." }
      : { enabled: false, reason: "The Magic Spatula needs an active Weapon, abduction, Roaming Red Run, Defector Detector, or other listed threat." };
  }
  if ([145, 148].includes(Number(card.number))) {
    return canYellowCounterThreat(game, playerIndex, Number(card.number))
      ? { enabled: true, reason: `Counter ${game.pendingAction.card.name}.` }
      : { enabled: false, reason: `${card.name} must counter its listed threat against you.` };
  }
  if (Number(card.number) === 152) {
    return canRedirectWeapon(game)
      ? { enabled: true, reason: "Redirect the launched Weapon to another bunny." }
      : { enabled: false, reason: "Reversal Of Fortune needs a launched Weapon awaiting resolution." };
  }
  if (Number(card.number) === 203) {
    return canFutureBunny(game)
      ? { enabled: true, reason: "Move the currently threatened bunny three owner-turns into the future." }
      : { enabled: false, reason: "Bunny To The Future needs a bunny currently threatened by a Weapon." };
  }
  if (Number(card.number) === 204) {
    return game.phase === "immediateTarget" && game.pendingAction?.effect === "terribleMisfortune"
      ? { enabled: true, reason: `Cancel ${game.pendingAction.card.name}.` }
      : { enabled: false, reason: "Guardian Angle needs a Terrible Misfortune awaiting resolution." };
  }
  if (game.phase !== "play") return { enabled: false, reason: "Saved cards may be played while a player is choosing their TOP RUN action." };
  if (card.type !== "VERY SPECIAL" && game.currentPlayerIndex !== playerIndex) {
    return { enabled: false, reason: "SPECIAL cards may only be played during your own turn." };
  }
  return { enabled: true, reason: `Play ${card.name}.` };
}

export function resolveKillerBunniesWeaponReuse(game, playerIndex, choice) {
  const pending = requirePendingController(game, playerIndex, "weaponReuseChoice");
  const next = clone(game);
  const nextPending = next.pendingAction;
  if (choice === "discard") {
    discardUsedWeapon(next, nextPending.card);
    next.pendingAction = null;
    pushLog(next, `${next.players[playerIndex].name} kept Rooney's Reusables and discarded ${nextPending.card.name}.`);
    return continueAfterWeapon(next, nextPending);
  }
  if (choice !== "reuse") throw new Error("Choose whether to reuse or discard the Weapon.");
  const reusableIndex = next.players[playerIndex].savedSpecials.findIndex((card) => Number(card.number) === 81);
  if (reusableIndex < 0) throw new Error("Rooney's Reusables is no longer available.");
  const [reusables] = next.players[playerIndex].savedSpecials.splice(reusableIndex, 1);
  next.discardPile.push(reusables);
  next.currentPlayerIndex = playerIndex;
  const isRoamingWeapon = Number(nextPending.card.number) === 47;
  next.phase = isRoamingWeapon ? "roamingTarget" : "target";
  next.pendingAction = {
    playerIndex,
    attackingPlayerIndex: playerIndex,
    effect: isRoamingWeapon ? "roamingTarget" : "weapon",
    card: nextPending.card,
    reusedWithRooney: true,
    returnPhase: nextPending.returnPhase,
    resumePlayerIndex: nextPending.resumePlayerIndex,
    rooneyContinuation: nextPending.rooneyContinuation,
  };
  next.message = `Choose an opponent's bunny for the second use of ${nextPending.card.name}.`;
  pushLog(next, `${next.players[playerIndex].name} used Rooney's Reusables to launch ${nextPending.card.name} a second time.`);
  return next;
}

export function resolveKillerBunniesCardAction(game, playerIndex, action = {}, random = Math.random) {
  if (game.phase === "timidRerollChoice") return resolveTimidRerollChoice(game, playerIndex, action.choice, random);
  const result = resolveKillerBunniesCardActionCore(game, playerIndex, action, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "cardAction", action });
}

function offerTimidReroll(original, result, playerIndex, descriptor) {
  const timid = original.players[playerIndex]?.bunnies?.find((bunny) => Number(bunny.number) === 170);
  if (!timid || result.phase === "gameOver") return result;
  const before = JSON.stringify(original.lastRoll ?? null);
  const after = JSON.stringify(result.lastRoll ?? null);
  if (before === after) return result;
  const offered = clone(result);
  offered.phase = "timidRerollChoice";
  offered.pendingAction = {
    playerIndex,
    effect: "timidReroll",
    timidBunnyId: timid.id,
    originalState: clone(original),
    acceptedState: clone(result),
    descriptor: clone(descriptor),
  };
  offered.message = `${offered.players[playerIndex].name}: keep this roll, or use Timid Bunny to reroll it once. The second result must stand.`;
  return offered;
}

function resolveTimidRerollChoice(game, playerIndex, choice, random) {
  const pending = requirePendingController(game, playerIndex, "timidRerollChoice");
  if (choice === "keep") return clone(pending.acceptedState);
  if (choice !== "reroll") throw new Error("Choose whether to keep the roll or reroll it with Timid Bunny.");
  const original = clone(pending.originalState);
  const descriptor = pending.descriptor || {};
  let result;
  if (descriptor.kind === "cardAction") {
    result = resolveKillerBunniesCardActionCore(original, playerIndex, descriptor.action || {}, random);
  } else if (descriptor.kind === "cardDice") result = resolveKillerBunniesCardDiceRollCore(original, playerIndex, descriptor.choiceId, random);
  else if (descriptor.kind === "areaWeapon") result = resolveKillerBunniesAreaWeaponRollCore(original, playerIndex, random);
  else if (descriptor.kind === "blueSpecial") result = resolveKillerBunniesBlueSpecialRollCore(original, playerIndex, random);
  else if (descriptor.kind === "roaming") result = resolveKillerBunniesRoamingRollCore(original, playerIndex, random);
  else if (descriptor.kind === "blueCard") result = resolveKillerBunniesBlueCardRollCore(original, playerIndex, random);
  else if (descriptor.kind === "blackCat") result = resolveKillerBunniesBlackCatRollCore(original, playerIndex, random);
  else if (descriptor.kind === "povertyPoker") result = resolveKillerBunniesPovertyPokerRollCore(original, playerIndex, descriptor.choice, random);
  else if (descriptor.kind === "defector") result = resolveKillerBunniesDefectorRollCore(original, playerIndex, descriptor.choice, random);
  else if (descriptor.kind === "defense") result = resolveKillerBunniesDefenseCore(original, playerIndex, descriptor.choice, random);
  else throw new Error("That roll cannot be replayed by Timid Bunny.");
  pushLog(result, `${result.players[playerIndex].name} used Timid Bunny and accepted the replacement roll.`);
  return result;
}

function resolveKillerBunniesCardActionCore(game, playerIndex, action = {}, random = Math.random) {
  if (game.pendingAction?.playerIndex !== playerIndex) throw new Error("That card action is not available right now.");
  const next = clone(game);
  const pending = next.pendingAction;
  switch (next.phase) {
    case "rockBottomChoice": return resolveRockBottom(next, pending, action);
    case "russianRouletteChoose": return chooseRussianRouletteBunny(next, pending, action.bunnyId);
    case "russianRouletteRoll": return rollRussianRoulette(next, pending, random);
    case "russianRouletteReroll": return rerollRussianRoulette(next, pending, action.choice, random);
    case "freshnessTarget": return chooseFreshnessTarget(next, pending, Number(action.targetPlayerIndex));
    case "freshnessChoice": return resolveFreshnessChoice(next, pending, action.carrotIds || []);
    case "weaponExchange": return resolveWeaponsExchange(next, pending, action);
    case "feedAllTarget": return resolveFeedAllTarget(next, pending, Number(action.targetPlayerIndex));
    case "minilithActivate": return resolveActivateMinilith(next, pending, action, random);
    case "minilithPenalty": return resolveMinilithPenalty(next, pending, action);
    case "barrierPlace": return resolveBarrierPlacement(next, pending, Number(action.leftPlayerIndex));
    case "barrierRemove": return resolveBarrierRemoval(next, pending, action.barrierId);
    case "carrotExchange": return resolveCarrotExchange(next, pending, action);
    case "clumsyCongenialTarget": return resolveClumsyCongenial(next, pending, action.bunnyId);
    case "redLightDistrict": return resolveRedLightDistrict(next, pending, action);
    case "hempRoll": return resolveHempRoll(next, pending, random);
    case "rainboRoll": return resolveRainbo(next, pending, pending.targetPlayerIndex, random);
    case "rooneysCoupon": return activateRooneysCoupon(next, pending);
    case "resourceAttackResponse": return resolveResourceAttackResponse(next, pending, action.choice);
    case "reversalTarget": return resolveReversalTarget(next, pending, action, random);
    case "showBunnyTarget": return resolveShowBunnyTarget(next, pending, action);
    case "showBunnyExchange": return resolveShowBunnyExchange(next, pending, action);
    case "dudePlayerChoice": return beginDudeChallenge(next, pending, action, random);
    case "dudeGuess": return resolveDudeGuess(next, pending, action, random);
    case "dudePenalty": return resolveDudePenalty(next, pending, action.carrotId, random);
    case "mysteryUrnRoll": return rollMysteryUrn(next, pending, random);
    case "mysteryUrnDonate": return donateMysteryUrn(next, pending, action);
    case "mysteryUrnFinal": return rollMysteryUrnFinal(next, pending, random);
    case "bountyTarget": return chooseBountyTarget(next, pending, action.bunnyId);
    case "bountyAmount": return placeBounty(next, pending, Number(action.amount));
    case "zepTepiChoice": return resolveZepTepi(next, pending, action.specialIds || []);
    case "sinisterBounceTarget": return resolveSinisterBounceTarget(next, pending, action.bunnyId);
    default: throw new Error("That card action is not automated yet.");
  }
}

export function donateKillerBunniesBounty(game, playerIndex, bunnyId, amount) {
  if (game.phase !== "play") throw new Error("Donate to a bounty while a player is choosing their TOP RUN action.");
  const donation = Number(amount);
  if (!Number.isInteger(donation) || donation < 1) throw new Error("Donate at least 1 Dolla.");
  const next = clone(game);
  const target = findKillerBunnyInCircle(next, bunnyId);
  if (!target?.bunny.bounty) throw new Error("That bunny does not have a bounty.");
  spendBank(next.players[playerIndex], donation, next.discardPile);
  target.bunny.bounty.amount += donation;
  pushLog(next, `${next.players[playerIndex].name} added ${donation} Dolla to the bounty on ${target.bunny.name}.`);
  return next;
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

export function resolveKillerBunniesCardDiceRoll(game, playerIndex, choiceId, random = Math.random) {
  const result = resolveKillerBunniesCardDiceRollCore(game, playerIndex, choiceId, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "cardDice", choiceId });
}

function resolveKillerBunniesCardDiceRollCore(game, playerIndex, choiceId, random = Math.random) {
  if (!["cardDiceRoll", "manualResolve"].includes(game.phase) || game.pendingAction?.playerIndex !== playerIndex) {
    throw new Error("That dice roll is not available right now.");
  }
  const next = clone(game);
  const pending = next.pendingAction;
  const choice = pending.diceChoices?.find((entry) => entry.id === choiceId);
  if (!choice?.dice?.length) throw new Error("Choose one of the dice shown for this card.");

  const results = choice.dice.map((die) => ({
    sides: die.sides,
    color: die.color || null,
    value: rollDie(die.sides, random),
  }));
  pending.diceRolls ||= [];
  pending.diceRolls.push({ choiceId: choice.id, label: choice.label, results });
  const uniformSides = results.every((result) => result.sides === results[0].sides) ? results[0].sides : "mixed";
  next.lastRoll = {
    value: results.length === 1 ? results[0].value : results.map((result) => `${result.color ? `${capitalize(result.color)} ` : ""}d${result.sides}: ${result.value}`).join(" · "),
    sides: uniformSides,
    ...(results.length === 1 && results[0].color ? { color: results[0].color } : {}),
    label: pending.card.name,
  };
  pushLog(next, `${next.players[playerIndex].name} rolled ${formatDiceResults(results)} for ${pending.card.name}.`);

  if (Number(pending.card.number) === 136) return resolveCarrotThiefRoll(next, pending, results[0]);

  next.phase = "manualResolve";
  next.message = `${pending.card.name}: ${formatDiceResults(results)}. Apply the printed result, roll again if required, then mark the card resolved.`;
  return next;
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

export function chooseKillerBunniesEveryoneFeedBunny(game, playerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "everyoneFeedTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const player = next.players[playerIndex];
  const bunny = player?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose one of your own living bunnies to feed.");

  player.feedingObligations ||= [];
  player.feedingObligations.push({
    id: `everyone-feeding-${pending.card.id}-${playerIndex}-${bunnyId}`,
    bunnyId,
    card: pending.card,
    attackingPlayerIndex: pending.attackingPlayerIndex,
    cabbageCost: pending.card.cabbageCost || 0,
    waterCost: pending.card.waterCost || 0,
    assignedTurnNumber: next.turnNumber,
    discardCardOnSettle: false,
  });
  pushLog(next, `${player.name} chose ${bunny.name} for ${pending.card.name}.`);

  pending.opponentQueue = pending.opponentQueue.filter((index) => index !== playerIndex);
  if (pending.opponentQueue.length) {
    pending.playerIndex = pending.opponentQueue[0];
    next.message = `${next.players[pending.playerIndex].name}: choose one bunny to feed ${pending.card.cabbageCost || 0} Cabbage and ${pending.card.waterCost || 0} Water by the end of your next turn.`;
    return next;
  }

  next.discardPile.push(pending.card);
  next.pendingAction = null;
  const continued = finishPendingEffect(next, pending);
  continued.message = `Every opponent chose a bunny for ${pending.card.name}.${continued.phase === "draw" ? ` ${next.players[pending.attackingPlayerIndex].name}, click the main draw pile.` : ""}`;
  return continued;
}

export function chooseKillerBunniesTarget(game, playerIndex, targetPlayerIndex, bunnyId, random = Math.random) {
  requirePendingController(game, playerIndex, "target");
  const next = clone(game);
  const pending = next.pendingAction;
  if (!pending || pending.playerIndex !== playerIndex) throw new Error("There is no target to choose.");
  const target = next.players[targetPlayerIndex];
  const bunnyIndex = target?.bunnies.findIndex((bunny) => bunny.id === bunnyId) ?? -1;
  if ((!pending.allowOwnTarget && !pending.allowAnyTarget && targetPlayerIndex === playerIndex) || bunnyIndex < 0) {
    throw new Error(pending.allowOwnTarget ? "Choose one of your own living bunnies." : "Choose an opponent's living bunny.");
  }
  const bunny = target.bunnies[bunnyIndex];
  if (isIntangibleHologram(bunny) && !isHolographicVulnerableTo(pending.card)) {
    throw new Error(`${bunny.name} is holographic and is not affected by ${pending.card.name}.`);
  }

  if (pending.effect === "weapon" && (isAreaWeapon(pending.card) || hasActiveMinilith(next, playerIndex, pending.card))) {
    if (pending.allowOwnTarget) next.players[playerIndex].badKarma = false;
    return beginAreaWeapon(next, pending, playerIndex, bunnyId);
  }

  if (hasHeavenlyHalo(bunny)) {
    pushLog(next, `${bunny.name}'s Heavenly Halo blocked ${pending.card.name}.`);
    if (pending.card.kind === "weapon") return finishUsedWeapon(next, pending, `${bunny.name}'s Heavenly Halo blocked ${pending.card.name}.`);
    next.discardPile.push(pending.card);
    next.pendingAction = null;
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
    attackingPlayerIndex: pending.attackingPlayerIndex ?? playerIndex,
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

export function chooseKillerBunniesAuctionTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "auctionTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose a bunny in the Bunny Circle to auction.");

  next.phase = "auctionBid";
  next.pendingAction = {
    ...pending,
    effect: "bunnyBlockBid",
    cardPlayerIndex: playerIndex,
    targetPlayerIndex,
    bunnyId,
    bunnyName: bunny.name,
    playerIndex,
    currentBid: 0,
    highestBidderIndex: null,
    activeBidderIndexes: next.players.map((_, index) => index),
    passedBidderIndexes: [],
    bidHistory: [],
  };
  next.message = `${next.players[playerIndex].name} bids first for ${bunny.name}. Raise the current bid or pass.`;
  pushLog(next, `${next.players[playerIndex].name} put ${target.name}'s ${bunny.name} up for auction.`);
  return next;
}

export function placeKillerBunniesAuctionBid(game, playerIndex, amount) {
  requirePendingController(game, playerIndex, "auctionBid");
  const next = clone(game);
  const pending = next.pendingAction;
  const bidder = next.players[playerIndex];

  if (amount === null || amount === undefined || amount === "pass") {
    pending.activeBidderIndexes = pending.activeBidderIndexes.filter((index) => index !== playerIndex);
    pending.passedBidderIndexes.push(playerIndex);
    pending.bidHistory.push({ playerIndex, action: "pass" });
    pushLog(next, `${bidder.name} passed in the auction for ${pending.bunnyName}.`);
  } else {
    const bid = Number(amount);
    if (!Number.isInteger(bid) || bid <= pending.currentBid) {
      throw new Error(`Bid at least ${pending.currentBid + 1} Dolla, or pass.`);
    }
    if (bid > bankTotal(bidder)) throw new Error(`${bidder.name} only has ${bankTotal(bidder)} Dolla.`);
    pending.currentBid = bid;
    pending.highestBidderIndex = playerIndex;
    pending.bidHistory.push({ playerIndex, action: "bid", amount: bid });
    pushLog(next, `${bidder.name} bid ${bid} Dolla for ${pending.bunnyName}.`);
  }

  if (!pending.activeBidderIndexes.length) return finishBunnyBlockBid(next);
  if (pending.highestBidderIndex !== null
    && pending.activeBidderIndexes.length === 1
    && pending.activeBidderIndexes[0] === pending.highestBidderIndex) {
    return finishBunnyBlockBid(next);
  }

  const nextBidderIndex = findNextAuctionBidder(next, playerIndex);
  if (nextBidderIndex === null) return finishBunnyBlockBid(next);
  pending.playerIndex = nextBidderIndex;
  next.message = `${next.players[nextBidderIndex].name}: bid at least ${pending.currentBid + 1} Dolla for ${pending.bunnyName}, or pass.`;
  return next;
}

export function chooseKillerBunniesBunnyExchangeGive(game, playerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "bunnyExchangeGive");
  const next = clone(game);
  const bunny = next.players[playerIndex].bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose one of your own bunnies to give in the exchange.");
  if (!next.players.some((player, index) => index !== playerIndex && player.bunnies.length)) {
    throw new Error("No opponent has a bunny available for the exchange.");
  }

  next.phase = "bunnyExchangeTake";
  next.pendingAction = {
    ...next.pendingAction,
    effect: "bunnyExchange",
    giveBunnyId: bunnyId,
    giveBunnyName: bunny.name,
  };
  next.message = `Choose an opponent and ${next.players.some((player, index) => index !== playerIndex && player.bunnies.length >= 2) ? "one or two" : "one"} of their bunnies for ${bunny.name}.`;
  return next;
}

export function resolveKillerBunniesBunnyExchange(game, playerIndex, targetPlayerIndex, receivedBunnyIds) {
  requirePendingController(game, playerIndex, "bunnyExchangeTake");
  const next = clone(game);
  const pending = next.pendingAction;
  const giver = next.players[playerIndex];
  const target = next.players[targetPlayerIndex];
  if (!target || targetPlayerIndex === playerIndex) throw new Error("Choose one opponent for Bunny Exchange.");
  const giveIndex = giver.bunnies.findIndex((bunny) => bunny.id === pending.giveBunnyId);
  if (giveIndex < 0) throw new Error("The bunny you offered is no longer available.");

  const requiredCount = Math.min(2, target.bunnies.length);
  const uniqueIds = [...new Set(receivedBunnyIds || [])];
  if (!requiredCount) throw new Error("That opponent has no bunnies to exchange.");
  if (uniqueIds.length !== requiredCount) {
    throw new Error(`Choose exactly ${requiredCount} ${requiredCount === 1 ? "bunny" : "bunnies"} from ${target.name}.`);
  }
  const received = uniqueIds.map((bunnyId) => target.bunnies.find((bunny) => bunny.id === bunnyId));
  if (received.some((bunny) => !bunny)) throw new Error(`Every selected bunny must belong to ${target.name}.`);

  const [given] = giver.bunnies.splice(giveIndex, 1);
  target.bunnies = target.bunnies.filter((bunny) => !uniqueIds.includes(bunny.id));
  giver.bunnies.push(...received);
  target.bunnies.push(given);
  swapBunnyObligations(giver, target, [given.id], uniqueIds);
  ensureKillerBunniesCircle(next);
  next.discardPile.push(pending.card);
  next.pendingAction = null;
  pushLog(next, requiredCount === 1
    ? `${giver.name} exchanged ${given.name} with ${target.name} for ${received[0].name}.`
    : `${giver.name} gave ${given.name} to ${target.name} and received ${received.map((bunny) => bunny.name).join(" and ")}.`);
  const continued = finishPendingEffect(next, pending);
  continued.message = requiredCount === 1
    ? `${giver.name} exchanged one bunny for one bunny with ${target.name}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`
    : `${giver.name} exchanged one bunny for two bunnies from ${target.name}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

export function resolveKillerBunniesAreaWeaponRoll(game, playerIndex, random = Math.random) {
  const result = resolveKillerBunniesAreaWeaponRollCore(game, playerIndex, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "areaWeapon" });
}

function resolveKillerBunniesAreaWeaponRollCore(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "areaWeaponRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const current = pending.affected.find((entry) => (entry.attackId || entry.bunnyId) === pending.rollQueue[0]);
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
    discardBunny(next, circleEntry.bunny, pending.attackingPlayerIndex);
    current.eliminated = true;
    pushLog(next, `${circleEntry.player.name} rolled ${value}; ${pending.card.name} eliminated ${circleEntry.bunny.name}.`);
  } else {
    pushLog(next, `${circleEntry.player.name} rolled ${value}; ${circleEntry.bunny.name} survived level ${effectivePower}.`);
  }
  return continueAreaWeapon(next);
}

export function chooseKillerBunniesPlayerTarget(game, playerIndex, targetPlayerIndex, random = Math.random) {
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
    const counterNumber = number === 56 ? 148 : 145;
    if (target.savedSpecials.some((card) => Number(card.number) === counterNumber)) {
      next.phase = "resourceAttackResponse";
      next.pendingAction = {
        ...pending,
        playerIndex: targetPlayerIndex,
        cardPlayerIndex: playerIndex,
        targetPlayerIndex,
        resource: number === 56 ? "water" : "cabbage",
      };
      next.message = `${target.name}: use ${number === 56 ? "Noah’s Flood" : "Bug Off"}, or accept ${pending.card.name}.`;
      return next;
    }
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
  } else if (number === 184) {
    for (const money of target.bank.splice(0)) next.discardPile.push(money);
    target.dollaCredit = 0;
    pushLog(next, `${target.name} lost all saved Dolla to Bankruptcy.`);
  } else if (number === 194) {
    next.phase = "rainboRoll";
    next.pendingAction = { ...pending, playerIndex: targetPlayerIndex, targetPlayerIndex, cardPlayerIndex: playerIndex };
    next.message = `${target.name}: roll the eight colored d12s for Rainbo.`;
    return next;
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
  if ([49, 50, 134].includes(number)) {
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

function resolveRockBottom(game, pending, action) {
  const receiver = game.players[pending.playerIndex];
  const results = [];
  for (const resource of pending.eligibleResources) {
    const richest = game.players.map((player, index) => ({ index, units: index === pending.playerIndex ? -1 : supplyUnitTotal(player, resource) }));
    const maximum = Math.max(...richest.map((entry) => entry.units));
    if (maximum <= 0) continue;
    const candidates = richest.filter((entry) => entry.units === maximum).map((entry) => entry.index);
    const chosenIndex = Number(action[`${resource}PlayerIndex`] ?? candidates[0]);
    if (!candidates.includes(chosenIndex)) throw new Error(`Choose an opponent tied for the most ${resource}.`);
    const amount = Math.floor(maximum / 2);
    if (!amount) continue;
    spendSupplyUnits(game, game.players[chosenIndex], resource, amount);
    receiver.resourceCredits ||= { cabbage: 0, water: 0 };
    receiver.resourceCredits[resource] = (receiver.resourceCredits[resource] || 0) + amount;
    results.push(`${amount} ${resource} from ${game.players[chosenIndex].name}`);
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${receiver.name} used Rock Bottom${results.length ? ` to take ${results.join(" and ")}` : " but found no supplies"}.`);
  return finishPendingEffect(game, pending);
}

function chooseRussianRouletteBunny(game, pending, bunnyId) {
  const playerIndex = pending.playerIndex;
  const bunny = game.players[playerIndex].bunnies.find((entry) => entry.id === bunnyId && !hasHeavenlyHalo(entry));
  if (!bunny) throw new Error("Choose one vulnerable bunny you own.");
  pending.bunnyIds[playerIndex] = bunnyId;
  pending.chooseQueue.shift();
  if (pending.chooseQueue.length) {
    pending.playerIndex = pending.chooseQueue[0];
    game.message = `${game.players[pending.playerIndex].name}: choose a bunny for Russian Roulette.`;
    return game;
  }
  pending.rollQueue = [...pending.contenderIndexes];
  pending.playerIndex = pending.rollQueue[0];
  game.phase = "russianRouletteRoll";
  game.message = `${game.players[pending.playerIndex].name}: roll a d12 for Russian Roulette.`;
  return game;
}

function rollRussianRoulette(game, pending, random) {
  const value = rollD12(random);
  pending.scores[pending.playerIndex] = value;
  game.lastRoll = { value, sides: 12, label: pending.card.name };
  pushLog(game, `${game.players[pending.playerIndex].name} rolled ${value} for Russian Roulette.`);
  pending.rollQueue.shift();
  if (pending.rollQueue.length) {
    pending.playerIndex = pending.rollQueue[0];
    game.message = `${game.players[pending.playerIndex].name}: roll a d12 for Russian Roulette.`;
    return game;
  }
  if (pending.roundNumber === 1 && !pending.optionalRerollResolved) {
    pending.playerIndex = pending.cardPlayerIndex;
    game.phase = "russianRouletteReroll";
    game.message = `${game.players[pending.playerIndex].name}: keep ${pending.scores[pending.playerIndex]}, or replace it with your optional reroll.`;
    return game;
  }
  return completeRussianRoulette(game, pending);
}

function rerollRussianRoulette(game, pending, choice, random) {
  if (choice === "reroll") {
    const value = rollD12(random);
    pending.scores[pending.cardPlayerIndex] = value;
    game.lastRoll = { value, sides: 12, label: `${pending.card.name} reroll` };
  } else if (choice !== "keep") throw new Error("Keep the roll or reroll once.");
  pending.optionalRerollResolved = true;
  return completeRussianRoulette(game, pending);
}

function completeRussianRoulette(game, pending) {
  const lowest = Math.min(...pending.contenderIndexes.map((index) => pending.scores[index]));
  const losers = pending.contenderIndexes.filter((index) => pending.scores[index] === lowest);
  if (losers.length > 1) {
    pending.roundNumber += 1;
    pending.contenderIndexes = losers;
    pending.rollQueue = [...losers];
    for (const index of losers) pending.scores[index] = null;
    pending.playerIndex = losers[0];
    game.phase = "russianRouletteRoll";
    game.message = `${game.players[losers[0]].name}: tied low rollers roll again.`;
    return game;
  }
  const loserIndex = losers[0];
  const bunnyId = pending.bunnyIds[loserIndex];
  const bunnyIndex = game.players[loserIndex].bunnies.findIndex((bunny) => bunny.id === bunnyId);
  if (bunnyIndex >= 0) discardBunny(game, game.players[loserIndex].bunnies.splice(bunnyIndex, 1)[0]);
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${game.players[loserIndex].name} lost ${pending.bunnyIds[loserIndex]} to Russian Roulette.`);
  return finishPendingEffect(game, pending);
}

function chooseFreshnessTarget(game, pending, targetPlayerIndex) {
  if (targetPlayerIndex === pending.playerIndex || !game.players[targetPlayerIndex]?.carrots.length) throw new Error("Choose an opponent with at least one Carrot.");
  pending.targetPlayerIndex = targetPlayerIndex;
  pending.playerIndex = targetPlayerIndex;
  game.phase = "freshnessChoice";
  game.message = `${game.players[targetPlayerIndex].name}: choose which Carrots to keep for 2 Dolla each.`;
  return game;
}

function resolveFreshnessChoice(game, pending, carrotIds) {
  const target = game.players[pending.targetPlayerIndex];
  const uniqueIds = [...new Set(carrotIds)];
  if (uniqueIds.some((id) => !target.carrots.some((carrot) => carrot.id === id))) throw new Error("Choose only your own Carrots.");
  const cost = uniqueIds.length * 2;
  if (cost > bankTotal(target)) throw new Error(`You need ${cost} Dolla to keep those Carrots.`);
  spendBank(target, cost, game.discardPile);
  const returned = target.carrots.filter((carrot) => !uniqueIds.includes(carrot.id));
  target.carrots = target.carrots.filter((carrot) => uniqueIds.includes(carrot.id));
  game.carrotMarket.push(...returned);
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${target.name} paid ${cost} Dolla and returned ${returned.length} Carrot${returned.length === 1 ? "" : "s"}.`);
  return finishPendingEffect(game, pending);
}

function resolveWeaponsExchange(game, pending, action) {
  const actor = game.players[pending.playerIndex];
  const ownIndex = actor.hand.findIndex((card) => card.id === action.ownWeaponId && card.kind === "weapon");
  if (ownIndex < 0) throw new Error("Choose one Weapon from your hand to exchange.");
  let targetWeapon;
  let targetZone;
  if (action.source === "rooneys") {
    targetZone = game.rooneysEmporium?.weaponDiscard;
  } else {
    const targetPlayerIndex = Number(action.targetPlayerIndex);
    if (targetPlayerIndex === pending.playerIndex) throw new Error("Choose an opponent.");
    targetZone = game.players[targetPlayerIndex]?.hand;
  }
  const targetIndex = targetZone?.findIndex((card) => card.id === action.targetWeaponId && card.kind === "weapon") ?? -1;
  if (targetIndex < 0) throw new Error("Choose an available Weapon to receive.");
  const [ownWeapon] = actor.hand.splice(ownIndex, 1);
  [targetWeapon] = targetZone.splice(targetIndex, 1);
  actor.hand.push(targetWeapon);
  targetZone.push(ownWeapon);
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${actor.name} exchanged ${ownWeapon.name} for ${targetWeapon.name}.`);
  return finishPendingEffect(game, pending);
}

function resolveFeedAllTarget(game, pending, targetPlayerIndex) {
  if (targetPlayerIndex === pending.playerIndex || !game.players[targetPlayerIndex]?.bunnies.length) throw new Error("Choose an opponent with at least one bunny.");
  const target = game.players[targetPlayerIndex];
  for (const bunny of target.bunnies) {
    target.feedingObligations.push({
      id: `feed-all-${pending.card.id}-${bunny.id}`,
      bunnyId: bunny.id,
      card: pending.card,
      attackingPlayerIndex: pending.playerIndex,
      cabbageCost: pending.card.cabbageCost || 1,
      waterCost: pending.card.waterCost || 1,
      assignedTurnNumber: game.turnNumber,
      discardCardOnSettle: false,
    });
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${target.name}'s ${target.bunnies.length} current bunnies must each feed 1 Cabbage and 1 Water.`);
  return finishPendingEffect(game, pending);
}

function resolveActivateMinilith(game, pending, action, random) {
  const holderIndex = Number(action.targetPlayerIndex);
  const holder = game.players[holderIndex];
  if (!holder || holderIndex === pending.playerIndex) throw new Error("Choose an opponent holding The Minilith.");
  const savedIndex = holder.savedSpecials.findIndex((card) => Number(card.number) === 147);
  const handIndex = holder.hand.findIndex((card) => Number(card.number) === 147);
  if (savedIndex < 0 && handIndex < 0) throw new Error("That opponent does not hold The Minilith.");
  if (action.mode === "steal") {
    const source = savedIndex >= 0 ? holder.savedSpecials : holder.hand;
    const [minilith] = source.splice(savedIndex >= 0 ? savedIndex : handIndex, 1);
    (savedIndex >= 0 ? game.players[pending.playerIndex].savedSpecials : game.players[pending.playerIndex].hand).push(minilith);
    game.discardPile.push(pending.card);
    game.pendingAction = null;
    pushLog(game, `${game.players[pending.playerIndex].name} stole The Minilith from ${holder.name}.`);
    return finishPendingEffect(game, pending);
  }
  if (action.mode !== "roll" || savedIndex < 0) throw new Error("Choose to steal The Minilith, or roll against a saved Minilith.");
  const rolls = Array.from({ length: 7 }, () => rollD12(random));
  const evenCount = rolls.filter((value) => value % 2 === 0).length;
  game.lastRoll = { value: rolls.join(", "), sides: 12, label: pending.card.name };
  if (evenCount === 7) {
    for (const player of game.players) {
      game.carrotMarket.push(...player.carrots.splice(0));
      for (const bunny of player.bunnies.splice(0)) discardBunny(game, bunny);
    }
    game.discardPile.push(pending.card);
    game.pendingAction = null;
    pushLog(game, "Seven even Minilith rolls cleared every bunny and returned every Carrot.");
    return finishPendingEffect(game, pending);
  }
  game.phase = "minilithPenalty";
  pending.playerIndex = holderIndex;
  pending.targetPlayerIndex = holderIndex;
  pending.evenCount = evenCount;
  pending.rolls = rolls;
  game.message = `${holder.name}: surrender ${evenCount} Carrot${evenCount === 1 ? "" : "s"} or bunn${evenCount === 1 ? "y" : "ies"}.`;
  return game;
}

function resolveMinilithPenalty(game, pending, action) {
  const target = game.players[pending.targetPlayerIndex];
  const carrotIds = [...new Set(action.carrotIds || [])];
  const bunnyIds = [...new Set(action.bunnyIds || [])];
  const required = Math.min(pending.evenCount, target.carrots.length + target.bunnies.length);
  if (carrotIds.length + bunnyIds.length !== required) throw new Error(`Choose exactly ${required} Carrots or bunnies to surrender.`);
  if (carrotIds.some((id) => !target.carrots.some((card) => card.id === id)) || bunnyIds.some((id) => !target.bunnies.some((bunny) => bunny.id === id))) {
    throw new Error("Choose only items you own.");
  }
  const returned = target.carrots.filter((card) => carrotIds.includes(card.id));
  target.carrots = target.carrots.filter((card) => !carrotIds.includes(card.id));
  game.carrotMarket.push(...returned);
  for (const bunnyId of bunnyIds) {
    const index = target.bunnies.findIndex((bunny) => bunny.id === bunnyId);
    if (index >= 0) discardBunny(game, target.bunnies.splice(index, 1)[0]);
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function resolveBarrierPlacement(game, pending, leftPlayerIndex) {
  if (!Number.isInteger(leftPlayerIndex) || leftPlayerIndex < 0 || leftPlayerIndex >= game.players.length) throw new Error("Choose a valid player boundary.");
  game.barriers ||= [];
  game.barriers.push({
    id: `barrier-${pending.card.id}`,
    card: pending.card,
    leftPlayerIndex,
    rightPlayerIndex: (leftPlayerIndex + 1) % game.players.length,
  });
  game.pendingAction = null;
  pushLog(game, `${game.players[pending.playerIndex].name} placed a Barrier between ${game.players[leftPlayerIndex].name} and ${game.players[(leftPlayerIndex + 1) % game.players.length].name}.`);
  return finishPendingEffect(game, pending);
}

function resolveBarrierRemoval(game, pending, barrierId) {
  const index = (game.barriers || []).findIndex((barrier) => barrier.id === barrierId);
  if (index < 0) throw new Error("Choose a regular Barrier in play.");
  const [barrier] = game.barriers.splice(index, 1);
  game.discardPile.push(barrier.card, pending.card);
  game.pendingAction = null;
  pushLog(game, `${pending.card.name} eliminated a Barrier.`);
  return finishPendingEffect(game, pending);
}

function resolveCarrotExchange(game, pending, action) {
  const actor = game.players[pending.playerIndex];
  const targetIndex = Number(action.targetPlayerIndex);
  const target = game.players[targetIndex];
  if (!target || targetIndex === pending.playerIndex) throw new Error("Choose an opponent.");
  const own = actor.carrots.find((carrot) => carrot.id === action.ownCarrotId);
  const targetIds = [...new Set(action.targetCarrotIds || [])];
  if (!own || targetIds.length !== 2 || targetIds.some((id) => !target.carrots.some((carrot) => carrot.id === id))) {
    throw new Error("Choose one of your Carrots and exactly two opponent Carrots.");
  }
  const received = target.carrots.filter((carrot) => targetIds.includes(carrot.id));
  actor.carrots = actor.carrots.filter((carrot) => carrot.id !== own.id);
  target.carrots = target.carrots.filter((carrot) => !targetIds.includes(carrot.id));
  actor.carrots.push(...received);
  target.carrots.push(own);
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function resolveClumsyCongenial(game, pending, bunnyId) {
  const target = findKillerBunnyInCircle(game, bunnyId);
  if (!target || !/Congenial Bunny/i.test(target.bunny.name)) throw new Error("Choose a Congenial Bunny.");
  const neighbors = [-1, 1].map((direction) => getNextKillerBunnyInCircle(game, bunnyId, direction)).filter(Boolean);
  for (const neighbor of neighbors) {
    const current = findKillerBunnyInCircle(game, neighbor.bunny.id);
    if (!current || hasHeavenlyHalo(current.bunny)) continue;
    current.player.bunnies.splice(current.bunnyIndex, 1);
    discardBunny(game, current.bunny, pending.playerIndex);
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function resolveRedLightDistrict(game, pending, action) {
  const buyer = game.players[pending.playerIndex];
  const sellerIndex = Number(action.targetPlayerIndex);
  const seller = game.players[sellerIndex];
  if (!seller || sellerIndex === pending.playerIndex) throw new Error("Choose an opponent.");
  if (bankTotal(buyer) < 5) throw new Error("You need 5 Dolla.");
  const zones = [seller.bunnies, seller.pawns || [], seller.zodiacCards || []];
  let item;
  for (const zone of zones) {
    const index = zone.findIndex((entry) => entry.id === action.itemId && (bunnyColors(entry).includes("red") || entry.color === "red" || /Fire/i.test(entry.name || "")));
    if (index >= 0) {
      [item] = zone.splice(index, 1);
      if (zone === seller.bunnies) buyer.bunnies.push(item);
      else if (zone === seller.pawns) (buyer.pawns ||= []).push(item);
      else (buyer.zodiacCards ||= []).push(item);
      break;
    }
  }
  if (!item) throw new Error("Choose an eligible Red item owned by that opponent.");
  spendBank(buyer, 5, game.discardPile);
  seller.dollaCredit = (seller.dollaCredit || 0) + 5;
  ensureKillerBunniesCircle(game);
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${buyer.name} paid ${seller.name} 5 Dolla for ${item.name}.`);
  return finishPendingEffect(game, pending);
}

function resolveHempRoll(game, pending, random) {
  const value = rollD12(random);
  game.lastRoll = { value, sides: 12, color: "yellow", label: pending.card.name };
  const abducted = game.area51Abducted;
  if (value >= 5 && abducted?.bunny) {
    game.discardPile.push(abducted.bunny);
    game.area51Abducted = null;
    if (value >= 9) {
      const owner = game.players[abducted.ownerIndex];
      for (const bunny of owner.bunnies.splice(0)) discardBunny(game, bunny, pending.playerIndex);
    }
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, value >= 9 ? "H.E.M.P. destroyed the aliens, abductee, and the owner’s remaining bunnies."
    : value >= 5 ? "H.E.M.P. destroyed the aliens and abducted bunny."
      : "H.E.M.P. was a dud.");
  return finishPendingEffect(game, pending);
}

function activateRooneysCoupon(game, pending) {
  game.players[pending.playerIndex].rooneysCouponTurnNumber = game.turnNumber;
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  const continued = finishPendingEffect(game, pending);
  continued.message = `Rooney’s Weapons Emporium is half price for ${game.players[pending.playerIndex].name} through the end of this turn.${continued.phase === "draw" ? " You may shop before drawing." : ""}`;
  return continued;
}

function resolveRainbo(game, pending, targetPlayerIndex, random = Math.random) {
  const colors = ["violet", "orange", "green", "yellow", "blue", "black", "red", "pink"];
  const rolls = colors.map((color) => ({ color, value: rollD12(random) }));
  const lowest = Math.min(...rolls.map((roll) => roll.value));
  const lowColors = rolls.filter((roll) => roll.value === lowest).map((roll) => roll.color);
  for (const [playerIndex, player] of game.players.entries()) {
    if (isPlayerIsolatedByBarriers(game, playerIndex)) continue;
    for (let index = player.bunnies.length - 1; index >= 0; index -= 1) {
      const bunny = player.bunnies[index];
      const protectedBunny = hasHeavenlyHalo(bunny) || isIntangibleHologram(bunny);
      if (protectedBunny) continue;
      const dies = lowColors.includes("black") || bunnyColors(bunny).some((color) => lowColors.includes(color));
      if (dies) discardBunny(game, player.bunnies.splice(index, 1)[0], pending.playerIndex);
    }
  }
  game.lastRoll = { value: rolls.map((roll) => `${roll.color} ${roll.value}`).join(" · "), sides: 12, label: pending.card.name };
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${game.players[targetPlayerIndex].name} rolled Rainbo; ${lowColors.join(" and ")} was lowest.`);
  return finishPendingEffect(game, pending);
}

function canYellowCounterThreat(game, playerIndex, counterNumber) {
  const threatNumber = Number(game.pendingAction?.card?.number);
  if (counterNumber === 145) {
    return (threatNumber === 37 && game.phase === "defend" && game.pendingAction?.targetPlayerIndex === playerIndex)
      || (threatNumber === 64 && game.phase === "resourceAttackResponse" && game.pendingAction?.targetPlayerIndex === playerIndex);
  }
  return (threatNumber === 42 && game.phase === "defend" && game.pendingAction?.targetPlayerIndex === playerIndex)
    || (threatNumber === 56 && game.phase === "resourceAttackResponse" && game.pendingAction?.targetPlayerIndex === playerIndex);
}

function counterYellowThreat(game, playerIndex, counter) {
  if (!canYellowCounterThreat(game, playerIndex, Number(counter.number))) throw new Error(`${counter.name} cannot counter the current card.`);
  const pending = game.pendingAction;
  if (pending.card.kind === "weapon") discardUsedWeapon(game, pending.card);
  else game.discardPile.push(pending.card);
  game.discardPile.push(counter);
  game.pendingAction = null;
  pushLog(game, `${game.players[playerIndex].name} used ${counter.name} to cancel ${pending.card.name}.`);
  return finishPendingEffect(game, pending);
}

function resolveResourceAttackResponse(game, pending, choice) {
  if (choice !== "accept") throw new Error("Use the saved counter card, or accept the resource loss.");
  const target = game.players[pending.targetPlayerIndex];
  game[`${pending.resource}Discard`] ||= [];
  game[`${pending.resource}Discard`].push(...target[pending.resource].splice(0));
  target.resourceCredits ||= { cabbage: 0, water: 0 };
  target.resourceCredits[pending.resource] = 0;
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${target.name} lost all ${pending.resource} units to ${pending.card.name}.`);
  return finishPendingEffect(game, pending);
}

function canRedirectWeapon(game) {
  if (!game.pendingAction?.card || game.pendingAction.card.kind !== "weapon") return false;
  if (game.phase === "defend") return true;
  return game.phase === "areaWeaponRoll" && game.pendingAction.affected.every((entry) => entry.roll === undefined);
}

function beginReversalOfFortune(game, playerIndex, reversal) {
  if (!canRedirectWeapon(game)) throw new Error("There is no launched Weapon to redirect.");
  const weaponPending = game.pendingAction;
  const originalBunnyId = weaponPending.bunnyId || weaponPending.targetBunnyId;
  game.discardPile.push(reversal);
  game.phase = "reversalTarget";
  game.pendingAction = {
    playerIndex,
    effect: "reversalTarget",
    card: weaponPending.card,
    weaponPending,
    originalBunnyId,
  };
  game.message = `${game.players[playerIndex].name}: choose any other bunny for ${weaponPending.card.name}.`;
  return game;
}

function resolveReversalTarget(game, pending, action, random) {
  const targetPlayerIndex = Number(action.targetPlayerIndex);
  const bunnyId = action.bunnyId;
  if (bunnyId === pending.originalBunnyId) throw new Error("Choose a different bunny.");
  const target = game.players[targetPlayerIndex]?.bunnies.find((bunny) => bunny.id === bunnyId);
  if (!target) throw new Error("Choose a living bunny in the Bunny Circle.");
  const original = pending.weaponPending;
  game.phase = "target";
  game.pendingAction = {
    playerIndex: pending.playerIndex,
    attackingPlayerIndex: original.attackingPlayerIndex ?? original.playerIndex,
    effect: "weapon",
    card: pending.card,
    allowAnyTarget: true,
    returnPhase: original.returnPhase,
    resumePlayerIndex: original.resumePlayerIndex,
    reusedWithRooney: original.reusedWithRooney,
    rooneyContinuation: original.rooneyContinuation,
  };
  return chooseKillerBunniesTarget(game, pending.playerIndex, targetPlayerIndex, bunnyId, random);
}

function canFutureBunny(game) {
  return game.pendingAction?.card?.kind === "weapon" && ["defend", "areaWeaponRoll"].includes(game.phase);
}

function sendThreatenedBunnyToFuture(game, playerIndex, card) {
  if (!canFutureBunny(game)) throw new Error("No bunny is currently awaiting a Weapon outcome.");
  const pending = game.pendingAction;
  const bunnyId = game.phase === "defend"
    ? pending.bunnyId
    : pending.affected.find((entry) => (entry.attackId || entry.bunnyId) === pending.rollQueue[0])?.bunnyId;
  const target = findKillerBunnyInCircle(game, bunnyId);
  if (!target) throw new Error("The threatened bunny is no longer available.");
  const [bunny] = target.player.bunnies.splice(target.bunnyIndex, 1);
  removeKillerBunnyFromCircle(game, bunny.id);
  game.futureBunnies ||= [];
  game.futureBunnies.push({
    id: `future-${card.id}-${bunny.id}`,
    bunny,
    ownerIndex: target.playerIndex,
    returnAtTurnStarted: (target.player.turnsStarted || 0) + 3,
  });
  game.discardPile.push(card);
  pushLog(game, `${bunny.name} traveled three ${target.player.name} turns into the future.`);
  if (game.phase === "areaWeaponRoll") {
    pending.rollQueue.shift();
    return continueAreaWeapon(game);
  }
  return finishUsedWeapon(game, pending);
}

function cancelTerribleMisfortune(game, playerIndex, card) {
  const pending = game.pendingAction;
  if (game.phase !== "immediateTarget" || pending?.effect !== "terribleMisfortune") throw new Error("No Terrible Misfortune is awaiting resolution.");
  game.discardPile.push(pending.card, card);
  game.pendingAction = null;
  pushLog(game, `${game.players[playerIndex].name} used Guardian Angle to cancel ${pending.card.name}.`);
  return finishImmediateEffect(game, pending);
}

function resolveShowBunnyTarget(game, pending, action) {
  const targetPlayerIndex = Number(action.targetPlayerIndex);
  if (targetPlayerIndex === pending.playerIndex || !game.players[targetPlayerIndex]) throw new Error("Choose an opponent.");
  const revealedBunnies = game.players[targetPlayerIndex].hand.filter((card) => card.kind === "bunny");
  if (!revealedBunnies.length) {
    game.discardPile.push(pending.card);
    game.pendingAction = null;
    return finishPendingEffect(game, pending);
  }
  pending.targetPlayerIndex = targetPlayerIndex;
  pending.revealedBunnyIds = revealedBunnies.map((card) => card.id);
  game.phase = "showBunnyExchange";
  game.message = `Choose one hand card to exchange for a revealed bunny, or pass.`;
  return game;
}

function resolveShowBunnyExchange(game, pending, action) {
  const actor = game.players[pending.playerIndex];
  if (action.choice !== "pass") {
    const ownIndex = actor.hand.findIndex((card) => card.id === action.ownCardId);
    const targetPlayerIndex = game.players.findIndex((player, index) => index !== pending.playerIndex
      && player.hand.some((card) => card.id === action.bunnyCardId && pending.revealedBunnyIds.includes(card.id)));
    const target = game.players[targetPlayerIndex];
    const bunnyIndex = target?.hand.findIndex((card) => card.id === action.bunnyCardId && pending.revealedBunnyIds.includes(card.id)) ?? -1;
    if (ownIndex < 0 || targetPlayerIndex < 0 || bunnyIndex < 0) throw new Error("Choose one of your hand cards and one revealed bunny.");
    const [own] = actor.hand.splice(ownIndex, 1);
    const [bunny] = target.hand.splice(bunnyIndex, 1);
    actor.hand.push(bunny);
    target.hand.push(own);
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function beginDudeChallenge(game, pending, action, random) {
  const rollerIndex = Number(action.targetPlayerIndex);
  const roller = game.players[rollerIndex];
  if (!roller?.carrots.length) throw new Error("Choose a player with at least one Carrot to risk.");
  const sides = Number(action.dieSides) === 20 && game.expansionIds.includes("violet") ? 20 : 12;
  const value = rollDie(sides, random);
  pending.cardPlayerIndex ??= pending.playerIndex;
  pending.playerIndex = rollerIndex;
  pending.rollerIndex = rollerIndex;
  pending.dieSides = sides;
  pending.remainingAttempts = sides === 20 ? 2 : 1;
  pending.roll = value;
  game.lastRoll = { value, sides, color: sides === 20 ? "clear" : "red", label: pending.card.name };
  game.phase = "dudeGuess";
  game.message = `${roller.name}: guess who owns Carrot #${value}, or choose Kaballa’s Market.`;
  return game;
}

function resolveDudeGuess(game, pending, action, random) {
  const carrotNumber = pending.roll;
  const guessedOwnerIndex = action.owner === "market" ? -1 : Number(action.ownerPlayerIndex);
  const actualMarketIndex = game.carrotMarket.findIndex((carrot) => Number(carrot.label) === carrotNumber);
  let actualOwnerIndex = actualMarketIndex >= 0 ? -1 : game.players.findIndex((player) => player.carrots.some((carrot) => Number(carrot.label) === carrotNumber));
  const carrotExists = actualMarketIndex >= 0 || actualOwnerIndex >= 0;
  if (carrotExists && actualOwnerIndex === guessedOwnerIndex) {
    const carrot = actualOwnerIndex === -1
      ? game.carrotMarket.splice(actualMarketIndex, 1)[0]
      : removeFirst(game.players[actualOwnerIndex].carrots, (entry) => Number(entry.label) === carrotNumber);
    if (carrot) game.players[pending.rollerIndex].carrots.push(carrot);
    pushLog(game, `${game.players[pending.rollerIndex].name} correctly found Carrot #${carrotNumber}.`);
    return continueDudeChallenge(game, pending, random);
  }
  game.phase = "dudePenalty";
  pending.playerIndex = pending.rollerIndex;
  game.message = `${game.players[pending.rollerIndex].name}: wrong guess—return one Carrot to Kaballa’s Market.`;
  return game;
}

function resolveDudePenalty(game, pending, carrotId, random) {
  const roller = game.players[pending.rollerIndex];
  const carrot = removeFirst(roller.carrots, (entry) => entry.id === carrotId);
  if (!carrot) throw new Error("Choose one of your Carrots to return.");
  game.carrotMarket.push(carrot);
  return continueDudeChallenge(game, pending, random);
}

function continueDudeChallenge(game, pending, random) {
  pending.remainingAttempts -= 1;
  if (pending.remainingAttempts > 0 && game.players[pending.rollerIndex].carrots.length) {
    pending.roll = rollDie(pending.dieSides, random);
    game.lastRoll = { value: pending.roll, sides: pending.dieSides, color: "clear", label: pending.card.name };
    game.phase = "dudeGuess";
    game.message = `${game.players[pending.rollerIndex].name}: second attempt—guess who owns Carrot #${pending.roll}.`;
    return game;
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function rollMysteryUrn(game, pending, random) {
  const rollerIndex = pending.playerIndex;
  const value = rollD12(random);
  game.lastRoll = { value, sides: 12, color: "violet", label: pending.card.name };
  if (pending.initialRoll) {
    pending.initialRoll = false;
    if (value === 12) return finishMysteryUrn(game, pending, null);
    pending.highRoll = value;
    return advanceMysteryUrn(game, pending, rollerIndex);
  }
  if (value === 12) {
    if (rollerIndex === pending.cardPlayerIndex) return finishMysteryUrn(game, pending, rollerIndex);
    pending.provisionalWinnerIndex = rollerIndex;
    pending.playerIndex = pending.cardPlayerIndex;
    game.phase = "mysteryUrnFinal";
    game.message = `${game.players[pending.cardPlayerIndex].name}: final chance to roll 12 and steal the kitty.`;
    return game;
  }
  if (value > pending.highRoll) {
    pending.highRoll = value;
    return advanceMysteryUrn(game, pending, rollerIndex);
  }
  game.phase = "mysteryUrnDonate";
  game.message = `${game.players[rollerIndex].name}: donate one bunny or Carrot to the kitty.`;
  return game;
}

function donateMysteryUrn(game, pending, action) {
  const player = game.players[pending.playerIndex];
  if (action.bunnyId) {
    const bunny = removeFirst(player.bunnies, (entry) => entry.id === action.bunnyId);
    if (!bunny) throw new Error("Choose a bunny you own.");
    removeKillerBunnyFromCircle(game, bunny.id);
    pending.kittyBunnies.push(bunny);
  } else {
    const carrot = removeFirst(player.carrots, (entry) => entry.id === action.carrotId);
    if (!carrot) throw new Error("Choose a bunny or Carrot to donate.");
    pending.kittyCarrots.push(carrot);
  }
  if (!player.bunnies.length && !player.carrots.length) {
    pending.eligiblePlayerIndexes = pending.eligiblePlayerIndexes.filter((index) => index !== pending.playerIndex);
  }
  if (!pending.eligiblePlayerIndexes.length) return finishMysteryUrn(game, pending, null);
  return advanceMysteryUrn(game, pending, pending.playerIndex);
}

function advanceMysteryUrn(game, pending, previousIndex) {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const candidate = (previousIndex + offset) % game.players.length;
    if (!pending.eligiblePlayerIndexes.includes(candidate)) continue;
    pending.playerIndex = candidate;
    game.phase = "mysteryUrnRoll";
    game.message = `${game.players[candidate].name}: roll higher than ${pending.highRoll}, or donate to the kitty.`;
    return game;
  }
  return finishMysteryUrn(game, pending, null);
}

function rollMysteryUrnFinal(game, pending, random) {
  const value = rollD12(random);
  game.lastRoll = { value, sides: 12, color: "violet", label: `${pending.card.name} final chance` };
  return finishMysteryUrn(game, pending, value === 12 ? pending.cardPlayerIndex : pending.provisionalWinnerIndex);
}

function finishMysteryUrn(game, pending, winnerIndex) {
  if (Number.isInteger(winnerIndex)) {
    const winner = game.players[winnerIndex];
    winner.bunnies.push(...pending.kittyBunnies);
    winner.carrots.push(...pending.kittyCarrots);
    ensureKillerBunniesCircle(game);
    pushLog(game, `${winner.name} won The Mystery Urn kitty.`);
  } else {
    for (const bunny of pending.kittyBunnies) discardBunny(game, bunny);
    game.carrotMarket.push(...pending.kittyCarrots);
    pushLog(game, "The Mystery Urn ended with no winner.");
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishPendingEffect(game, pending);
}

function chooseBountyTarget(game, pending, bunnyId) {
  const target = findKillerBunnyInCircle(game, bunnyId);
  if (!target) throw new Error("Choose a bunny in the Bunny Circle.");
  pending.bunnyId = bunnyId;
  pending.playerIndex = pending.playerIndex;
  game.phase = "bountyAmount";
  game.message = `${game.players[pending.playerIndex].name}: donate at least 1 Dolla to the bounty.`;
  return game;
}

function placeBounty(game, pending, amount) {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Donate at least 1 Dolla.");
  const target = findKillerBunnyInCircle(game, pending.bunnyId);
  if (!target) throw new Error("That bunny is no longer available.");
  spendBank(game.players[pending.playerIndex], amount, game.discardPile);
  target.bunny.bounty ||= { amount: 0, cards: [] };
  target.bunny.bounty.amount += amount;
  target.bunny.bounty.cards.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${game.players[pending.playerIndex].name} placed a ${amount} Dolla bounty on ${target.bunny.name}.`);
  return finishPendingEffect(game, pending);
}

function findZepTepiRecipient(game, drawingPlayerIndex) {
  for (let offset = 0; offset < game.players.length; offset += 1) {
    const index = (drawingPlayerIndex - offset + game.players.length) % game.players.length;
    if (!game.players[index].hasCompletedKillerBunniesGame) return index;
  }
  return drawingPlayerIndex;
}

function resolveZepTepi(game, pending, specialIds) {
  const recipient = game.players[pending.playerIndex];
  const uniqueIds = [...new Set(specialIds)];
  for (const ownerIndex of pending.adjacentIndexes) {
    const chosen = game.players[ownerIndex].savedSpecials.filter((card) => uniqueIds.includes(card.id));
    if (chosen.length > 1) throw new Error("Take at most one saved card from each adjacent player.");
    if (chosen.length) {
      game.players[ownerIndex].savedSpecials = game.players[ownerIndex].savedSpecials.filter((card) => card.id !== chosen[0].id);
      recipient.savedSpecials.push(chosen[0]);
    }
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  return finishImmediateEffect(game, pending);
}

function resolveSinisterBounceTarget(game, pending, bunnyId) {
  const attacker = game.players[pending.attackingPlayerIndex];
  const bunny = attacker?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose one of the attacking player’s bunnies.");
  const reduction = getKillerBunniesCloverReduction(bunny);
  game.phase = "defend";
  game.pendingAction = {
    ...pending,
    playerIndex: pending.attackingPlayerIndex,
    targetPlayerIndex: pending.attackingPlayerIndex,
    bunnyId,
    cloverReduction: reduction,
    effectivePower: Math.max(0, (pending.card.power || 0) - reduction),
    bouncedBySinister: true,
  };
  game.message = `${attacker.name}: ${pending.card.name} bounced back onto ${bunny.name}. Roll a d12.`;
  return game;
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
  const result = resolveKillerBunniesBlueSpecialRollCore(game, playerIndex, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "blueSpecial" });
}

function resolveKillerBunniesBlueSpecialRollCore(game, playerIndex, random = Math.random) {
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
    minilithActive: hasActiveMinilith(next, playerIndex, pending.card),
    visitedBunnyIds: [],
    initialAttack: true,
  };
  next.message = `${next.players[targetPlayerIndex].name}: roll a d12 for ${entry.bunny.name} against ${pending.card.name}.`;
  return next;
}

export function resolveKillerBunniesRoamingRoll(game, playerIndex, random = Math.random) {
  const result = resolveKillerBunniesRoamingRollCore(game, playerIndex, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "roaming" });
}

function resolveKillerBunniesRoamingRollCore(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "roamingRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = findKillerBunnyInCircle(next, pending.bunnyId);
  if (!target) return finishRoamingAttack(next, pending, null);
  const roamingStep = getNextRoamingTarget(next, target.bunny.id, pending.direction, (entry) =>
    isViableRoamingTarget(entry.bunny, pending.card)
      && (Number(pending.card.number) !== 47 || !pending.visitedBunnyIds.includes(entry.bunny.id)));
  const nextTarget = roamingStep?.entry;
  if (roamingStep?.direction) pending.direction = roamingStep.direction;
  const value = rollD12(random);
  next.lastRoll = { value, sides: 12, label: pending.card.name };
  pending.visitedBunnyIds = [...new Set([...(pending.visitedBunnyIds || []), target.bunny.id])];
  if (Number(pending.card.number) === 181) {
    pushLog(next, `${target.player.name} rolled Red d12: ${value} for ${pending.card.name}.`);
    if ([2, 3, 5, 7, 11].includes(value)) return beginCruiseMissileDetonation(next, pending, target);
    return finishRoamingAttack(next, pending, nextTarget?.bunny.id || null);
  }
  if (value <= pending.power) {
    target.player.bunnies.splice(target.bunnyIndex, 1);
    discardBunny(next, target.bunny, pending.cardPlayerIndex);
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
  const result = resolveKillerBunniesBlueCardRollCore(game, playerIndex, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "blueCard" });
}

function resolveKillerBunniesBlueCardRollCore(game, playerIndex, random = Math.random) {
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
  if (Number(pending.card.number) === 257 && isHolographicBunny(bunny)) bunny.hologramMadeLiving = true;
  next.pendingAction = null;
  pushLog(next, `${next.players[playerIndex].name} placed ${pending.card.name} under ${target.name}'s ${bunny.name}.`);
  const continued = finishPendingEffect(next, pending);
  continued.message = `${pending.card.name} is now attached to ${bunny.name}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

export function chooseKillerBunniesBlackCatTarget(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "blackCatTarget");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  const clovers = getKillerBunniesCloverCards(bunny);
  if (!bunny || !clovers.length) throw new Error("Choose a bunny carrying at least one Clover card.");

  bunny.modifiers = (bunny.modifiers || []).filter((modifier) => !clovers.some((clover) => clover.id === modifier.id));
  next.phase = "blackCatRoll";
  next.pendingAction = {
    ...pending,
    playerIndex,
    targetPlayerIndex,
    bunnyId,
    bunnyName: bunny.name,
    clovers,
  };
  next.message = `${next.players[playerIndex].name}: roll the Green d12 for ${pending.card.name}. Odd may relocate the removed Clovers; even discards them.`;
  pushLog(next, `${next.players[playerIndex].name} removed ${clovers.length} Clover card${clovers.length === 1 ? "" : "s"} from ${target.name}'s ${bunny.name}.`);
  return next;
}

export function resolveKillerBunniesBlackCatRoll(game, playerIndex, random = Math.random) {
  const result = resolveKillerBunniesBlackCatRollCore(game, playerIndex, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "blackCat" });
}

function resolveKillerBunniesBlackCatRollCore(game, playerIndex, random = Math.random) {
  requirePendingController(game, playerIndex, "blackCatRoll");
  const next = clone(game);
  const pending = next.pendingAction;
  const roll = rollD12(random);
  next.lastRoll = { value: roll, sides: 12, color: "green", label: pending.card.name };
  pushLog(next, `${next.players[playerIndex].name} rolled Green d12: ${roll} for ${pending.card.name}.`);

  if (roll % 2 === 0) {
    next.discardPile.push(...pending.clovers, pending.card);
    next.pendingAction = null;
    const continued = finishPendingEffect(next, pending);
    continued.message = `The even Green roll discarded every Clover removed from ${pending.bunnyName}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
    return continued;
  }

  next.phase = "blackCatRelocate";
  next.message = `Odd Green roll: place or discard ${pending.clovers.length} removed Clover card${pending.clovers.length === 1 ? "" : "s"}, one at a time.`;
  return next;
}

export function placeKillerBunniesBlackCatClover(game, playerIndex, targetPlayerIndex, bunnyId) {
  requirePendingController(game, playerIndex, "blackCatRelocate");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[targetPlayerIndex];
  const bunny = target?.bunnies.find((entry) => entry.id === bunnyId);
  if (!bunny) throw new Error("Choose any bunny in the Bunny Circle for this Clover.");
  const clover = pending.clovers.shift();
  if (!clover) throw new Error("There are no Clover cards left to place.");
  bunny.modifiers ||= [];
  bunny.modifiers.push(clover);
  pushLog(next, `${next.players[playerIndex].name} placed ${clover.name} under ${target.name}'s ${bunny.name}.`);
  return continueBlackCatRelocation(next, pending);
}

export function discardKillerBunniesBlackCatClover(game, playerIndex) {
  requirePendingController(game, playerIndex, "blackCatRelocate");
  const next = clone(game);
  const pending = next.pendingAction;
  const clover = pending.clovers.shift();
  if (!clover) throw new Error("There are no Clover cards left to discard.");
  next.discardPile.push(clover);
  pushLog(next, `${next.players[playerIndex].name} discarded ${clover.name} after the Black Cat roll.`);
  return continueBlackCatRelocation(next, pending);
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

export function callKillerBunniesPovertyPoker(game, playerIndex, requestedStakes) {
  requirePendingController(game, playerIndex, "povertyPokerCall");
  const next = clone(game);
  const pending = next.pendingAction;
  const stakes = normalizePovertyPokerStakes(requestedStakes);
  if (!Object.values(stakes).some((amount) => amount > 0)) {
    throw new Error("Call for at least one item in the Poverty Poker stake.");
  }
  if (!canCoverPovertyPokerStake(next.players[playerIndex], stakes)) {
    throw new Error(`${next.players[playerIndex].name} cannot cover the complete Poverty Poker stake.`);
  }

  const playOrder = next.players.map((_, offset) => (playerIndex + offset) % next.players.length);
  const eligiblePlayerIndexes = playOrder.filter((index) => canCoverPovertyPokerStake(next.players[index], stakes));
  next.phase = "povertyPokerAnte";
  next.pendingAction = {
    ...pending,
    effect: "povertyPoker",
    cardPlayerIndex: playerIndex,
    stakes,
    eligiblePlayerIndexes,
    anteQueue: [...eligiblePlayerIndexes],
    playerIndex: eligiblePlayerIndexes[0],
    pot: createPovertyPokerPot(),
    scores: next.players.map(() => null),
    rollHistory: [],
    contenderIndexes: [...eligiblePlayerIndexes],
    rollQueue: [],
    roundNumber: 1,
    optionalRerollResolved: false,
  };
  next.message = `${next.players[eligiblePlayerIndexes[0]].name}: choose the items you will risk for Poverty Poker.`;
  pushLog(next, `${next.players[playerIndex].name} called Poverty Poker for ${formatPovertyPokerStakes(stakes)}. ${eligiblePlayerIndexes.length} player${eligiblePlayerIndexes.length === 1 ? " must" : "s must"} enter.`);
  return next;
}

export function anteKillerBunniesPovertyPoker(game, playerIndex, selections = {}) {
  requirePendingController(game, playerIndex, "povertyPokerAnte");
  const next = clone(game);
  const pending = next.pendingAction;
  const player = next.players[playerIndex];
  if (!pending.eligiblePlayerIndexes.includes(playerIndex) || !canCoverPovertyPokerStake(player, pending.stakes)) {
    throw new Error(`${player.name} cannot cover the complete Poverty Poker stake.`);
  }

  collectPovertyPokerStake(next, playerIndex, selections);
  pending.anteQueue.shift();
  pushLog(next, `${player.name} placed ${formatPovertyPokerStakes(pending.stakes)} into the Poverty Poker pot.`);
  if (pending.anteQueue.length) {
    pending.playerIndex = pending.anteQueue[0];
    next.message = `${next.players[pending.playerIndex].name}: choose the items you will risk for Poverty Poker.`;
    return next;
  }

  pending.rollQueue = [...pending.eligiblePlayerIndexes];
  pending.playerIndex = pending.rollQueue[0];
  next.phase = "povertyPokerRoll";
  next.message = `${next.players[pending.playerIndex].name}: roll any d12 for the Poverty Poker pot.`;
  return next;
}

export function resolveKillerBunniesPovertyPokerRoll(game, playerIndex, choice, random = Math.random) {
  const result = resolveKillerBunniesPovertyPokerRollCore(game, playerIndex, choice, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "povertyPoker", choice });
}

function resolveKillerBunniesPovertyPokerRollCore(game, playerIndex, choice, random = Math.random) {
  if (!["povertyPokerRoll", "povertyPokerReroll"].includes(game.phase) || game.pendingAction?.playerIndex !== playerIndex) {
    throw new Error("It is not your Poverty Poker decision.");
  }
  const next = clone(game);
  const pending = next.pendingAction;

  if (next.phase === "povertyPokerReroll") {
    if (choice === "keep") {
      pending.optionalRerollResolved = true;
      pushLog(next, `${next.players[playerIndex].name} kept their first Poverty Poker roll of ${pending.scores[playerIndex]}.`);
      return completePovertyPokerRollRound(next);
    }
    if (choice !== "reroll") throw new Error("Keep the first roll or use the one optional reroll.");
    const value = rollD12(random);
    pending.scores[playerIndex] = value;
    pending.rollHistory.push({ playerIndex, value, roundNumber: pending.roundNumber, optionalReroll: true });
    pending.optionalRerollResolved = true;
    next.lastRoll = { value, sides: 12, label: `${pending.card.name} optional reroll` };
    pushLog(next, `${next.players[playerIndex].name} replaced their Poverty Poker roll with ${value}.`);
    return completePovertyPokerRollRound(next);
  }

  if (choice !== "roll") throw new Error("Roll a d12 for Poverty Poker.");
  const value = rollD12(random);
  pending.scores[playerIndex] = value;
  pending.rollHistory.push({ playerIndex, value, roundNumber: pending.roundNumber, optionalReroll: false });
  next.lastRoll = { value, sides: 12, label: pending.card.name };
  pending.rollQueue.shift();
  pushLog(next, `${next.players[playerIndex].name} rolled ${value} for Poverty Poker.`);
  if (pending.rollQueue.length) {
    pending.playerIndex = pending.rollQueue[0];
    next.message = `${next.players[pending.playerIndex].name}: roll any d12 for Poverty Poker.`;
    return next;
  }
  return completePovertyPokerRollRound(next);
}

export function resolveKillerBunniesDefectorRoll(game, playerIndex, choice, random = Math.random) {
  const result = resolveKillerBunniesDefectorRollCore(game, playerIndex, choice, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "defector", choice });
}

function resolveKillerBunniesDefectorRollCore(game, playerIndex, choice, random = Math.random) {
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
  const result = resolveKillerBunniesDefenseCore(game, playerIndex, choice, random);
  return offerTimidReroll(game, result, playerIndex, { kind: "defense", choice });
}

function resolveKillerBunniesDefenseCore(game, playerIndex, choice, random = Math.random) {
  requirePendingController(game, playerIndex, "defend");
  const next = clone(game);
  const pending = next.pendingAction;
  const target = next.players[pending.targetPlayerIndex];
  const bunnyIndex = target?.bunnies.findIndex((bunny) => bunny.id === pending.bunnyId) ?? -1;
  if (bunnyIndex < 0) throw new Error("That bunny is no longer available.");
  const bunny = target.bunnies[bunnyIndex];

  if (pending.effect === "weapon") {
    const effectivePower = Number.isFinite(pending.effectivePower) ? pending.effectivePower : pending.card.power;
    let weaponFailed = false;
    if (choice === "defense") {
      // Clovers change the weapon's die-roll threshold, not its printed cost in Defense units.
      const printedPower = pending.card.power;
      const defenseTotal = defenseUnitTotal(target);
      if (defenseTotal < printedPower) throw new Error(`You need ${printedPower} Defense units to stop this weapon.`);
      spendDefenseCards(target, printedPower, next.discardPile);
      pushLog(next, `${target.name} used Defense Cards to stop ${pending.card.name}.`);
      weaponFailed = true;
    } else if (choice === "roll") {
      const roll = 1 + Math.floor(random() * 12);
      next.lastRoll = { value: roll, sides: 12, label: pending.card.name };
      if (target.shields > 0) {
        target.shields -= 1;
        pushLog(next, `${target.name} rolled ${roll}; their burrow shield stopped ${pending.card.name}.`);
        weaponFailed = true;
      } else if (roll <= effectivePower) {
        target.bunnies.splice(bunnyIndex, 1);
        discardBunny(next, bunny, pending.attackingPlayerIndex);
        pushLog(next, `${target.name} rolled ${roll}; ${pending.card.name} knocked out ${bunny.name}.`);
      } else {
        pushLog(next, `${target.name} rolled ${roll}; ${bunny.name} escaped ${pending.card.name}.`);
        weaponFailed = true;
      }
    } else throw new Error("Roll the d12 or use enough Defense Cards to resolve this attack.");
    if (weaponFailed && !pending.bouncedBySinister && (Number(bunny.number) === 169 || /^Sinister Bunny\s*[–-]\s*Red$/i.test(bunny.name || ""))) {
      const attacker = next.players[pending.attackingPlayerIndex];
      if (attacker?.bunnies.length) {
        next.phase = "sinisterBounceTarget";
        next.pendingAction = { ...pending, playerIndex: pending.targetPlayerIndex, bouncedBySinister: true };
        next.message = `${target.name}: bounce ${pending.card.name} onto one of ${attacker.name}'s bunnies.`;
        return next;
      }
    }
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

  if (pending.card.kind === "weapon") return finishUsedWeapon(next, pending);
  next.discardPile.push(pending.card);
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

  const couponShoppingAfterRun = next.phase === "draw" && isKaballasCouponActive(next, playerIndex);
  if (!couponShoppingAfterRun) requireCurrent(next, playerIndex, "play");
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
  enforcePersistentBunnyRequirements(next);
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
  next.players[next.currentPlayerIndex].turnsStarted = (next.players[next.currentPlayerIndex].turnsStarted || 0) + 1;
  returnFutureBunnies(next, next.currentPlayerIndex);
  next.phase = "play";
  next.purchases = { cabbage: false, water: false, carrot: false };
  next.message = `${summaries.length ? `${summaries.join(" ")} ` : ""}${next.players[next.currentPlayerIndex].name}'s turn: shop or flip TOP RUN.`;
  return next;
}

function returnFutureBunnies(game, playerIndex) {
  const due = (game.futureBunnies || []).filter((entry) => entry.ownerIndex === playerIndex
    && entry.returnAtTurnStarted <= (game.players[playerIndex].turnsStarted || 0));
  if (!due.length) return;
  game.futureBunnies = game.futureBunnies.filter((entry) => !due.includes(entry));
  for (const entry of due) {
    game.players[playerIndex].bunnies.push(entry.bunny);
    addKillerBunnyToCircle(game, entry.bunny.id);
    pushLog(game, `${entry.bunny.name} returned from the future to ${game.players[playerIndex].name}.`);
  }
}

function settleFeedingObligations(game, playerIndex) {
  const player = game.players[playerIndex];
  const obligations = player.feedingObligations || [];
  if (!obligations.length) return "";
  const outcomes = [];
  const redCongenialRemaining = new Map(player.bunnies
    .filter((bunny) => Number(bunny.number) === 166 || /^Congenial Bunny\s*[–-]\s*Red$/i.test(bunny.name || ""))
    .map((bunny) => [bunny.id, { cabbage: 3, water: 3 }]));

  for (const obligation of obligations) {
    const bunnyIndex = player.bunnies.findIndex((bunny) => bunny.id === obligation.bunnyId);
    if (bunnyIndex < 0) {
      if (obligation.discardCardOnSettle !== false) game.discardPile.push(obligation.card);
      continue;
    }
    const bunny = player.bunnies[bunnyIndex];
    if (hasHeavenlyHalo(bunny) || isIntangibleHologram(bunny)) {
      if (obligation.discardCardOnSettle !== false) game.discardPile.push(obligation.card);
      outcomes.push(`${bunny.name}'s Halo prevented hunger.`);
      pushLog(game, `${bunny.name}'s Heavenly Halo blocked ${obligation.card.name}.`);
      continue;
    }
    let cabbageCost = obligation.cabbageCost || obligation.card.cabbageCost || 0;
    let waterCost = obligation.waterCost || obligation.card.waterCost || 0;
    const allowance = redCongenialRemaining.get(bunny.id);
    if (allowance) {
      const freeCabbage = Math.min(allowance.cabbage, cabbageCost);
      const freeWater = Math.min(allowance.water, waterCost);
      allowance.cabbage -= freeCabbage;
      allowance.water -= freeWater;
      cabbageCost -= freeCabbage;
      waterCost -= freeWater;
    }
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
    if (obligation.discardCardOnSettle !== false) game.discardPile.push(obligation.card);
  }

  player.feedingObligations = [];
  return outcomes.join(" ");
}

export function runKillerBunniesComputers(game, random = Math.random) {
  let next = clone(game);
  let steps = 0;
  while (steps < 10000 && next.phase !== "gameOver" && next.phase !== "reveal") {
    if (CARD_ACTION_PHASES.has(next.phase)) {
      const controllerIndex = next.pendingAction?.playerIndex;
      if (!next.players[controllerIndex]?.isComputer) break;
      next = resolveKillerBunniesCardAction(next, controllerIndex, chooseBotCardAction(next, controllerIndex), random);
      steps += 1;
      continue;
    }
    if (next.phase === "everyoneFeedTarget") {
      const chooserIndex = next.pendingAction?.playerIndex;
      const chooser = next.players[chooserIndex];
      if (!chooser?.isComputer) break;
      next = chooseKillerBunniesEveryoneFeedBunny(next, chooserIndex, chooser.bunnies[0]?.id);
      steps += 1;
      continue;
    }
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
    if (next.phase === "povertyPokerAnte") {
      const antePlayerIndex = next.pendingAction?.playerIndex;
      const antePlayer = next.players[antePlayerIndex];
      if (!antePlayer?.isComputer) break;
      next = anteKillerBunniesPovertyPoker(next, antePlayerIndex, chooseBotPovertyPokerSelections(next, antePlayerIndex));
      steps += 1;
      continue;
    }
    if (next.phase === "povertyPokerRoll" || next.phase === "povertyPokerReroll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      const roller = next.players[rollerIndex];
      if (!roller?.isComputer) break;
      let choice = "roll";
      if (next.phase === "povertyPokerReroll") {
        const otherHigh = Math.max(0, ...next.pendingAction.contenderIndexes
          .filter((index) => index !== rollerIndex)
          .map((index) => next.pendingAction.scores[index] || 0));
        choice = next.pendingAction.scores[rollerIndex] < otherHigh ? "reroll" : "keep";
      }
      next = resolveKillerBunniesPovertyPokerRoll(next, rollerIndex, choice, random);
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
    if (next.phase === "cardDiceRoll") {
      const rollerIndex = next.pendingAction?.playerIndex;
      if (!next.players[rollerIndex]?.isComputer) break;
      next = resolveKillerBunniesCardDiceRoll(next, rollerIndex, next.pendingAction.diceChoices[0].id, random);
      steps += 1;
      continue;
    }
    if (next.phase === "weaponReuseChoice") {
      const controllerIndex = next.pendingAction?.playerIndex;
      if (!next.players[controllerIndex]?.isComputer) break;
      next = resolveKillerBunniesWeaponReuse(next, controllerIndex, "reuse");
      steps += 1;
      continue;
    }
    if (next.phase === "auctionBid") {
      const bidderIndex = next.pendingAction?.playerIndex;
      const bidder = next.players[bidderIndex];
      if (!bidder?.isComputer) break;
      const minimumBid = (next.pendingAction.currentBid || 0) + 1;
      const botLimit = Math.min(bankTotal(bidder), next.pendingAction.targetPlayerIndex === bidderIndex ? 7 : 5);
      next = placeKillerBunniesAuctionBid(next, bidderIndex, minimumBid <= botLimit ? minimumBid : null);
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
      const specialNumber = Number(next.pendingAction?.card?.number);
      next = resolveKillerBunniesSpecialChoice(next, playerIndex, [80, 81, 145, 147, 148, 152, 203, 204].includes(specialNumber) ? "save" : "use", random);
    } else if (next.phase === "manualResolve") {
      next = resolveKillerBunniesManualCard(next, next.pendingAction.playerIndex);
    } else if (next.phase === "povertyPokerCall") {
      next = callKillerBunniesPovertyPoker(next, playerIndex, chooseBotPovertyPokerStakes(next, playerIndex));
    } else if (next.phase === "modifierTarget") {
      const target = findBotModifierTarget(next, playerIndex);
      next = chooseKillerBunniesModifierTarget(next, playerIndex, target.playerIndex, target.bunny.id);
    } else if (next.phase === "blackCatTarget") {
      const target = next.players
        .flatMap((entry, targetPlayerIndex) => entry.bunnies.map((bunny) => ({ targetPlayerIndex, bunny })))
        .find(({ bunny }) => getKillerBunniesCloverCards(bunny).length);
      next = chooseKillerBunniesBlackCatTarget(next, playerIndex, target.targetPlayerIndex, target.bunny.id);
    } else if (next.phase === "blackCatRoll") {
      next = resolveKillerBunniesBlackCatRoll(next, playerIndex, random);
    } else if (next.phase === "blackCatRelocate") {
      const ownBunny = next.players[playerIndex].bunnies[0];
      next = ownBunny
        ? placeKillerBunniesBlackCatClover(next, playerIndex, playerIndex, ownBunny.id)
        : discardKillerBunniesBlackCatClover(next, playerIndex);
    } else if (next.phase === "auctionTarget") {
      const target = findBotTarget(next, playerIndex) || { playerIndex, bunny: next.players[playerIndex].bunnies[0] };
      next = chooseKillerBunniesAuctionTarget(next, playerIndex, target.playerIndex, target.bunny.id);
    } else if (next.phase === "bunnyExchangeGive") {
      next = chooseKillerBunniesBunnyExchangeGive(next, playerIndex, next.players[playerIndex].bunnies[0].id);
    } else if (next.phase === "bunnyExchangeTake") {
      const target = next.players
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry, index }) => index !== playerIndex && entry.bunnies.length)
        .sort((a, b) => b.entry.bunnies.length - a.entry.bunnies.length)[0];
      next = resolveKillerBunniesBunnyExchange(next, playerIndex, target.index, target.entry.bunnies.slice(0, Math.min(2, target.entry.bunnies.length)).map((bunny) => bunny.id));
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
  const couponShoppingAfterRun = isCurrent && game.phase === "draw" && isKaballasCouponActive(game, playerIndex);
  if (!isCurrent || (game.phase !== "play" && !couponShoppingAfterRun)) return { enabled: false, reason: "Shop only before flipping TOP RUN on your turn." };
  const market = getKaballasMarket(game);
  if (["cabbage", "water", "carrot"].includes(pile) && !market.isOpen) {
    return { enabled: false, reason: "Kaballa’s Market is closed." };
  }
  if (pile === "cabbage" || pile === "water") {
    if (game.purchases[pile]) return { enabled: false, reason: `Already bought ${pile} this turn.` };
    if (!game[`${pile}Supply`].length) return { enabled: false, reason: "Supply is empty." };
    const price = getKillerBunniesKaballasPrice(game, playerIndex, pile);
    const feeding = getKillerBunniesFeedingStatus(player);
    const due = pile === "cabbage" ? feeding.cabbageShortfall : feeding.waterShortfall;
    return availableStoreDolla(game, playerIndex) >= price
      ? { enabled: true, reason: `Buy one ${pile} card for ${price} Dolla.${due > 0 ? ` You still need ${due} for feeding.` : ""}` }
      : { enabled: false, reason: `You need ${price} Dolla.` };
  }
  if (pile === "carrot") {
    if (game.purchases.carrot) return { enabled: false, reason: "Already bought a carrot this turn." };
    const price = getKillerBunniesKaballasPrice(game, playerIndex, "carrot");
    return availableStoreDolla(game, playerIndex) >= price
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

export function getKillerBunniesDefenseUnits(player) {
  return defenseUnitTotal(player);
}

export function getKaballasMarket(game) {
  return game?.kaballasMarket || KABALLAS_MARKET_STARTER;
}

export function getKillerBunniesKaballasPrice(game, playerIndex, item) {
  const price = Number(getKaballasMarket(game).prices?.[item] || 0);
  return isKaballasCouponActive(game, playerIndex) ? Math.ceil(price / 2) : price;
}

export function getKillerBunniesCardPlayStatus(player, card) {
  if (!card) return { enabled: false, reason: "No card is programmed." };
  const requiresBunny = card.requiresBunny === true || card.aggressive === true || ["weapon", "feed"].includes(card.kind);
  const eligibleBunnyCount = (player?.bunnies || []).filter((bunny) => !hasHeavenlyHalo(bunny) && isLivingBunny(bunny)).length;
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
  const couponShoppingAfterRun = shop === "rooneys" && game.phase === "draw" && isRooneysCouponActive(game, playerIndex);
  if (game.currentPlayerIndex !== playerIndex || (game.phase !== "play" && !couponShoppingAfterRun)) {
    return { enabled: false, reason: "Shop before flipping TOP RUN on your turn.", price: 0 };
  }
  const player = game.players[playerIndex];
  if (shop === "rooneys") {
    const store = game.rooneysEmporium;
    if (!store) return { enabled: false, reason: "Add the Red Booster to open Rooney’s.", price: 0 };
    if (!store.isOpen) return { enabled: false, reason: "Rooney’s Weapons Emporium is closed.", price: 0 };
    const card = item === "weapon" ? store.weaponDiscard.find((entry) => entry.id === cardId) : store.defenseSupply.at(-1);
    const basePrice = item === "weapon" ? card?.power || 0 : store.defensePrice;
    const price = isRooneysCouponActive(game, playerIndex) ? Math.ceil(basePrice / 2) : basePrice;
    if (!card) return { enabled: false, reason: `No ${item} cards are available.`, price };
    return availableStoreDolla(game, playerIndex) >= price
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
    return availableStoreDolla(game, playerIndex) >= price
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
  spendStoreDolla(next, playerIndex, status.price);
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
  if (card.kind === "everyoneFeed") {
    const opponentQueue = game.players
      .map((target, targetPlayerIndex) => ({ target, targetPlayerIndex }))
      .filter(({ target, targetPlayerIndex }) => targetPlayerIndex !== playerIndex && target.bunnies.length)
      .map(({ targetPlayerIndex }) => targetPlayerIndex);
    if (!opponentQueue.length) {
      game.discardPile.push(card);
      pushLog(game, `${card.name} found no opponents with bunnies.`);
      return finishCardEffect(game, options);
    }
    game.phase = "everyoneFeedTarget";
    game.pendingAction = {
      playerIndex: opponentQueue[0],
      attackingPlayerIndex: playerIndex,
      opponentQueue,
      effect: "everyoneFeed",
      card,
      ...effectReturnState(options),
    };
    game.message = `${game.players[opponentQueue[0]].name}: choose one bunny to feed ${card.cabbageCost || 0} Cabbage and ${card.waterCost || 0} Water by the end of your next turn.`;
    pushLog(game, `${player.name} required every opponent with a bunny to feed one bunny.`);
    return game;
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
  if (Number(card.number) === 53) {
    const hasCloverTarget = game.players.some((target) => target.bunnies.some((bunny) => getKillerBunniesCloverCards(bunny).length));
    if (!hasCloverTarget) {
      game.discardPile.push(card);
      pushLog(game, `${card.name} was discarded because no bunny carried a Clover card.`);
      return finishCardEffect(game, options);
    }
    game.phase = "blackCatTarget";
    game.pendingAction = { playerIndex, effect: "blackCat", card, ...effectReturnState(options) };
    game.message = `Choose any bunny carrying Clover cards. ${card.name} removes all of that bunny's Clovers.`;
    return game;
  }
  if (Number(card.number) === 65) {
    if (!hasAnyPovertyPokerStake(player)) {
      game.discardPile.push(card);
      pushLog(game, `${player.name} discarded Poverty Poker because they had nothing available to stake.`);
      return finishCardEffect(game, options);
    }
    game.phase = "povertyPokerCall";
    game.pendingAction = { playerIndex, effect: "povertyPoker", card, ...effectReturnState(options) };
    game.message = "Set one or more Poverty Poker stakes. You must be able to cover the complete call.";
    return game;
  }
  if (card.catalogNumber === "0055" || /^Defector Detector$/i.test(card.name)) {
    game.phase = "defectorTarget";
    game.pendingAction = { playerIndex, effect: "defectorDetector", card, ...effectReturnState(options) };
    game.message = "Choose any bunny for Defector Detector, or discard the card without using it.";
    return game;
  }
  if (Number(card.number) === 135) {
    game.phase = "auctionTarget";
    game.pendingAction = { playerIndex, effect: "bunnyBlockBid", card, ...effectReturnState(options) };
    game.message = `Choose any bunny in the Bunny Circle to auction with ${card.name}.`;
    return game;
  }
  if (Number(card.number) === 240) {
    if (!game.players.some((target, targetPlayerIndex) => targetPlayerIndex !== playerIndex && target.bunnies.length)) {
      game.discardPile.push(card);
      const continued = finishCardEffect(game, options);
      continued.message = `No opponent had a bunny available for ${card.name}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
      return continued;
    }
    game.phase = "bunnyExchangeGive";
    game.pendingAction = { playerIndex, effect: "bunnyExchange", card, ...effectReturnState(options) };
    game.message = `Choose one of your bunnies to give away with ${card.name}.`;
    return game;
  }
  if (Number(card.number) === 137) {
    const amount = bankTotal(player);
    awardDollaFromDiscard(game, player, amount);
    game.discardPile.push(card);
    pushLog(game, `${player.name} doubled ${amount} saved Dolla with ${card.name}.`);
    return finishCardEffect(game, options);
  }
  if (Number(card.number) === 142) {
    const eligibleResources = ["cabbage", "water"].filter((resource) => supplyUnitTotal(player, resource) === 0);
    if (!eligibleResources.length) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "rockBottomChoice";
    game.pendingAction = { playerIndex, effect: "rockBottom", card, eligibleResources, ...effectReturnState(options) };
    game.message = "Choose the tied richest opponent for each supply Rock Bottom can collect.";
    return game;
  }
  if (Number(card.number) === 143) {
    const entrantIndexes = game.players.map((target, index) => ({ target, index }))
      .filter(({ target }) => target.bunnies.some((bunny) => !hasHeavenlyHalo(bunny)))
      .map(({ index }) => index);
    if (entrantIndexes.length < 2) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "russianRouletteChoose";
    game.pendingAction = {
      playerIndex: entrantIndexes[0], cardPlayerIndex: playerIndex, effect: "russianRoulette", card,
      chooseQueue: [...entrantIndexes], entrantIndexes, bunnyIds: {}, scores: game.players.map(() => null),
      contenderIndexes: [...entrantIndexes], roundNumber: 1, ...effectReturnState(options),
    };
    game.message = `${game.players[entrantIndexes[0]].name}: choose a vulnerable bunny for Russian Roulette.`;
    return game;
  }
  if (Number(card.number) === 144) {
    if (!game.players.some((target, index) => index !== playerIndex && target.carrots.length)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "freshnessTarget";
    game.pendingAction = { playerIndex, effect: "freshness", card, ...effectReturnState(options) };
    game.message = "Choose an opponent whose Carrots must be kept fresh for 2 Dolla each.";
    return game;
  }
  if (Number(card.number) === 149) {
    const hasOtherWeapon = game.players.some((target, index) => index !== playerIndex && target.hand.some((entry) => entry.kind === "weapon"))
      || game.rooneysEmporium?.weaponDiscard.length;
    if (!player.hand.some((entry) => entry.kind === "weapon") || !hasOtherWeapon) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "weaponExchange";
    game.pendingAction = { playerIndex, effect: "weaponExchange", card, ...effectReturnState(options) };
    game.message = "Choose one Weapon from your hand and one Weapon from an opponent or Rooney’s inventory.";
    return game;
  }
  if (Number(card.number) === 71) {
    player.kaballasCouponTurnNumber = game.turnNumber;
    game.discardPile.push(card);
    pushLog(game, `${player.name} activated half-price shopping at Kaballa's Market for this turn.`);
    const continued = finishCardEffect(game, options);
    continued.message = `Kaballa's Market is half price for ${player.name} through the end of this turn.${continued.phase === "draw" ? " You may shop before drawing." : ""}`;
    return continued;
  }
  if (Number(card.number) === 80) {
    if (canMagicSpatulaCancel(game)) return cancelWithMagicSpatula(game, playerIndex, card);
    game.discardPile.push(card);
    pushLog(game, `${player.name} used The Magic Spatula with no eligible threat in play.`);
    return finishCardEffect(game, options);
  }
  if (Number(card.number) === 81) {
    game.discardPile.push(card);
    pushLog(game, `${player.name} used Rooney's Reusables while no Weapon was awaiting reuse.`);
    return finishCardEffect(game, options);
  }
  if (Number(card.number) === 147) {
    game.discardPile.push(card);
    pushLog(game, `${player.name} discarded The Minilith.`);
    return finishCardEffect(game, options);
  }
  if ([47, 54, 181].includes(Number(card.number))) {
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
  if (Number(card.number) === 175) {
    if (!game.players.some((target, index) => index !== playerIndex && target.bunnies.length)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "feedAllTarget";
    game.pendingAction = { playerIndex, effect: "feedAll", card, ...effectReturnState(options) };
    game.message = "Choose an opponent. Every bunny they currently own must feed 1 Cabbage and 1 Water.";
    return game;
  }
  if (Number(card.number) === 183) {
    const minilithHolderIndexes = game.players.map((target, index) => ({ target, index }))
      .filter(({ target, index }) => index !== playerIndex
        && [...target.savedSpecials, ...target.hand].some((entry) => Number(entry.number) === 147))
      .map(({ index }) => index);
    if (!minilithHolderIndexes.length) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "minilithActivate";
    game.pendingAction = { playerIndex, effect: "activateMinilith", card, minilithHolderIndexes, ...effectReturnState(options) };
    game.message = "Steal The Minilith, or make its saved owner roll seven colored d12s.";
    return game;
  }
  if ([185, 186].includes(Number(card.number))) {
    game.phase = "barrierPlace";
    game.pendingAction = { playerIndex, effect: "barrierPlace", card, ...effectReturnState(options) };
    game.message = "Place this Barrier between two adjacent player seats.";
    return game;
  }
  if (Number(card.number) === 187) {
    if (!player.carrots.length || !game.players.some((target, index) => index !== playerIndex && target.carrots.length >= 2)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "carrotExchange";
    game.pendingAction = { playerIndex, effect: "carrotExchange", card, ...effectReturnState(options) };
    game.message = "Choose one of your Carrots and two Carrots from one opponent.";
    return game;
  }
  if (Number(card.number) === 188) {
    if (!game.players.some((target) => target.bunnies.some((bunny) => /Congenial Bunny/i.test(bunny.name)))) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "clumsyCongenialTarget";
    game.pendingAction = { playerIndex, effect: "clumsyCongenial", card, ...effectReturnState(options) };
    game.message = "Choose a Congenial Bunny. Its two adjacent bunnies will be eliminated.";
    return game;
  }
  if (Number(card.number) === 189) {
    if (!player.carrots.length || !game.players.some((target) => target.carrots.length)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "dudePlayerChoice";
    game.pendingAction = { playerIndex, effect: "dudeCarrot", card, ...effectReturnState(options) };
    game.message = "Choose a player with a Carrot to attempt Dude, Where’s My Carrot?";
    return game;
  }
  if (Number(card.number) === 190) {
    if (!game.barriers?.length) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "barrierRemove";
    game.pendingAction = { playerIndex, effect: "barrierRemove", card, ...effectReturnState(options) };
    game.message = "Choose one regular Barrier to eliminate.";
    return game;
  }
  if (Number(card.number) === 195) {
    const eligibleRedItem = game.players.some((target, index) => index !== playerIndex && [
      ...target.bunnies, ...(target.pawns || []), ...(target.zodiacCards || []),
    ].some((entry) => bunnyColors(entry).includes("red") || entry.color === "red" || /Fire/i.test(entry.name || "")));
    if (bankTotal(player) < 5 || !eligibleRedItem) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "redLightDistrict";
    game.pendingAction = { playerIndex, effect: "redLightDistrict", card, ...effectReturnState(options) };
    game.message = "Choose a Red bunny, Red Pawn, or Fire Zodiac card to purchase for 5 Dolla.";
    return game;
  }
  if (Number(card.number) === 193) {
    const eligible = game.players.map((target, index) => ({ target, index }))
      .filter(({ target }) => target.bunnies.length || target.carrots.length).map(({ index }) => index);
    if (!eligible.length) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "mysteryUrnRoll";
    game.pendingAction = {
      playerIndex, cardPlayerIndex: playerIndex, effect: "mysteryUrn", card, eligiblePlayerIndexes: eligible,
      highRoll: 0, kittyBunnies: [], kittyCarrots: [], initialRoll: true, ...effectReturnState(options),
    };
    game.message = `${player.name}: roll the Violet d12 to open The Mystery Urn.`;
    return game;
  }
  if (Number(card.number) === 197) {
    if (bankTotal(player) < 1 || !getKillerBunniesCircleEntries(game).length) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "bountyTarget";
    game.pendingAction = { playerIndex, effect: "bountyMounty", card, ...effectReturnState(options) };
    game.message = "Choose any bunny for Bounty Mounty.";
    return game;
  }
  if (Number(card.number) === 200) {
    if (!game.area51Abducted?.bunny) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "hempRoll";
    game.pendingAction = { playerIndex, effect: "hemp", card, ...effectReturnState(options) };
    game.message = "Roll the Yellow d12 to attack the abducting aliens.";
    return game;
  }
  if (Number(card.number) === 201) {
    game.phase = "rooneysCoupon";
    game.pendingAction = { playerIndex, effect: "rooneysCoupon", card, ...effectReturnState(options) };
    game.message = "Activate half-price shopping at Rooney’s Weapons Emporium for this turn.";
    return game;
  }
  if (Number(card.number) === 202) {
    const revealedBunnyIds = game.players.flatMap((target, index) => index === playerIndex
      ? [] : target.hand.filter((entry) => entry.kind === "bunny").map((entry) => entry.id));
    if (!revealedBunnyIds.length) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "showBunnyExchange";
    game.pendingAction = { playerIndex, effect: "showBunny", card, revealedBunnyIds, ...effectReturnState(options) };
    game.message = "Every opponent revealed their bunnies. Exchange one hand card for one revealed bunny, or pass.";
    return game;
  }
  if ([51, 52, 56, 64, 70, 184, 194].includes(Number(card.number))) {
    game.phase = "playerTarget";
    game.pendingAction = { playerIndex, effect: "playerTarget", card, ...effectReturnState(options) };
    game.message = `Choose a player for ${card.name}.`;
    return game;
  }
  if ([49, 50, 72, 73, 134].includes(Number(card.number))) {
    if (!game.players.some((target) => target.bunnies.length)) {
      game.discardPile.push(card);
      return finishCardEffect(game, options);
    }
    game.phase = "utilityBunnyTarget";
    game.pendingAction = { playerIndex, effect: "utilityBunnyTarget", card, ...effectReturnState(options) };
    game.message = [49, 50, 134].includes(Number(card.number))
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
  if (getAutomaticSupplyReward(card) || [82, 150].includes(Number(card.number))) {
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
    const diceChoices = getGuidedCardDiceChoices(game, card);
    if (diceChoices.length) {
      game.phase = "cardDiceRoll";
      game.pendingAction = { playerIndex, effect: "cardDice", card, diceChoices, diceRolls: [], ...effectReturnState(options) };
      game.message = Number(card.number) === 136
        ? `${player.name}: choose the Orange d12${diceChoices.some((choice) => choice.id === "clear-d20") ? " or Clear d20" : ""} for Carrot Thief.`
        : `${player.name}: roll the dice shown for ${card.name}.`;
      pushLog(game, `${player.name} is ready to roll for ${card.name}.`);
      return game;
    }
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
  const reward = getAutomaticSupplyReward(card);
  if (reward) {
    const received = [];
    const marketOpen = getKaballasMarket(game).isOpen;
    for (const resource of ["cabbage", "water"]) {
      if (!marketOpen) continue;
      const requested = reward[resource] === "all" ? game[`${resource}Supply`].length : reward[resource] || 0;
      const count = Math.min(requested, game[`${resource}Supply`].length);
      moveCards(game[`${resource}Supply`], player[resource], count);
      if (count) received.push(`${count} ${resource} card${count === 1 ? "" : "s"}`);
    }
    if (reward.defense && game.rooneysEmporium?.isOpen) {
      const count = Math.min(reward.defense, game.rooneysEmporium.defenseSupply.length);
      moveCards(game.rooneysEmporium.defenseSupply, player.defenseCards, count);
      if (count) received.push(`${count} Defense Card${count === 1 ? "" : "s"}`);
    }
    if (reward.pawn && game.weilsPawnShop?.isOpen) {
      const count = Math.min(reward.pawn, game.weilsPawnShop.pawnSupply.length);
      moveCards(game.weilsPawnShop.pawnSupply, player.pawns, count);
      if (count) received.push(`${count} Pawn${count === 1 ? "" : "s"}`);
    }
    pushLog(game, received.length
      ? `${player.name} received ${received.join(", ")} from ${card.name}.`
      : `${card.name} found its required shop closed or its supply empty.`);
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

function getAutomaticSupplyReward(card) {
  const number = Number(card?.number);
  if ([68, 473].includes(number)) return { cabbage: 2 };
  if ([69, 474].includes(number)) return { water: 2 };
  if ([146, 198].includes(number)) return { cabbage: 1, water: 1 };
  if ([199, 359, 1023, 1414].includes(number) || /^Free Defense$/i.test(card?.name || "")) return { defense: 2 };
  if (number === 419 || /^Bonanza$/i.test(card?.name || "")) return { cabbage: 1, water: 1, defense: 1, pawn: 1 };
  if (number === 640 || /^Cabbage Patch$/i.test(card?.name || "")) return { cabbage: "all" };
  if (number === 660 || /^Watering Hole$/i.test(card?.name || "")) return { water: "all" };
  return null;
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
  if (isIntangibleHologram(bunny) && !isHolographicVulnerableTo(card)) return false;
  return Number(card?.number) !== 47 || !hasContainmentSuit(bunny);
}

function discardRoamingCard(game, card) {
  if (card.kind === "weapon") discardUsedWeapon(game, card);
  else game.discardPile.push(card);
}

function getNextRoamingTarget(game, bunnyId, direction, predicate) {
  const current = findKillerBunnyInCircle(game, bunnyId);
  if (!current) return null;
  let next = getNextKillerBunnyInCircle(game, bunnyId, direction, predicate);
  if (!next) return null;
  if (hasBarrierBetweenPlayers(game, current.playerIndex, next.playerIndex)) {
    direction *= -1;
    next = getNextKillerBunnyInCircle(game, bunnyId, direction, predicate);
  }
  return next ? { entry: next, direction } : null;
}

function hasBarrierBetweenPlayers(game, firstIndex, secondIndex) {
  if (firstIndex === secondIndex) return false;
  return (game.barriers || []).some((barrier) =>
    (barrier.leftPlayerIndex === firstIndex && barrier.rightPlayerIndex === secondIndex)
    || (barrier.leftPlayerIndex === secondIndex && barrier.rightPlayerIndex === firstIndex));
}

function isPlayerIsolatedByBarriers(game, playerIndex) {
  if (game.players.length < 2) return false;
  const previous = (playerIndex - 1 + game.players.length) % game.players.length;
  const next = (playerIndex + 1) % game.players.length;
  return hasBarrierBetweenPlayers(game, previous, playerIndex)
    && hasBarrierBetweenPlayers(game, playerIndex, next);
}

function circlePathCrossesBarrier(game, entries, startIndex, targetIndex, direction) {
  let index = startIndex;
  while (index !== targetIndex) {
    const nextIndex = (index + direction + entries.length) % entries.length;
    if (hasBarrierBetweenPlayers(game, entries[index].playerIndex, entries[nextIndex].playerIndex)) return true;
    index = nextIndex;
  }
  return false;
}

function isCircleEffectReachable(game, centerBunnyId, targetBunnyId) {
  if (centerBunnyId === targetBunnyId) return true;
  const entries = getKillerBunniesCircleEntries(game);
  const startIndex = entries.findIndex((entry) => entry.bunny.id === centerBunnyId);
  const targetIndex = entries.findIndex((entry) => entry.bunny.id === targetBunnyId);
  if (startIndex < 0 || targetIndex < 0) return false;
  const clockwise = (targetIndex - startIndex + entries.length) % entries.length;
  const counterClockwise = (startIndex - targetIndex + entries.length) % entries.length;
  if (clockwise < counterClockwise) return !circlePathCrossesBarrier(game, entries, startIndex, targetIndex, 1);
  if (counterClockwise < clockwise) return !circlePathCrossesBarrier(game, entries, startIndex, targetIndex, -1);
  return !circlePathCrossesBarrier(game, entries, startIndex, targetIndex, 1)
    || !circlePathCrossesBarrier(game, entries, startIndex, targetIndex, -1);
}

function beginCruiseMissileDetonation(game, pending, target) {
  if (!pending.initialAttack) game.roamingEffects = (game.roamingEffects || []).filter((effect) => effect.id !== pending.roamingId);
  const multiplier = pending.minilithActive ? 2 : 1;
  const affected = getKillerBunniesCircleRange(game, target.bunny.id, 1)
    .filter((entry) => isCircleEffectReachable(game, target.bunny.id, entry.bunny.id))
    .map((entry, index) =>
    areaAttackEntry(entry, entry.distance, (entry.distance === 0 ? 9 : 8) * multiplier, index));
  game.phase = "areaWeaponRoll";
  game.pendingAction = {
    ...pending,
    effect: "areaWeapon",
    attackingPlayerIndex: pending.cardPlayerIndex,
    targetBunnyId: target.bunny.id,
    affected,
    rollQueue: affected.filter((entry) => !entry.protected).map((entry) => entry.attackId),
    playerIndex: affected[0]?.playerIndex ?? pending.cardPlayerIndex,
    initialAttack: undefined,
    ...(pending.initialAttack ? {} : {
      rooneyContinuation: {
        type: "roamingTurn",
        remainingRoamingEffects: pending.remainingRoamingEffects || [],
        turnEndSummaries: pending.turnEndSummaries || [],
        turnEndingPlayerIndex: pending.turnEndingPlayerIndex,
      },
    }),
  };
  pushLog(game, `${pending.card.name} detonated on ${target.bunny.name}.`);
  return continueAreaWeapon(game);
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
        minilithActive: pending.minilithActive,
        reusedWithRooney: pending.reusedWithRooney,
        rooneyContinuation: pending.rooneyContinuation,
      });
      pushLog(game, `${pending.card.name} moved to the next bunny and will attack again next round.`);
    } else {
      if (pending.card.kind === "weapon") return finishUsedWeapon(game, pending);
      discardRoamingCard(game, pending.card);
      pushLog(game, `${pending.card.name} had no viable bunny left and was discarded.`);
    }
    game.pendingAction = null;
    if (pending.reusedWithRooney && pending.rooneyContinuation) return continueAfterWeapon(game, pending);
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
      pushLog(game, `${finished.card.name} ran out of viable targets and left the Bunny Circle.`);
      if (finished.card.kind === "weapon") {
        return finishUsedWeapon(game, {
          ...pending,
          card: finished.card,
          attackingPlayerIndex: finished.launchPlayerIndex,
          rooneyContinuation: {
            type: "roamingTurn",
            remainingRoamingEffects: pending.remainingRoamingEffects || [],
            turnEndSummaries: pending.turnEndSummaries || [],
            turnEndingPlayerIndex: pending.turnEndingPlayerIndex,
          },
        });
      }
      discardRoamingCard(game, finished.card);
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
      const replacementStep = anchorId && getNextRoamingTarget(game, anchorId, effect.direction, (candidate) =>
        isViableRoamingTarget(candidate.bunny, effect.card)
          && (Number(effect.card.number) !== 47 || !effect.visitedBunnyIds.includes(candidate.bunny.id)));
      const replacement = replacementStep?.entry;
      if (!replacement) {
        game.roamingEffects = (game.roamingEffects || []).filter((candidate) => candidate.id !== effect.id);
        if (effect.card.kind === "weapon") {
          return finishUsedWeapon(game, {
            card: effect.card,
            attackingPlayerIndex: effect.launchPlayerIndex,
            rooneyContinuation: {
              type: "roamingTurn",
              remainingRoamingEffects: remaining.map((entry) => entry.id),
              turnEndSummaries: summaries,
              turnEndingPlayerIndex,
            },
          });
        }
        discardRoamingCard(game, effect.card);
        continue;
      }
      if (replacementStep?.direction) effect.direction = replacementStep.direction;
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
      reusedWithRooney: effect.reusedWithRooney,
      rooneyContinuation: effect.rooneyContinuation,
      minilithActive: effect.minilithActive,
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
  enforcePersistentBunnyRequirements(game);
  return options.returnPhase === "play"
    ? resumePlay(game, options.resumePlayerIndex)
    : advanceToDraw(game);
}

function finishPendingEffect(game, pending) {
  enforcePersistentBunnyRequirements(game);
  return pending?.returnPhase === "play"
    ? resumePlay(game, pending.resumePlayerIndex)
    : advanceToDraw(game);
}

function enforcePersistentBunnyRequirements(game) {
  for (const player of game.players || []) {
    if (player.bunnies.some(isLivingBunny)) continue;
    const removed = (player.savedSpecials || []).filter((card) => Number(card.number) === 147);
    if (!removed.length) continue;
    player.savedSpecials = player.savedSpecials.filter((card) => Number(card.number) !== 147);
    game.discardPile.push(...removed);
    pushLog(game, `${player.name} lost The Minilith after their last living bunny left the Bunny Circle.`);
  }
}

function continueBlackCatRelocation(game, pending) {
  if (pending.clovers.length) {
    game.message = `Place or discard ${pending.clovers.length} remaining Clover card${pending.clovers.length === 1 ? "" : "s"}.`;
    return game;
  }
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  const continued = finishPendingEffect(game, pending);
  continued.message = `Every Clover removed by ${pending.card.name} has been placed or discarded.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function findNextAuctionBidder(game, currentBidderIndex) {
  const pending = game.pendingAction;
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (currentBidderIndex + offset) % game.players.length;
    if (!pending.activeBidderIndexes.includes(index)) continue;
    if (index === pending.highestBidderIndex) continue;
    return index;
  }
  return null;
}

function finishBunnyBlockBid(game) {
  const pending = game.pendingAction;
  const winnerIndex = pending.highestBidderIndex;
  const targetEntry = findKillerBunnyInCircle(game, pending.bunnyId);
  game.discardPile.push(pending.card);
  game.pendingAction = null;

  if (winnerIndex === null || !targetEntry) {
    const continued = finishPendingEffect(game, pending);
    continued.message = winnerIndex === null
      ? `Bunny Block Bid ended with no bids. ${pending.bunnyName} stays with its owner.${continued.phase === "draw" ? " Click the main draw pile." : ""}`
      : `${pending.bunnyName} was no longer available for the auction.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
    pushLog(continued, `Bunny Block Bid ended without a sale.`);
    return continued;
  }

  const winner = game.players[winnerIndex];
  spendBank(winner, pending.currentBid, game.discardPile);
  const formerOwner = targetEntry.player;
  if (targetEntry.playerIndex !== winnerIndex) {
    formerOwner.bunnies.splice(targetEntry.bunnyIndex, 1);
    winner.bunnies.push(targetEntry.bunny);
    const attachedObligations = (formerOwner.feedingObligations || []).filter((obligation) => obligation.bunnyId === pending.bunnyId);
    formerOwner.feedingObligations = (formerOwner.feedingObligations || []).filter((obligation) => obligation.bunnyId !== pending.bunnyId);
    winner.feedingObligations ||= [];
    winner.feedingObligations.push(...attachedObligations);
    ensureKillerBunniesCircle(game);
  }
  pushLog(game, `${winner.name} paid Kaballa ${pending.currentBid} Dolla and won ${pending.bunnyName} from ${formerOwner.name}.`);
  const continued = finishPendingEffect(game, pending);
  continued.message = `${winner.name} won ${pending.bunnyName} for ${pending.currentBid} Dolla. The payment went to the discard pile.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function swapBunnyObligations(giver, target, givenBunnyIds, receivedBunnyIds) {
  const given = (giver.feedingObligations || []).filter((obligation) => givenBunnyIds.includes(obligation.bunnyId));
  const received = (target.feedingObligations || []).filter((obligation) => receivedBunnyIds.includes(obligation.bunnyId));
  giver.feedingObligations = (giver.feedingObligations || []).filter((obligation) => !givenBunnyIds.includes(obligation.bunnyId));
  target.feedingObligations = (target.feedingObligations || []).filter((obligation) => !receivedBunnyIds.includes(obligation.bunnyId));
  giver.feedingObligations.push(...received);
  target.feedingObligations.push(...given);
}

function resolveCarrotThiefRoll(game, pending, result) {
  const carrotNumber = result.value;
  let carrot = removeFirst(game.carrotMarket, (entry) => Number(entry.label) === carrotNumber);
  let source = "Kaballa’s Market";
  if (!carrot) {
    for (const opponent of game.players) {
      carrot = removeFirst(opponent.carrots, (entry) => Number(entry.label) === carrotNumber);
      if (carrot) {
        source = opponent.name;
        break;
      }
    }
  }

  game.discardPile.push(pending.card);
  game.pendingAction = null;
  if (carrot) {
    game.players[pending.playerIndex].carrots.push(carrot);
    pushLog(game, `${game.players[pending.playerIndex].name} stole Carrot #${carrotNumber} from ${source}.`);
  } else {
    pushLog(game, `Carrot Thief found no available Carrot #${carrotNumber}.`);
  }
  const continued = finishPendingEffect(game, pending);
  continued.message = carrot
    ? `${game.players[pending.playerIndex].name} rolled ${carrotNumber} and stole Carrot #${carrotNumber} from ${source}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`
    : `Carrot #${carrotNumber} was not available, so Carrot Thief took nothing.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function getGuidedCardDiceChoices(game, card) {
  if (Number(card.number) === 136) {
    return [
      diceChoice("orange-d12", "Roll Orange d12", [{ sides: 12, color: "orange" }]),
      ...(game.expansionIds?.includes("violet")
        ? [diceChoice("clear-d20", "Roll Clear d20", [{ sides: 20, color: "clear" }])]
        : []),
    ];
  }

  const text = `${card.ability || ""} ${card.detail || ""}`.replace(/\bre-?roll(?:s|ed|ing)?\b/gi, "");
  if (!/\broll(?:s|ed|ing)?\b/i.test(text)) return [];

  const countMatch = text.match(/\b(five|seven|eight) colored d(10|12)s?\b/i);
  if (countMatch) {
    const count = { five: 5, seven: 7, eight: 8 }[countMatch[1].toLowerCase()];
    const colors = ["violet", "orange", "green", "yellow", "blue", "black", "red", "pink"].slice(0, count);
    const sides = Number(countMatch[2]);
    return [diceChoice(`colored-${count}-d${sides}`, `Roll ${count} colored d${sides}s`, colors.map((color) => ({ sides, color })))];
  }

  const pluralMatch = text.match(/([^.;]{0,100})\bd(10|12|20)s\b/i);
  if (pluralMatch) {
    const colors = [...pluralMatch[1].matchAll(/\b(violet|orange|green|yellow|blue|black|red|pink|brown|clear)\b/gi)]
      .map((match) => match[1].toLowerCase());
    if (colors.length > 1) {
      const sides = Number(pluralMatch[2]);
      return [diceChoice(`listed-${colors.join("-")}-d${sides}`, `Roll ${colors.map(capitalize).join(", ")} d${sides}s`, colors.map((color) => ({ sides, color })))];
    }
  }

  const explicit = [...text.matchAll(/\b(violet|orange|green|yellow|blue|black|red|pink|brown|clear)\s+d(10|12|20)s?\b/gi)];
  if (explicit.length) {
    const dice = explicit.map((match) => ({ sides: Number(match[2]), color: match[1].toLowerCase() }));
    return [diceChoice(`printed-${dice.map((die) => `${die.color}-d${die.sides}`).join("-")}`, `Roll ${dice.map((die) => `${capitalize(die.color)} d${die.sides}`).join(" + ")}`, dice)];
  }

  const brownDie = /\bbrown (?:12-sided )?die\b/i.test(text);
  if (brownDie) return [diceChoice("brown-d12", "Roll Brown d12", [{ sides: 12, color: "brown" }])];

  const generic = text.match(/\bd(4|6|8|10|12|20)s?\b/i);
  if (generic) {
    const sides = Number(generic[1]);
    return [diceChoice(`d${sides}`, `Roll d${sides}`, [{ sides, color: null }])];
  }
  return [];
}

function diceChoice(id, label, dice) {
  return { id, label, dice };
}

function formatDiceResults(results) {
  return results.map((result) => `${result.color ? `${capitalize(result.color)} ` : ""}d${result.sides} = ${result.value}`).join(", ");
}

function isAreaWeapon(card) {
  return [48, 131, 132, 133, 182, 236, 237].includes(Number(card?.number));
}

function beginAreaWeapon(game, pending, attackingPlayerIndex, bunnyId) {
  const affected = buildAreaWeaponAffected(game, pending.card, bunnyId, attackingPlayerIndex)
    .filter((entry) => isCircleEffectReachable(game, bunnyId, entry.bunnyId))
    .map((entry) => {
    const target = findKillerBunnyInCircle(game, entry.bunnyId);
    return target && isIntangibleHologram(target.bunny) && !isHolographicVulnerableTo(pending.card)
      ? { ...entry, protected: true }
      : entry;
  });
  const rollQueue = affected.filter((entry) => !entry.protected).map((entry) => entry.attackId);
  game.phase = "areaWeaponRoll";
  game.pendingAction = {
    ...pending,
    effect: "areaWeapon",
    attackingPlayerIndex,
    targetBunnyId: bunnyId,
    affected,
    rollQueue,
    playerIndex: affected.find((entry) => entry.attackId === rollQueue[0])?.playerIndex ?? attackingPlayerIndex,
  };
  pushLog(game, `${game.players[attackingPlayerIndex].name} launched ${pending.card.name} at ${affected[0]?.name || "the Bunny Circle"}.`);
  return rollQueue.length ? continueAreaWeapon(game) : finishAreaWeapon(game);
}

function continueAreaWeapon(game) {
  const pending = game.pendingAction;
  while (pending.rollQueue.length) {
    const queued = pending.affected.find((entry) => (entry.attackId || entry.bunnyId) === pending.rollQueue[0]);
    if (queued && findKillerBunnyInCircle(game, queued.bunnyId)) break;
    pending.rollQueue.shift();
  }
  if (!pending.rollQueue.length) return finishAreaWeapon(game);
  const current = pending.affected.find((entry) => (entry.attackId || entry.bunnyId) === pending.rollQueue[0]);
  pending.playerIndex = current.playerIndex;
  game.phase = "areaWeaponRoll";
  game.message = `${game.players[current.playerIndex].name}: roll a d12 for ${current.name} against ${pending.card.name} level ${current.power}.`;
  return game;
}

function buildAreaWeaponAffected(game, card, bunnyId, attackingPlayerIndex) {
  const number = Number(card.number);
  if (hasActiveMinilith(game, attackingPlayerIndex, card)) {
    return getKillerBunniesCircleRange(game, bunnyId, 1).map((entry, index) =>
      areaAttackEntry(entry, entry.distance, (card.power || 0) * 2, index));
  }
  if (number === 182) {
    const entries = getKillerBunniesCircleEntries(game);
    const targetIndex = entries.findIndex((entry) => entry.bunny.id === bunnyId);
    if (targetIndex < 0) return [];
    const attacks = [{ entry: entries[targetIndex], distance: 0, power: 11 }];
    // Lower-strength wraparound hits are queued first so a bunny reached from
    // both directions must survive both printed attacks.
    for (const [distance, power] of [[4, 7], [2, 9]]) {
      for (const direction of [-1, 1]) {
        const index = (targetIndex + direction * distance + entries.length * 4) % entries.length;
        attacks.push({ entry: entries[index], distance, power });
      }
    }
    return attacks.map((attack, index) => areaAttackEntry(attack.entry, attack.distance, attack.power, index));
  }

  const maximumDistance = number === 48 ? 2
    : [131, 236].includes(number) ? 1
      : number === 133 ? 3
        : number === 237 ? 4
          : Infinity;
  return getKillerBunniesCircleRange(game, bunnyId, maximumDistance).map((entry, index) => {
    const power = number === 131 ? (entry.distance === 0 ? 10 : 9)
      : number === 132 ? Math.max(0, 11 - entry.distance)
        : number === 236 ? (entry.distance === 0 ? 10 : 9)
          : 12;
    return areaAttackEntry(entry, entry.distance, power, index);
  }).filter((entry) => entry.power > 0);
}

function areaAttackEntry(entry, distance, power, index) {
  return {
    attackId: `${entry.bunny.id}-attack-${index}`,
    bunnyId: entry.bunny.id,
    playerIndex: entry.playerIndex,
    name: entry.bunny.name,
    distance,
    power,
    protected: hasHeavenlyHalo(entry.bunny),
  };
}

function finishAreaWeapon(game) {
  const pending = game.pendingAction;
  return finishUsedWeapon(game, pending);
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
  const hasLivingBunny = (player, index) => player.bunnies.some(isLivingBunny)
    || (game.area51Abducted?.ownerIndex === index && isLivingBunny(game.area51Abducted?.bunny));
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
  const price = getKillerBunniesKaballasPrice(game, playerIndex, pile);
  spendStoreDolla(game, playerIndex, price);
  const [card] = game[`${pile}Supply`].splice(-1);
  player[pile].push(card);
  game.purchases[pile] = true;
  game.message = `${player.name} bought ${pile} for ${price} Dolla. ${game.phase === "draw" ? "Shop again or draw from the main pile." : "You may shop again or flip TOP RUN."}`;
  pushLog(game, `${player.name} bought one ${pile} card for ${price} Dolla.`);
}

function buyCarrot(game, playerIndex, carrotId) {
  const status = getKillerBunniesPileStatus(game, playerIndex, "carrot");
  if (!status.enabled) throw new Error(status.reason);
  const carrotIndex = game.carrotMarket.findIndex((card) => card.id === carrotId);
  if (carrotIndex < 0) throw new Error("That carrot is no longer in the market.");
  const player = game.players[playerIndex];
  const price = getKillerBunniesKaballasPrice(game, playerIndex, "carrot");
  spendStoreDolla(game, playerIndex, price);
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
  if (remaining < 0) player.dollaCredit = (player.dollaCredit || 0) - remaining;
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

  if (Number(card.number) === 207) {
    const recipientIndex = findZepTepiRecipient(game, playerIndex);
    const adjacentIndexes = [...new Set([
      (recipientIndex - 1 + game.players.length) % game.players.length,
      (recipientIndex + 1) % game.players.length,
    ])].filter((index) => index !== recipientIndex);
    const available = adjacentIndexes.flatMap((index) => game.players[index].savedSpecials.map((special) => ({ ownerIndex: index, special })));
    if (!available.length) {
      game.discardPile.push(card);
      return finishImmediateEffect(game, returnState);
    }
    game.phase = "zepTepiChoice";
    game.pendingAction = { playerIndex: recipientIndex, drawingPlayerIndex: playerIndex, effect: "zepTepi", card, adjacentIndexes, ...returnState };
    game.message = `${game.players[recipientIndex].name}: take up to one saved Special or Very Special from each adjacent player.`;
    return game;
  }

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

function isKaballasCouponActive(game, playerIndex) {
  return Number.isInteger(playerIndex)
    && game?.players?.[playerIndex]?.kaballasCouponTurnNumber === game.turnNumber
    && game.currentPlayerIndex === playerIndex;
}

function isRooneysCouponActive(game, playerIndex) {
  return Number.isInteger(playerIndex)
    && game?.players?.[playerIndex]?.rooneysCouponTurnNumber === game.turnNumber
    && game.currentPlayerIndex === playerIndex;
}

function redGleefulStoreCredit(game, playerIndex) {
  const player = game?.players?.[playerIndex];
  if (!player?.bunnies.some((bunny) => Number(bunny.number) === 167 || /^Gleeful Bunny\s*[–-]\s*Red$/i.test(bunny.name || ""))) return 0;
  const spent = player.redGleefulCreditTurnNumber === game.turnNumber ? (player.redGleefulCreditSpent || 0) : 0;
  return Math.max(0, 3 - spent);
}

function availableStoreDolla(game, playerIndex) {
  return bankTotal(game.players[playerIndex]) + redGleefulStoreCredit(game, playerIndex);
}

function spendStoreDolla(game, playerIndex, cost) {
  const player = game.players[playerIndex];
  if (availableStoreDolla(game, playerIndex) < cost) throw new Error(`You need ${cost} Bunny Bucks.`);
  const credit = Math.min(redGleefulStoreCredit(game, playerIndex), cost);
  if (credit) {
    player.redGleefulCreditTurnNumber = game.turnNumber;
    player.redGleefulCreditSpent = (player.redGleefulCreditSpent || 0) + credit;
  }
  if (cost > credit) spendBank(player, cost - credit, game.discardPile);
}

function hasActiveMinilith(game, playerIndex, card) {
  return Number(card?.power) >= 1 && Number(card?.power) <= 9
    && game?.players?.[playerIndex]?.savedSpecials?.some((special) => Number(special.number) === 147)
    && game.players[playerIndex].bunnies.some(isLivingBunny);
}

function isHolographicBunny(bunny) {
  return Number(bunny?.number) === 191 || /Holographic Bunny/i.test(bunny?.name || "");
}

function isIntangibleHologram(bunny) {
  return isHolographicBunny(bunny) && !bunny?.hologramMadeLiving;
}

function isLivingBunny(bunny) {
  return !isHolographicBunny(bunny) || Boolean(bunny?.hologramMadeLiving);
}

function isHolographicVulnerableTo(card) {
  return /Laser Gun|Nuclear Warhead|Miniature Black Hole|Quite Irascible Diffractable Cheese Balls|Bittersweet Chocolate Covered Anti-Matter Raisins|Plutonium|Psychic Waves|Sharks WFLB|Ancient Star Rod/i.test(card?.name || "");
}

function bunnyColors(bunny) {
  const named = [...String(bunny?.name || "").matchAll(/\b(blue|green|orange|yellow|violet|red|pink|white|black|brown)\b/gi)]
    .map((match) => match[1].toLowerCase());
  const stored = Array.isArray(bunny?.colors) ? bunny.colors : [bunny?.color].filter(Boolean);
  return [...new Set([...named, ...stored.map((color) => String(color).toLowerCase())])];
}

function finishUsedWeapon(game, pending, message = "") {
  const ownerIndex = pending.attackingPlayerIndex ?? pending.cardPlayerIndex ?? pending.playerIndex;
  const owner = game.players[ownerIndex];
  const hasReusable = !pending.reusedWithRooney
    && owner?.savedSpecials?.some((card) => Number(card.number) === 81)
    && game.players.some((player, index) => index !== ownerIndex && player.bunnies.some((bunny) => !hasHeavenlyHalo(bunny)));
  if (hasReusable) {
    game.phase = "weaponReuseChoice";
    game.pendingAction = {
      playerIndex: ownerIndex,
      attackingPlayerIndex: ownerIndex,
      effect: "weaponReuseChoice",
      card: pending.card,
      returnPhase: pending.returnPhase,
      resumePlayerIndex: pending.resumePlayerIndex,
      rooneyContinuation: pending.rooneyContinuation,
    };
    game.message = `${owner.name}: use Rooney's Reusables to launch ${pending.card.name} one more time, or keep the card and discard the Weapon.`;
    return game;
  }
  discardUsedWeapon(game, pending.card);
  game.pendingAction = null;
  const continued = continueAfterWeapon(game, pending);
  if (message) continued.message = `${message}${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function continueAfterWeapon(game, pending) {
  if (pending?.rooneyContinuation?.type === "roamingTurn") {
    const continuation = pending.rooneyContinuation;
    return beginRoamingTurnAttack(
      game,
      continuation.remainingRoamingEffects || [],
      continuation.turnEndSummaries || [],
      continuation.turnEndingPlayerIndex,
    );
  }
  return finishPendingEffect(game, pending);
}

function canMagicSpatulaCancel(game) {
  const pending = game?.pendingAction;
  if (game?.phase === "play" && game.barriers?.length) return true;
  if (!pending?.card) return false;
  if (["mysteryUrnRoll", "mysteryUrnDonate", "mysteryUrnFinal", "rainboRoll"].includes(game.phase)) return true;
  if (["target", "defend", "areaWeaponRoll", "roamingTarget", "roamingRoll", "defectorTarget", "defectorRoll", "defectorReroll"].includes(game.phase)) {
    return pending.card.kind === "weapon"
      || [47, 54, 55].includes(Number(pending.card.number))
      || pending.effect === "defectorDetector";
  }
  return game.phase === "utilityBunnyTarget" && [49, 50, 134].includes(Number(pending.card.number));
}

function cancelWithMagicSpatula(game, playerIndex, spatula) {
  if (!canMagicSpatulaCancel(game)) throw new Error("There is no eligible threat for The Magic Spatula to cancel.");
  if (game.phase === "play" && game.barriers?.length) {
    const barriers = game.barriers.splice(0);
    game.discardPile.push(...barriers.map((barrier) => barrier.card), spatula);
    pushLog(game, `${game.players[playerIndex].name} used The Magic Spatula to eliminate all ${barriers.length} Barriers.`);
    return game;
  }
  const pending = game.pendingAction;
  const cancelledCard = pending.card;
  if (["mysteryUrnRoll", "mysteryUrnDonate", "mysteryUrnFinal"].includes(game.phase)) {
    for (const bunny of pending.kittyBunnies || []) discardBunny(game, bunny);
    game.carrotMarket.push(...(pending.kittyCarrots || []));
    game.discardPile.push(cancelledCard, spatula);
    game.pendingAction = null;
    return finishPendingEffect(game, pending);
  }
  if (game.phase === "roamingRoll" && !pending.initialAttack) {
    game.roamingEffects = (game.roamingEffects || []).filter((effect) => effect.id !== pending.roamingId);
    discardRoamingCard(game, cancelledCard);
    game.discardPile.push(spatula);
    pushLog(game, `${game.players[playerIndex].name} used The Magic Spatula to eliminate ${cancelledCard.name}.`);
    return beginRoamingTurnAttack(game, pending.remainingRoamingEffects || [], pending.turnEndSummaries || [], pending.turnEndingPlayerIndex);
  }
  if (cancelledCard.kind === "weapon") discardUsedWeapon(game, cancelledCard);
  else game.discardPile.push(cancelledCard);
  game.discardPile.push(spatula);
  game.pendingAction = null;
  pushLog(game, `${game.players[playerIndex].name} used The Magic Spatula to cancel ${cancelledCard.name} before it resolved.`);
  const continued = finishPendingEffect(game, pending);
  continued.message = `${cancelledCard.name} was cancelled by The Magic Spatula.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function discardBunny(game, bunny, killerPlayerIndex = null) {
  removeKillerBunnyFromCircle(game, bunny.id);
  if (bunny.bounty) {
    if (Number.isInteger(killerPlayerIndex) && game.players[killerPlayerIndex]) {
      game.players[killerPlayerIndex].dollaCredit = (game.players[killerPlayerIndex].dollaCredit || 0) + (bunny.bounty.amount || 0);
      pushLog(game, `${game.players[killerPlayerIndex].name} collected the ${bunny.bounty.amount || 0} Dolla bounty on ${bunny.name}.`);
    }
    game.discardPile.push(...(bunny.bounty.cards || []));
    delete bunny.bounty;
  }
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

const POVERTY_POKER_STAKE_KEYS = [
  "dolla", "cabbage", "water", "defense", "carrots", "bunnies", "specials", "pawns", "zodiacs", "mysteriousPlaces",
];

function normalizePovertyPokerStakes(requested = {}) {
  return Object.fromEntries(POVERTY_POKER_STAKE_KEYS.map((key) => {
    const amount = Number(requested[key] || 0);
    if (!Number.isInteger(amount) || amount < 0 || amount > 99) {
      throw new Error("Every Poverty Poker stake must be a whole number from 0 through 99.");
    }
    return [key, amount];
  }));
}

function createPovertyPokerPot() {
  return {
    dolla: 0,
    cabbage: 0,
    water: 0,
    defense: 0,
    carrots: [],
    bunnies: [],
    specials: [],
    pawns: [],
    zodiacs: [],
    mysteriousPlaces: [],
  };
}

function canCoverPovertyPokerStake(player, stakes) {
  return bankTotal(player) >= stakes.dolla
    && supplyUnitTotal(player, "cabbage") >= stakes.cabbage
    && supplyUnitTotal(player, "water") >= stakes.water
    && defenseUnitTotal(player) >= stakes.defense
    && (player.carrots?.length || 0) >= stakes.carrots
    && (player.bunnies?.length || 0) >= stakes.bunnies
    && (player.savedSpecials?.length || 0) >= stakes.specials
    && (player.pawns?.length || 0) >= stakes.pawns
    && (player.zodiacCards?.length || 0) >= stakes.zodiacs
    && (player.mysteriousPlaces?.length || 0) >= stakes.mysteriousPlaces;
}

function hasAnyPovertyPokerStake(player) {
  return bankTotal(player) > 0
    || supplyUnitTotal(player, "cabbage") > 0
    || supplyUnitTotal(player, "water") > 0
    || defenseUnitTotal(player) > 0
    || ["carrots", "bunnies", "savedSpecials", "pawns", "zodiacCards", "mysteriousPlaces"]
      .some((key) => (player[key]?.length || 0) > 0);
}

function collectPovertyPokerStake(game, playerIndex, selections) {
  const pending = game.pendingAction;
  const { stakes, pot } = pending;
  const player = game.players[playerIndex];
  const carrots = takePovertyPokerCards(player, "carrots", selections.carrotIds, stakes.carrots, "Carrot");
  const specials = takePovertyPokerCards(player, "savedSpecials", selections.specialIds, stakes.specials, "saved Special");
  const pawns = takePovertyPokerCards(player, "pawns", selections.pawnIds, stakes.pawns, "Pawn");
  const zodiacs = takePovertyPokerCards(player, "zodiacCards", selections.zodiacIds, stakes.zodiacs, "Zodiac card");
  const mysteriousPlaces = takePovertyPokerCards(player, "mysteriousPlaces", selections.mysteriousPlaceIds, stakes.mysteriousPlaces, "Mysterious Place");
  const bunnies = takePovertyPokerCards(player, "bunnies", selections.bunnyIds, stakes.bunnies, "bunny");
  const bunnyIds = bunnies.map((bunny) => bunny.id);
  const obligations = (player.feedingObligations || []).filter((entry) => bunnyIds.includes(entry.bunnyId));
  player.feedingObligations = (player.feedingObligations || []).filter((entry) => !bunnyIds.includes(entry.bunnyId));

  spendBank(player, stakes.dolla, game.discardPile);
  spendSupplyUnits(game, player, "cabbage", stakes.cabbage);
  spendSupplyUnits(game, player, "water", stakes.water);
  spendDefenseUnits(player, stakes.defense, game.discardPile);

  pot.dolla += stakes.dolla;
  pot.cabbage += stakes.cabbage;
  pot.water += stakes.water;
  pot.defense += stakes.defense;
  pot.carrots.push(...carrots);
  pot.specials.push(...specials);
  pot.pawns.push(...pawns);
  pot.zodiacs.push(...zodiacs);
  pot.mysteriousPlaces.push(...mysteriousPlaces);
  pot.bunnies.push(...bunnies.map((bunny) => ({ bunny, obligations: obligations.filter((entry) => entry.bunnyId === bunny.id) })));
}

function takePovertyPokerCards(player, sourceKey, selectedIds, requiredCount, label) {
  if (!requiredCount) return [];
  const source = player[sourceKey] || [];
  const uniqueIds = [...new Set(selectedIds || [])];
  if (uniqueIds.length !== requiredCount) throw new Error(`Choose exactly ${requiredCount} ${label}${requiredCount === 1 ? "" : "s"} for Poverty Poker.`);
  const selected = uniqueIds.map((id) => source.find((entry) => entry.id === id));
  if (selected.some((entry) => !entry)) throw new Error(`Every selected ${label} must belong to ${player.name}.`);
  player[sourceKey] = source.filter((entry) => !uniqueIds.includes(entry.id));
  return selected;
}

function completePovertyPokerRollRound(game) {
  const pending = game.pendingAction;
  const contenders = pending.contenderIndexes;
  const highest = Math.max(...contenders.map((index) => pending.scores[index]));
  if (pending.roundNumber === 1 && !pending.optionalRerollResolved) {
    pending.playerIndex = pending.cardPlayerIndex;
    game.phase = "povertyPokerReroll";
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
    game.phase = "povertyPokerRoll";
    game.message = `${winners.map((index) => game.players[index].name).join(" and ")} tied. ${game.players[winners[0]].name}: roll again.`;
    pushLog(game, `${winners.map((index) => game.players[index].name).join(" and ")} tied for the highest Poverty Poker roll.`);
    return game;
  }
  return awardPovertyPokerPot(game, winners[0], highest);
}

function awardPovertyPokerPot(game, winnerIndex, winningRoll) {
  const pending = game.pendingAction;
  const winner = game.players[winnerIndex];
  const pot = pending.pot;
  winner.dollaCredit = (winner.dollaCredit || 0) + pot.dolla;
  winner.resourceCredits ||= { cabbage: 0, water: 0 };
  winner.resourceCredits.cabbage = (winner.resourceCredits.cabbage || 0) + pot.cabbage;
  winner.resourceCredits.water = (winner.resourceCredits.water || 0) + pot.water;
  winner.defenseCredit = (winner.defenseCredit || 0) + pot.defense;
  winner.carrots.push(...pot.carrots);
  winner.savedSpecials.push(...pot.specials);
  winner.pawns.push(...pot.pawns);
  winner.zodiacCards ||= [];
  winner.zodiacCards.push(...pot.zodiacs);
  winner.mysteriousPlaces ||= [];
  winner.mysteriousPlaces.push(...pot.mysteriousPlaces);
  for (const entry of pot.bunnies) {
    winner.bunnies.push(entry.bunny);
    winner.feedingObligations ||= [];
    winner.feedingObligations.push(...entry.obligations);
  }
  ensureKillerBunniesCircle(game);
  game.discardPile.push(pending.card);
  game.pendingAction = null;
  pushLog(game, `${winner.name} won the complete Poverty Poker pot with a roll of ${winningRoll}.`);
  const continued = finishPendingEffect(game, pending);
  continued.message = `${winner.name} won ${formatPovertyPokerStakes(pending.stakes)} from every eligible player with a roll of ${winningRoll}.${continued.phase === "draw" ? " Click the main draw pile." : ""}`;
  return continued;
}

function formatPovertyPokerStakes(stakes) {
  const labels = {
    dolla: "Dolla", cabbage: "Cabbage", water: "Water", defense: "Defense",
    carrots: "Carrot", bunnies: "bunny", specials: "saved Special", pawns: "Pawn",
    zodiacs: "Zodiac card", mysteriousPlaces: "Mysterious Place",
  };
  return POVERTY_POKER_STAKE_KEYS.filter((key) => stakes[key] > 0)
    .map((key) => `${stakes[key]} ${labels[key]}${stakes[key] === 1 || ["dolla", "cabbage", "water", "defense"].includes(key) ? "" : "s"}`)
    .join(" + ");
}

function chooseBotPovertyPokerStakes(game, playerIndex) {
  const player = game.players[playerIndex];
  const candidates = [
    ["dolla", bankTotal(player)],
    ["carrots", player.carrots?.length || 0],
    ["bunnies", player.bunnies?.length || 0],
    ["cabbage", supplyUnitTotal(player, "cabbage")],
    ["water", supplyUnitTotal(player, "water")],
    ["defense", defenseUnitTotal(player)],
    ["specials", player.savedSpecials?.length || 0],
    ["pawns", player.pawns?.length || 0],
  ];
  const shared = candidates.find(([key, count]) => count > 0 && game.players.some((entry, index) => index !== playerIndex
    && canCoverPovertyPokerStake(entry, normalizePovertyPokerStakes({ [key]: 1 }))));
  const chosen = shared || candidates.find(([, count]) => count > 0);
  return chosen ? { [chosen[0]]: 1 } : {};
}

function chooseBotPovertyPokerSelections(game, playerIndex) {
  const player = game.players[playerIndex];
  const stakes = game.pendingAction.stakes;
  return {
    bunnyIds: player.bunnies.slice(0, stakes.bunnies).map((entry) => entry.id),
    carrotIds: player.carrots.slice(0, stakes.carrots).map((entry) => entry.id),
    specialIds: player.savedSpecials.slice(0, stakes.specials).map((entry) => entry.id),
    pawnIds: player.pawns.slice(0, stakes.pawns).map((entry) => entry.id),
    zodiacIds: (player.zodiacCards || []).slice(0, stakes.zodiacs).map((entry) => entry.id),
    mysteriousPlaceIds: (player.mysteriousPlaces || []).slice(0, stakes.mysteriousPlaces).map((entry) => entry.id),
  };
}

const CARD_ACTION_PHASES = new Set([
  "rockBottomChoice", "russianRouletteChoose", "russianRouletteRoll", "russianRouletteReroll",
  "freshnessTarget", "freshnessChoice", "weaponExchange", "feedAllTarget", "minilithActivate",
  "minilithPenalty", "barrierPlace", "barrierRemove", "carrotExchange", "clumsyCongenialTarget",
  "redLightDistrict", "hempRoll", "rooneysCoupon",
  "resourceAttackResponse", "reversalTarget", "showBunnyTarget", "showBunnyExchange",
  "dudePlayerChoice", "dudeGuess", "dudePenalty", "mysteryUrnRoll", "mysteryUrnDonate",
  "mysteryUrnFinal", "bountyTarget", "bountyAmount", "zepTepiChoice", "sinisterBounceTarget",
  "rainboRoll",
  "timidRerollChoice",
]);

function chooseBotCardAction(game, playerIndex) {
  const pending = game.pendingAction;
  switch (game.phase) {
    case "russianRouletteChoose": return { bunnyId: game.players[playerIndex].bunnies.find((bunny) => !hasHeavenlyHalo(bunny))?.id };
    case "russianRouletteReroll": return { choice: "keep" };
    case "freshnessTarget": {
      const target = game.players.findIndex((player, index) => index !== playerIndex && player.carrots.length);
      return { targetPlayerIndex: target };
    }
    case "freshnessChoice": return { carrotIds: game.players[playerIndex].carrots.slice(0, Math.floor(bankTotal(game.players[playerIndex]) / 2)).map((card) => card.id) };
    case "weaponExchange": {
      const ownWeapon = game.players[playerIndex].hand.find((card) => card.kind === "weapon");
      const opponentIndex = game.players.findIndex((player, index) => index !== playerIndex && player.hand.some((card) => card.kind === "weapon"));
      const opponentWeapon = game.players[opponentIndex]?.hand.find((card) => card.kind === "weapon");
      if (opponentWeapon) return { ownWeaponId: ownWeapon?.id, source: "player", targetPlayerIndex: opponentIndex, targetWeaponId: opponentWeapon.id };
      return { ownWeaponId: ownWeapon?.id, source: "rooneys", targetWeaponId: game.rooneysEmporium?.weaponDiscard[0]?.id };
    }
    case "feedAllTarget": return { targetPlayerIndex: game.players.findIndex((player, index) => index !== playerIndex && player.bunnies.length) };
    case "minilithActivate": {
      const targetPlayerIndex = game.players.findIndex((player, index) => index !== playerIndex
        && [...player.savedSpecials, ...player.hand].some((card) => Number(card.number) === 147));
      return { targetPlayerIndex, mode: "steal" };
    }
    case "minilithPenalty": {
      const target = game.players[playerIndex];
      const count = Math.min(pending.evenCount, target.carrots.length + target.bunnies.length);
      return {
        carrotIds: target.carrots.slice(0, count).map((card) => card.id),
        bunnyIds: target.bunnies.slice(0, Math.max(0, count - target.carrots.length)).map((bunny) => bunny.id),
      };
    }
    case "barrierPlace": return { leftPlayerIndex: playerIndex };
    case "barrierRemove": return { barrierId: game.barriers?.[0]?.id };
    case "carrotExchange": {
      const targetPlayerIndex = game.players.findIndex((player, index) => index !== playerIndex && player.carrots.length >= 2);
      return { ownCarrotId: game.players[playerIndex].carrots[0]?.id, targetPlayerIndex, targetCarrotIds: game.players[targetPlayerIndex]?.carrots.slice(0, 2).map((card) => card.id) || [] };
    }
    case "clumsyCongenialTarget": return { bunnyId: game.players.flatMap((player) => player.bunnies).find((bunny) => /Congenial Bunny/i.test(bunny.name))?.id };
    case "redLightDistrict": {
      const targetPlayerIndex = game.players.findIndex((player, index) => index !== playerIndex && player.bunnies.some((bunny) => bunnyColors(bunny).includes("red")));
      return { targetPlayerIndex, itemId: game.players[targetPlayerIndex]?.bunnies.find((bunny) => bunnyColors(bunny).includes("red"))?.id };
    }
    case "resourceAttackResponse": return { choice: "accept" };
    case "reversalTarget": {
      const target = findBotTarget(game, pending.weaponPending?.attackingPlayerIndex ?? playerIndex);
      return { targetPlayerIndex: target?.playerIndex, bunnyId: target?.bunny.id };
    }
    case "showBunnyTarget": return { targetPlayerIndex: (playerIndex + 1) % game.players.length };
    case "showBunnyExchange": return { choice: "pass" };
    case "dudePlayerChoice": return { targetPlayerIndex: game.players.findIndex((player) => player.carrots.length), dieSides: 12 };
    case "dudeGuess": return { owner: "market" };
    case "dudePenalty": return { carrotId: game.players[playerIndex].carrots[0]?.id };
    case "mysteryUrnDonate": return game.players[playerIndex].carrots.length
      ? { carrotId: game.players[playerIndex].carrots[0].id }
      : { bunnyId: game.players[playerIndex].bunnies[0]?.id };
    case "bountyTarget": return { bunnyId: getKillerBunniesCircleEntries(game)[0]?.bunny.id };
    case "bountyAmount": return { amount: Math.min(1, bankTotal(game.players[playerIndex])) };
    case "zepTepiChoice": return { specialIds: pending.adjacentIndexes.flatMap((index) => game.players[index].savedSpecials.slice(0, 1).map((card) => card.id)) };
    case "sinisterBounceTarget": return { bunnyId: game.players[pending.attackingPlayerIndex].bunnies[0]?.id };
    case "timidRerollChoice": return { choice: "keep" };
    default: return {};
  }
}

function supplyUnitTotal(player, resource) {
  const cards = player?.[resource] || [];
  const credit = player?.resourceCredits?.[resource] || 0;
  return credit + cards.reduce((total, card) => total + (Number.isFinite(card.units) ? card.units : 1), 0);
}

function defenseUnitTotal(player) {
  return (player?.defenseCredit || 0) + (player?.defenseCards || []).reduce((total, card) => total + (card.units || 1), 0);
}

function spendDefenseUnits(player, requiredUnits, discardPile) {
  if (requiredUnits <= 0) return;
  if (defenseUnitTotal(player) < requiredUnits) throw new Error(`You need ${requiredUnits} Defense units.`);
  const creditSpent = Math.min(player.defenseCredit || 0, requiredUnits);
  player.defenseCredit = (player.defenseCredit || 0) - creditSpent;
  let remaining = requiredUnits - creditSpent;
  player.defenseCards.sort((a, b) => a.units - b.units);
  while (remaining > 0) {
    const card = player.defenseCards.shift();
    remaining -= card.units || 1;
    discardPile.push(card);
  }
  if (remaining < 0) player.defenseCredit = (player.defenseCredit || 0) - remaining;
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
  spendDefenseUnits(player, requiredUnits, discardPile);
}

function clone(value) { return structuredClone(value); }
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
const shuffle = shuffled;
function removeFirst(values, predicate) {
  const index = values.findIndex(predicate);
  if (index < 0) return null;
  return values.splice(index, 1)[0];
}
function moveCards(source, destination, count) {
  if (count > 0) destination.push(...source.splice(-count));
}
function rollDie(sides, random) { return 1 + Math.floor(random() * sides); }
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
