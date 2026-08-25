import {
  getKillerBunniesCatalogCardsForDeck,
} from "./killer-bunnies-card-catalog.js";

const CARROT_COLORS = ["orange", "yellow", "green", "blue", "violet", "red"];
const ZODIAC_PROFILES = Object.freeze([
  ["Aries", "fire"], ["Taurus", "earth"], ["Gemini", "air"], ["Cancer", "water"],
  ["Leo", "fire"], ["Virgo", "earth"], ["Libra", "air"], ["Scorpio", "water"],
  ["Sagittarius", "fire"], ["Capricorn", "earth"], ["Aquarius", "air"], ["Pisces", "water"],
]);

export function isKillerBunniesStarterCard(card) {
  return /\(Starter Card\)/i.test(card?.name || "");
}

export function createKillerBunniesCatalogDeckContent(deckId) {
  const catalogCards = getKillerBunniesCatalogCardsForDeck(deckId);
  const carrotCards = catalogCards.filter((card) => card.kind === "carrot");
  const starterCards = catalogCards
    .filter(isKillerBunniesStarterCard)
    .map(createKillerBunniesStarterCard);
  const mainDeck = catalogCards
    .filter((card) => card.kind !== "carrot" && !isKillerBunniesStarterCard(card))
    .map(createKillerBunniesPlayableCard);

  return {
    numberedCards: catalogCards.length,
    mainDeck,
    carrotMarket: carrotCards.map(createKillerBunniesMarketCarrot),
    magicCarrots: carrotCards.map(createKillerBunniesMagicCarrot),
    starterCards,
  };
}

export function createKillerBunniesPlayableCard(catalogCard) {
  const common = catalogIdentity(catalogCard);

  if (/^Everyone Feed A Bunny\b/i.test(catalogCard.name)) {
    const costs = catalogCard.costs || resourceCostsFromName(catalogCard.name);
    const supported = !costs.radish && !costs.milk;
    return supported
      ? {
          ...common,
          kind: "everyoneFeed",
          originalKind: catalogCard.kind,
          type: "RUN",
          cabbageCost: costs.cabbage || 0,
          waterCost: costs.water || 0,
          costs,
          detail: catalogCard.detail,
        }
      : unsupportedAction(catalogCard, "everyoneFeed");
  }

  if (catalogCard.type === "PLAY IMMEDIATELY") {
    return {
      ...common,
      kind: "misfortune",
      originalKind: catalogCard.kind,
      type: "PLAY IMMEDIATELY",
      color: catalogCard.color,
      detail: catalogCard.detail,
      effectImplemented: false,
    };
  }

  if (catalogCard.type === "SPECIAL" || catalogCard.type === "VERY SPECIAL") {
    return {
      ...common,
      kind: catalogCard.kind === "modifier" ? "modifier" : "action",
      originalKind: catalogCard.kind,
      type: catalogCard.type,
      color: catalogCard.color,
      detail: catalogCard.detail,
      effectImplemented: false,
    };
  }

  const zodiacIndex = ZODIAC_PROFILES.findIndex(([sign]) => sign === catalogCard.name);
  if (zodiacIndex >= 0) {
    const [sign, element] = ZODIAC_PROFILES[zodiacIndex];
    return { ...common, kind: "zodiac", type: "ZODIAC", sign, element, zodiacIndex, detail: catalogCard.detail };
  }

  if (catalogCard.kind === "bunny") {
    return { ...common, kind: "bunny", type: "RUN", color: catalogCard.color || inferredBunnyColor(catalogCard), ...tripletMetadata(catalogCard), detail: catalogCard.detail };
  }
  if (catalogCard.kind === "chooseCarrot") {
    return { ...common, kind: "chooseCarrot", type: "RUN", carrotCount: catalogCard.carrotCount || 1, detail: catalogCard.detail };
  }
  if (catalogCard.kind === "feed") {
    const costs = catalogCard.costs || {};
    const supported = !costs.radish && !costs.milk && !catalogCard.randomCost;
    if ([286, 342].includes(catalogCard.number)) {
      return { ...common, kind: "feed", type: "RUN", cabbageCost: null, waterCost: null, randomCost: true, costs, detail: catalogCard.detail };
    }
    return supported
      ? { ...common, kind: "feed", type: "RUN", cabbageCost: costs.cabbage || 0, waterCost: costs.water || 0, costs, detail: catalogCard.detail }
      : unsupportedAction(catalogCard, "feed");
  }
  if (catalogCard.kind === "weapon") {
    if (catalogCard.number === 347) {
      return { ...common, kind: "weapon", type: "RUN", power: 1, defensePower: 7, diceColors: ["violet", "orange", "green", "yellow", "blue", "black", "red"], detail: catalogCard.detail };
    }
    return Number.isFinite(catalogCard.power)
      ? { ...common, kind: "weapon", type: "RUN", power: catalogCard.power, weaponLevel: catalogCard.weaponLevel, detail: catalogCard.detail }
      : unsupportedAction(catalogCard, "weapon");
  }
  if (catalogCard.kind === "money") {
    return { ...common, kind: "money", type: "CURRENCY", value: catalogCard.value || 0, randomValue: catalogCard.number === 329, detail: catalogCard.detail };
  }
  if (catalogCard.kind === "misfortune") {
    return { ...common, kind: "misfortune", type: "PLAY IMMEDIATELY", detail: catalogCard.detail, effectImplemented: false };
  }
  if (catalogCard.kind === "modifier") {
    return { ...common, kind: "modifier", originalKind: "modifier", type: "RUN", color: catalogCard.color, detail: catalogCard.detail };
  }

  const market = marketBehavior(catalogCard);
  if (market) return { ...common, ...market };

  return {
    ...common,
    kind: "action",
    originalKind: catalogCard.kind,
    type: "RUN",
    detail: catalogCard.detail,
    effectImplemented: false,
  };
}

