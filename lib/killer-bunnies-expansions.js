export const KILLER_BUNNIES_EXPANSION_CARD_COUNTS = Object.freeze({
  mainDeck: 12,
  carrotMarket: 1,
  magicCarrots: 1,
  cabbage: 2,
  water: 2,
  total: 18,
});

export const KILLER_BUNNIES_EXPANSIONS = Object.freeze([
  pack("red", 3, "Red Booster", "Series One", "#b9473f", "Red bunnies, stronger weapons, and extra defenses", ["Crimson Cadet", "Scarlet Scout"], ["Pepper Popper", "Ruby Rake"]),
  pack("violet", 4, "Violet Booster", "Series One", "#7753a6", "Specialty bunnies and unpredictable lucky effects", ["Violet Virtuoso", "Purple Prodigy"], ["Plum Pummeler", "Lavender Launcher"]),
  pack("orange", 5, "Orange Booster", "Series One", "#e47d2c", "Pawn-shop flavor, resource swings, and market tricks", ["Orange Operator", "Tangerine Trader"], ["Citrus Cannon", "Marmalade Mallet"]),
  pack("green", 6, "Green Booster", "Series One", "#4d8d52", "Half-color bunnies and zodiac-inspired surprises", ["Green Stargazer", "Emerald Oracle"], ["Comet Clippers", "Zodiac Zapper"]),
  pack("twilight-white", 7, "Twilight White Booster", "Series One", "#d8d5ca", "Dual-color bunnies and risky fifty-fifty weapons", ["Twilight Hopper", "Moonlit Mischief"], ["Coin-Flip Flail", "Starlight Slingshot"]),
  pack("stainless-steel", 8, "Stainless Steel Booster", "Series One", "#8f9aa0", "Super bunnies and heavy-duty dated weapons", ["Steel Sentinel", "Chrome Champion"], ["Calendar Cannon", "Riveting Riveter"]),
  pack("perfectly-pink", 9, "Perfectly Pink Booster", "Series One", "#d7659a", "Pink bunnies, enlisted ranks, and disciplined defenses", ["Pink Private", "Rose Recruit"], ["Parade Popper", "Rosy Rammer"]),
  pack("wacky-khaki", 10, "Wacky Khaki Booster", "Series One", "#a59463", "Officer ranks and unusually demanding feeding cards", ["Khaki Captain", "Tan Tactician"], ["Brass Button Blaster", "Canteen Catapult"]),
  pack("ominous-onyx", 11, "Ominous Onyx Booster", "Series One", "#34343a", "Celebrity bunnies, strange places, and ominous attacks", ["Onyx Celebrity", "Midnight Marvel"], ["Blackout Blaster", "Shadow Shovel"]),
  pack("chocolate", 12, "Chocolate Booster", "Series One", "#744b35", "A rich assortment of promotional-style surprises", ["Cocoa Courier", "Truffle Troublemaker"], ["Cocoa Crusher", "Fudge Flopper"]),
  pack("fantastic", 17, "Fantastic Booster", "Series Two", "#3e8791", "Fantasy bunnies, enchanted defenses, and bold rewards", ["Fantastic Familiar", "Mystic Messenger"], ["Dragonfly Dart", "Wizard Whisk"]),
  pack("caramel-swirl", 18, "Caramel Swirl Booster", "Series Two", "#bd7c45", "Swirled market prices and sticky tactical cards", ["Caramel Courier", "Swirl Scout"], ["Toffee Trebuchet", "Sticky Spoon"]),
  pack("creature-feature", 19, "Creature Feature Booster", "Series Two", "#568052", "Creature companions and animal-inspired hazards", ["Creature Keeper", "Wildlife Warden"], ["Badger Bouncer", "Pheasant Flinger"]),
  pack("pumpkin-spice", 20, "Pumpkin Spice Booster", "Series Two", "#c66d2f", "Autumn bunnies and harvest-season market chaos", ["Pumpkin Patroller", "Harvest Hopper"], ["Gourd Grenade", "Cider Sprayer"]),
  pack("la-di-da-london", 21, "La-Di-Da London Booster", "Series Two", "#8c4a48", "London travelers, clever stations, and proper mayhem", ["London Lookout", "Dapper Dasher"], ["Teapot Tosser", "Brolly Blaster"]),
  pack("cake-batter", 22, "Cake Batter Booster", "Series Two", "#d6ae6b", "Pastry-powered bunnies and bakery calamities", ["Batter Baker", "Soufflé Scout"], ["Cupcake Cannon", "Rolling Pin"]),
  pack("radioactive-robots", 23, "Radioactive Robots Booster", "Series Two", "#70a95d", "Robot bunnies and high-energy mechanical hazards", ["Robot Rabbit", "Atomic Automaton"], ["Fusion Flipper", "Circuit Smasher"]),
  pack("almond-crisp", 24, "Almond Crisp Booster", "Series Two", "#b68b61", "A crisp finale of powerful bunnies and wild effects", ["Almond Ace", "Crisp Commander"], ["Nutcracker", "Praline Piston"]),
]);

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
    addedCards: selectedPacks.reduce((total, entry) => total + entry.cardCounts.total, 0),
    mainDeckCards: selectedIds.length * KILLER_BUNNIES_EXPANSION_CARD_COUNTS.mainDeck,
  };
}

