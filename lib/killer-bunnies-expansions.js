import { KILLER_BUNNIES_DECK_CATALOG } from "./killer-bunnies-card-catalog.js";
import { createKillerBunniesCatalogDeckContent } from "./killer-bunnies-card-adapter.js";

const BASE_DECK_IDS = new Set(["blue", "yellow"]);

const SIGNATURES = Object.freeze({
  red: "Red bunnies, weapons, defenses, and Rooney’s Weapons Emporium",
  violet: "Specialty bunnies and unpredictable lucky effects",
  orange: "Resource swings, market tricks, and Weil’s Pawn Shop",
  green: "Half-color bunnies and zodiac-inspired surprises",
  "twilight-white": "Dual-color bunnies and fifty-fifty weapons",
  "stainless-steel": "Super bunnies and dated weapons",
  "perfectly-pink": "Pink bunnies and enlisted ranks",
  "wacky-khaki": "Officer ranks and demanding feeding cards",
  "ominous-onyx": "110 cards with celebrity bunnies and ominous attacks",
  chocolate: "A promotional collection of bunnies and surprises",
  "conquest-blue": "110-card Conquest starter with two stores",
  "conquest-yellow": "Conquest bunnies, carrots, and actions",
  "conquest-red": "Conquest weapons and Rooney’s second store",
  "conquest-violet": "Conquest specialty bunnies and carrots",
  fantastic: "Fantasy bunnies, enchanted defenses, and rewards",
  "caramel-swirl": "Swirled market prices and tactical cards",
  "creature-feature": "Creature companions and animal-inspired hazards",
  "pumpkin-spice": "Autumn bunnies and harvest-season market chaos",
  "la-di-da-london": "London travelers, stations, and proper mayhem",
  "cake-batter": "Pastry-powered bunnies and bakery calamities",
  "radioactive-robots": "Robot bunnies and high-energy hazards",
  "almond-crisp": "Powerful bunnies, wild effects, and Weil’s second store",
});

export const KILLER_BUNNIES_EXPANSIONS = Object.freeze(
  KILLER_BUNNIES_DECK_CATALOG
    .filter((deck) => !BASE_DECK_IDS.has(deck.id))
    .map((deck, index) => createExpansion(deck, index + 3)),
);

export const KILLER_BUNNIES_EXPANSION_CARD_COUNTS = Object.freeze({
  standardNumbered: 55,
  doubleNumbered: 110,
});

export function normalizeKillerBunniesExpansionIds(expansionIds) {
  const requested = new Set(Array.isArray(expansionIds) ? expansionIds : []);
  return KILLER_BUNNIES_EXPANSIONS.filter((entry) => requested.has(entry.id)).map((entry) => entry.id);
}

export function getKillerBunniesExpansionSummary(expansionIds) {
  const selectedIds = normalizeKillerBunniesExpansionIds(expansionIds);
  const selectedPacks = KILLER_BUNNIES_EXPANSIONS.filter((entry) => selectedIds.includes(entry.id));
  return {
    selectedIds,
    packCount: selectedIds.length,
    addedCards: sum(selectedPacks, (entry) => entry.cardCounts.numbered),
    numberedCards: sum(selectedPacks, (entry) => entry.cardCounts.numbered),
    mainDeckCards: sum(selectedPacks, (entry) => entry.cardCounts.mainDeck),
    carrotCards: sum(selectedPacks, (entry) => entry.cardCounts.carrotMarket),
    starterCards: sum(selectedPacks, (entry) => entry.cardCounts.starterCards),
  };
}

export function createKillerBunniesExpansionContent(expansionIds) {
  const selected = new Set(normalizeKillerBunniesExpansionIds(expansionIds));
  const content = { mainDeck: [], carrotMarket: [], magicCarrots: [], starterCards: [], numberedCards: 0, shops: [] };

  for (const entry of KILLER_BUNNIES_EXPANSIONS) {
    if (!selected.has(entry.id)) continue;
    const deckContent = createKillerBunniesCatalogDeckContent(entry.id);
    content.mainDeck.push(...deckContent.mainDeck);
    content.carrotMarket.push(...deckContent.carrotMarket);
    content.magicCarrots.push(...deckContent.magicCarrots);
    content.starterCards.push(...deckContent.starterCards);
    content.numberedCards += deckContent.numberedCards;
    content.shops.push(...entry.shops);
  }

  content.shops = [...new Set(content.shops)];
  return content;
}

function createExpansion(deck, order) {
  const content = createKillerBunniesCatalogDeckContent(deck.id);
  return Object.freeze({
    id: deck.id,
    order,
    name: deck.name.replace(/ Deck$/, ""),
    series: seriesLabel(deck.series),
    color: deck.color,
    signature: SIGNATURES[deck.id] || `The ${deck.name} official numbered card list`,
    shortLabel: deck.name.split(" ")[0].slice(0, 2).toUpperCase(),
    gameColor: gameColorFor(deck.id),
    shops: shopsFor(deck.id),
    cardCounts: Object.freeze({
      mainDeck: content.mainDeck.length,
      carrotMarket: content.carrotMarket.length,
      magicCarrots: content.magicCarrots.length,
      starterCards: content.starterCards.length,
      numbered: deck.cardCount,
      total: deck.cardCount,
    }),
  });
}

function shopsFor(deckId) {
  const shops = [];
  if (deckId === "red" || deckId === "conquest-red") shops.push("rooneys");
  if (deckId === "orange" || deckId === "almond-crisp") shops.push("weils");
  return shops;
}

function seriesLabel(series) {
  if (series === "Quest Series One") return "Series One";
  if (series === "Quest Series Two") return "Series Two";
  return series;
}

function sum(entries, getValue) {
  return entries.reduce((total, entry) => total + getValue(entry), 0);
}

function gameColorFor(id) {
  if (id.includes("red")) return "red";
  if (id.includes("green") || id.includes("robot") || id.includes("creature")) return "green";
  if (id.includes("violet") || id.includes("onyx") || id.includes("fantastic")) return "violet";
  if (id.includes("pink")) return "pink";
  if (id.includes("white") || id.includes("steel")) return "blue";
  if (id.includes("pumpkin") || id.includes("orange")) return "orange";
  return "yellow";
}