function resourceCostsFromName(name) {
  const costs = {};
  for (const match of String(name).matchAll(/(\d+)\s+(cabbage|water|radish|milk)/gi)) {
    costs[match[2].toLowerCase()] = Number(match[1]);
  }
  return costs;
}

function inferredBunnyColor(card) {
  if (/holographic bunny/i.test(card.name)) return "red";
  if (/^enginerds$/i.test(card.name)) return "green";
  return null;
}

function tripletMetadata(card) {
  const name = String(card.name || "");
  const tripletFamily = /\bspecialty bunny\b/i.test(name) ? "specialty"
    : /\bcelebrity bunny\b/i.test(name) ? "celebrity"
      : /\bbritish bunny\b/i.test(name) ? "british" : null;
  const tripletUnits = /\bquintet\b/i.test(name) ? 5
    : /\b(?:triple|triplet)\b/i.test(name) ? 3
      : /\b(?:double|pair)\b/i.test(name) ? 2 : 1;
  return tripletFamily ? { tripletFamily, tripletUnits } : {};
}

export function createKillerBunniesMarketCarrot(catalogCard) {
  return {
    ...catalogIdentity(catalogCard),
    kind: "carrot",
    type: "MARKET",
    label: String(catalogCard.carrotNumber),
    carrotKey: `carrot-${catalogCard.carrotNumber}`,
    color: catalogCard.color || CARROT_COLORS[(catalogCard.carrotNumber - 1) % CARROT_COLORS.length],
    detail: catalogCard.detail,
  };
}

export function createKillerBunniesMagicCarrot(catalogCard) {
  const { number: _number, catalogNumber: _catalogNumber, ...marketCarrot } = createKillerBunniesMarketCarrot(catalogCard);
  return {
    ...marketCarrot,
    id: `magic-${catalogCard.id}`,
    kind: "magicCarrot",
    type: "MAGIC",
    name: `Hidden ${catalogCard.name}`,
    matchedCatalogNumber: catalogCard.catalogNumber,
    detail: `Matches ${catalogCard.name}. Reveal it only when the game ends.`,
  };
}