export function createKillerBunniesExpansionContent(expansionIds) {
  const selected = new Set(normalizeKillerBunniesExpansionIds(expansionIds));
  const content = { mainDeck: [], carrotMarket: [], magicCarrots: [], cabbage: [], water: [] };
  KILLER_BUNNIES_EXPANSIONS.filter((entry) => selected.has(entry.id)).forEach((entry, packIndex) => {
    content.mainDeck.push(...createPackMainCards(entry, packIndex));
    const carrotKey = `expansion-carrot-${entry.id}`;
    const carrot = {
      id: `market-${carrotKey}`,
      kind: "carrot",
      type: "MARKET",
      name: `${entry.name} Carrot`,
      label: entry.shortLabel,
      carrotKey,
      color: entry.gameColor,
      packId: entry.id,
      packName: entry.name,
      detail: `A bonus carrot added by the ${entry.name}.`,
    };
    content.carrotMarket.push(carrot);
    content.magicCarrots.push({
      ...carrot,
      id: `magic-${carrotKey}`,
      kind: "magicCarrot",
      type: "MAGIC",
      name: `Hidden ${entry.name} Carrot`,
      detail: `Matches the bonus carrot from the ${entry.name}.`,
    });
    for (let copy = 1; copy <= 2; copy += 1) {
      content.cabbage.push(supplyCard(entry, "cabbage", copy));
      content.water.push(supplyCard(entry, "water", copy));
    }
  });
  return content;
}