export function createKillerBunniesStarterCard(catalogCard) {
  const common = catalogIdentity(catalogCard);
  if (/Kaballa/i.test(catalogCard.name)) {
    return { ...common, kind: "marketStarter", type: "STARTER CARD", shop: "kaballas", isOpen: true, prices: { cabbage: 3, water: 3, carrot: 10 }, detail: "Starting prices: 3 Dolla per Cabbage Card, 3 Dolla per Water Card, and 10 Dolla per Carrot." };
  }
  if (/Rooney/i.test(catalogCard.name)) {
    return { ...common, kind: "marketStarter", type: "STARTER CARD", shop: "rooneys", isOpen: true, defensePrice: 3, detail: "Defense Cards cost 3 Dolla. Used Weapon Cards cost their printed Weapon Level and must be run through." };
  }
  if (/Weil/i.test(catalogCard.name)) {
    return { ...common, kind: "marketStarter", type: "STARTER CARD", shop: "weils", isOpen: true, pawnPrice: 5, bunnyPrice: 10, detail: "Colored Pawns cost 5 Dolla. Discarded bunnies cost 10 Dolla and must be run through." };
  }
  return { ...common, kind: "marketStarter", type: "STARTER CARD", isOpen: true, detail: catalogCard.detail };
}

function catalogIdentity(card) {
  return {
    id: card.id,
    number: card.number,
    catalogNumber: card.catalogNumber,
    name: card.name,
    packId: card.deckId,
    packName: card.deckName,
    backColor: card.deckColor,
    source: card.source,
    confidence: card.confidence,
    ability: card.ability,
    requirements: card.requirements,
    requiresBunny: card.requiresBunny,
    resolutionStatus: card.resolutionStatus,
    rulesSourceUrl: card.rulesSourceUrl,
    rulesSourceLabel: card.rulesSourceLabel,
    communitySourceUrl: card.communitySourceUrl,
    communitySourceLabel: card.communitySourceLabel,
    abilitySource: card.abilitySource,
    cloverValue: card.cloverValue || 0,
  };
}

function unsupportedAction(card, originalKind) {
  return {
    ...catalogIdentity(card),
    kind: "action",
    originalKind,
    type: "RUN",
    detail: card.detail,
    effectImplemented: false,
  };
}

function marketBehavior(card) {
  const name = card.name;
  if (/^All Stores Open$/i.test(name)) {
    return { kind: "allStoresOpen", type: "RUN", detail: "Restore Kaballa’s Market, Rooney’s Weapons Emporium, and Weil’s Pawn Shop to their starter cards and prices." };
  }
  if (/Kaballa.+\(Closed\)/i.test(name)) {
    return { kind: "market", type: "RUN", marketOpen: false, detail: "Close Kaballa’s Market until another market card reopens it." };
  }
  if (/Kaballa.+\(High\)/i.test(name)) {
    return { kind: "market", type: "RUN", marketOpen: true, prices: { cabbage: 5, water: 5, carrot: 15 }, detail: "Open Kaballa’s Market at its high-price setting." };
  }
  if (/Kaballa.+\(Low\)/i.test(name)) {
    return { kind: "market", type: "RUN", marketOpen: true, prices: { cabbage: 2, water: 2, carrot: 8 }, detail: "Open Kaballa’s Market at its low-price setting." };
  }
  if (/Rooney.+\(Closed\)/i.test(name)) {
    return { kind: "shopMarket", type: "RUN", shop: "rooneys", shopOpen: false, detail: "Close Rooney’s Weapons Emporium until a card reopens it." };
  }
  if (/Rooney.+\(High\)/i.test(name)) {
    return { kind: "shopMarket", type: "RUN", shop: "rooneys", shopOpen: true, defensePrice: 5, weaponPriceMode: "level", detail: "Open Rooney’s Weapons Emporium. Defense Cards cost 5 Dolla and used Weapons cost their printed level." };
  }
  if (/Rooney.+\(Low\)/i.test(name)) {
    return { kind: "shopMarket", type: "RUN", shop: "rooneys", shopOpen: true, defensePrice: 1, weaponPriceMode: "half-level", detail: "Open Rooney’s Weapons Emporium. Defense Cards cost 1 Dolla and used Weapons cost half their printed level, rounded up." };
  }
  if (/Weil.+\(Closed\)/i.test(name)) {
    return { kind: "shopMarket", type: "RUN", shop: "weils", shopOpen: false, detail: "Close Weil’s Pawn Shop until a card reopens it." };
  }
  if (/Weil.+\(High\)/i.test(name)) {
    return { kind: "shopMarket", type: "RUN", shop: "weils", shopOpen: true, pawnPrice: 7, bunnyPrice: 12, detail: "Open Weil’s Pawn Shop. Pawns cost 7 Dolla and discarded bunnies cost 12 Dolla." };
  }
  return null;
}