function createPackMainCards(entry, packIndex) {
  const colors = [entry.gameColor, "blue", "green", "orange"];
  const cards = [];
  for (let index = 0; index < 4; index += 1) {
    cards.push(expansionCard(entry, `bunny-${index + 1}`, {
      kind: "bunny",
      type: "RUN",
      name: `${entry.bunnyNames[index % entry.bunnyNames.length]} ${index + 1}`,
      color: colors[index],
      trait: entry.signature,
      detail: `${entry.signature}. Joins your Bunny Circle and keeps you eligible to win.`,
    }));
  }
  entry.weaponNames.forEach((name, index) => cards.push(expansionCard(entry, `weapon-${index + 1}`, {
    kind: "weapon",
    type: "RUN",
    name,
    power: 7 + ((entry.order + index * 2) % 6),
    detail: "Choose an opposing bunny and roll the d12 to resolve this booster weapon.",
  })));
  for (let copy = 1; copy <= 2; copy += 1) cards.push(expansionCard(entry, `carrot-${copy}`, {
    kind: "chooseCarrot",
    type: "RUN",
    name: copy === 1 ? `${entry.name} Carrot Grab` : `${entry.name} Market Dash`,
    detail: "Choose one face-up carrot from Kaballa’s Market at no cost, even if it is closed.",
  }));
  cards.push(expansionCard(entry, "feed", {
    kind: "feed",
    type: "RUN",
    name: `${entry.name} Feed the Bunny`,
    cabbageCost: 1 + (entry.order % 3),
    waterCost: 1 + ((entry.order + 1) % 3),
    detail: "An opposing bunny must pay the listed cabbage and water or leave play.",
  }));
  cards.push(expansionCard(entry, "defense", {
    kind: "defense",
    type: "SPECIAL",
    name: `${entry.name} Safe House`,
    detail: "Prepare a shield that blocks the next attack or feeding failure.",
  }));
  const effects = ["resupply", "cashCrop", "burrow", "goldenCarrot"];
  const effect = effects[packIndex % effects.length];
  cards.push(expansionCard(entry, "feature", {
    kind: effect === "burrow" || effect === "goldenCarrot" ? "verySpecial" : "special",
    type: effect === "burrow" || effect === "goldenCarrot" ? "VERY SPECIAL" : "SPECIAL",
    name: `${entry.name} Feature Card`,
    effect,
    detail: featureDetail(effect),
  }));
  const priceShift = packIndex % 3;
  cards.push(expansionCard(entry, "market", entry.id === "red" ? {
    kind: "shopMarket",
    type: "RUN",
    name: "Rooney’s Weapons Emporium Closed",
    shop: "rooneys",
    shopOpen: false,
    detail: "Close Rooney’s Weapons Emporium. Used weapons and Defense Cards cannot be purchased until it reopens.",
  } : entry.id === "orange" ? {
    kind: "shopMarket",
    type: "RUN",
    name: "Weil’s Pawn Shop Closed",
    shop: "weils",
    shopOpen: false,
    detail: "Close Weil’s Pawn Shop. Pawns and discarded bunnies cannot be purchased until it reopens.",
  } : {
    kind: "market",
    type: "RUN",
    name: `${entry.name} Market Prices`,
    marketOpen: true,
    prices: {
      cabbage: [2, 4, 3][priceShift],
      water: [4, 2, 3][priceShift],
      carrot: [10, 8, 12][priceShift],
    },
    detail: "Reopen Kaballa’s Market with this booster pack’s prices.",
  }));
  return cards;
}

function expansionCard(entry, suffix, values) {
  return { id: `exp-${entry.id}-${suffix}`, packId: entry.id, packName: entry.name, backColor: entry.color, ...values };
}

function supplyCard(entry, kind, copy) {
  return {
    id: `exp-${entry.id}-${kind}-${copy}`,
    kind,
    type: "SUPPLY",
    name: `${entry.name} ${kind === "water" ? "Water" : "Cabbage"}`,
    packId: entry.id,
    packName: entry.name,
    detail: "Spend this card when a bunny needs feeding.",
  };
}

function featureDetail(effect) {
  return {
    resupply: "Take one cabbage card and one water card if Kaballa’s Market is open.",
    cashCrop: "Harvest one Kaballa Dolla card from the main deck.",
    burrow: "Prepare a shield against the next threat.",
    goldenCarrot: "Choose one face-up carrot from the market at no cost.",
  }[effect];
}

function pack(id, order, name, series, color, signature, bunnyNames, weaponNames) {
  const shopExtraCards = id === "red" ? 7 : id === "orange" ? 1 : 0;
  return {
    id, order, name, series, color, signature, bunnyNames, weaponNames,
    shortLabel: name.split(" ")[0].slice(0, 2).toUpperCase(),
    gameColor: gameColorFor(id),
    shops: id === "red" ? ["rooneys"] : id === "orange" ? ["weils"] : [],
    cardCounts: {
      ...KILLER_BUNNIES_EXPANSION_CARD_COUNTS,
      shopCards: shopExtraCards,
      total: KILLER_BUNNIES_EXPANSION_CARD_COUNTS.total + shopExtraCards,
    },
  };
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
