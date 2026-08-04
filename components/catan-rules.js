export const BASE_TERRAIN_DECK = [
  "wood", "wood", "wood", "wood",
  "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat",
  "brick", "brick", "brick",
  "ore", "ore", "ore",
  "desert",
];

export const EXPANDED_TERRAIN_DECK = [
  "wood", "wood", "wood", "wood", "wood", "wood",
  "sheep", "sheep", "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat", "wheat", "wheat",
  "brick", "brick", "brick", "brick", "brick",
  "ore", "ore", "ore", "ore", "ore",
  "desert", "desert",
];

export const BASE_NUMBER_DECK = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

export const EXPANDED_NUMBER_DECK = [
  10, 6, 8, 6, 2, 12, 5, 10, 3, 9, 2, 11, 8, 4,
  11, 5, 4, 8, 9, 3, 4, 3, 6, 5, 11, 10, 12, 9,
];

export const BASE_PORT_TYPES = ["generic", "generic", "generic", "generic", "wood", "brick", "sheep", "wheat", "ore"];
export const EXPANDED_PORT_TYPES = ["generic", "generic", "generic", "generic", "generic", "wood", "brick", "sheep", "sheep", "wheat", "ore"];

export const RESOURCE_TYPES = ["wood", "brick", "sheep", "wheat", "ore"];
export const COMMODITY_TYPES = ["paper", "cloth", "coin"];
export const ALL_CARD_TYPES = [...RESOURCE_TYPES, ...COMMODITY_TYPES];

export const CATAN_RULESETS = {
  original: {
    label: "Original Catan",
    shortLabel: "Original",
    description: "The classic island, robber, ports, roads, settlements, and cities.",
    victoryPoints: 10,
  },
  seafarers: {
    label: "Catan: Seafarers",
    shortLabel: "Seafarers",
    description: "Heading for New Shores with ships, a pirate, gold fields, and foreign-island bonuses.",
    victoryPoints: 14,
  },
  "cities-knights": {
    label: "Cities & Knights",
    shortLabel: "Cities & Knights",
    description: "Commodities, active knights, city improvements, an event die, and barbarian attacks.",
    victoryPoints: 13,
  },
  combined: {
    label: "Seafarers + Cities & Knights",
    shortLabel: "Both expansions",
    description: "Heading for New Shores with ships and pirate plus the full barbarian-defense system.",
    victoryPoints: 16,
  },
};

export function normalizeRuleset(ruleset) {
  return CATAN_RULESETS[ruleset] ? ruleset : "original";
}

export function hasSeafarers(rulesetOrGame) {
  const ruleset = typeof rulesetOrGame === "string" ? rulesetOrGame : rulesetOrGame?.ruleset;
  return ruleset === "seafarers" || ruleset === "combined";
}

export function hasCitiesKnights(rulesetOrGame) {
  const ruleset = typeof rulesetOrGame === "string" ? rulesetOrGame : rulesetOrGame?.ruleset;
  return ruleset === "cities-knights" || ruleset === "combined";
}

export function victoryTargetFor(rulesetOrGame) {
  const ruleset = typeof rulesetOrGame === "string" ? rulesetOrGame : rulesetOrGame?.ruleset;
  return CATAN_RULESETS[normalizeRuleset(ruleset)].victoryPoints;
}

export function cardTypesFor(rulesetOrGame) {
  return hasCitiesKnights(rulesetOrGame) ? ALL_CARD_TYPES : RESOURCE_TYPES;
}

export function cityProduction(resource) {
  if (resource === "wood") return { wood: 1, paper: 1 };
  if (resource === "sheep") return { sheep: 1, cloth: 1 };
  if (resource === "ore") return { ore: 1, coin: 1 };
  if (resource === "brick" || resource === "wheat") return { [resource]: 2 };
  return {};
}

export function createCitiesKnightsState(players) {
  return {
    barbarianDistance: 7,
    attacks: 0,
    eventDie: null,
    knights: {},
    cityWalls: {},
    improvements: Object.fromEntries(players.map((player) => [player.id, { trade: 0, politics: 0, science: 0 }])),
    metropolises: { trade: null, politics: null, science: null },
  };
}

export function handLimitFor(game, playerId) {
  if (!hasCitiesKnights(game)) return 7;
  const walls = Object.values(game.citiesKnights?.cityWalls ?? {}).filter((ownerId) => ownerId === playerId).length;
  return 7 + walls * 2;
}

export function rollEventDie(random = Math.random) {
  const faces = ["barbarian", "barbarian", "barbarian", "trade", "politics", "science"];
  return faces[Math.floor(random() * faces.length)];
}

export function usesExpandedBoard(playerCount) {
  return playerCount >= 5;
}

export function terrainDeckForPlayers(playerCount) {
  return usesExpandedBoard(playerCount) ? EXPANDED_TERRAIN_DECK : BASE_TERRAIN_DECK;
}

export function numberDeckForPlayers(playerCount) {
  return usesExpandedBoard(playerCount) ? EXPANDED_NUMBER_DECK : BASE_NUMBER_DECK;
}

export function portTypesForPlayers(playerCount) {
  return usesExpandedBoard(playerCount) ? EXPANDED_PORT_TYPES : BASE_PORT_TYPES;
}

export function getPortTradeRate(ports, settlements, playerId, resource) {
  let rate = 4;
  for (const port of ports ?? []) {
    const controlsPort = [port.from, port.to].some((vertexId) => settlements?.[vertexId]?.playerId === playerId);
    if (!controlsPort) continue;
    if (port.type === resource) return 2;
    if (port.type === "generic") rate = 3;
  }
  return rate;
}

export function createPairedTurn(players) {
  if (!usesExpandedBoard(players.length)) return null;
  return {
    stage: "primary",
    primaryPlayerId: players[0].id,
    secondaryPlayerId: players[3].id,
  };
}

export function advancePairedTurn(players, pairedTurn) {
  if (!pairedTurn) return null;
  if (pairedTurn.stage === "primary") {
    return { ...pairedTurn, stage: "secondary" };
  }
  const primaryIndex = players.findIndex((player) => player.id === pairedTurn.primaryPlayerId);
  const secondaryIndex = players.findIndex((player) => player.id === pairedTurn.secondaryPlayerId);
  return {
    stage: "primary",
    primaryPlayerId: players[(primaryIndex + 1) % players.length].id,
    secondaryPlayerId: players[(secondaryIndex + 1) % players.length].id,
  };
}

export function canProvideTradeResources(player, bundle) {
  return Boolean(player) && ALL_CARD_TYPES.every((resource) =>
    (player.resources?.[resource] ?? 0) >= (bundle?.[resource] ?? 0),
  );
}

export function resolveTradeResponse(game, accepted, responderId) {
  const trade = game.pendingTrade;
  if (!trade) return game;
  const proposer = game.players.find((player) => player.id === trade.fromPlayerId);
  if (!proposer) return { ...game, pendingTrade: null };

  const isProposer = responderId === trade.fromPlayerId;
  const isOpenOffer = !trade.toPlayerId;
  const isEligibleResponder = !isProposer && (
    isOpenOffer
      ? !trade.declinedPlayerIds?.includes(responderId)
      : trade.toPlayerId === responderId
  );

  if (isProposer) {
    if (accepted) return game;
    return {
      ...game,
      pendingTrade: null,
      log: [`${proposer.name} canceled the trade offer.`, ...game.log].slice(0, 24),
    };
  }
  if (!isEligibleResponder) return game;

  const responder = game.players.find((player) => player.id === responderId);
  if (!responder) return game;
  if (!accepted) {
    if (!isOpenOffer) {
      return {
        ...game,
        pendingTrade: null,
        log: [`${responder.name} declined ${proposer.name}'s trade.`, ...game.log].slice(0, 24),
      };
    }
    const declinedPlayerIds = [...new Set([...(trade.declinedPlayerIds ?? []), responderId])];
    const everyoneDeclined = game.players
      .filter((player) => player.id !== proposer.id)
      .every((player) => declinedPlayerIds.includes(player.id));
    return {
      ...game,
      pendingTrade: everyoneDeclined ? null : { ...trade, declinedPlayerIds },
      log: [
        everyoneDeclined
          ? `Everyone declined ${proposer.name}'s open trade.`
          : `${responder.name} passed on ${proposer.name}'s open trade.`,
        ...game.log,
      ].slice(0, 24),
    };
  }

  if (!canProvideTradeResources(proposer, trade.offer) || !canProvideTradeResources(responder, trade.request)) {
    return game;
  }
  const players = game.players.map((player) => {
    if (player.id !== proposer.id && player.id !== responder.id) return player;
    const resources = { ...player.resources };
    ALL_CARD_TYPES.filter((resource) => resource in resources || resource in trade.offer || resource in trade.request).forEach((resource) => {
      if (player.id === proposer.id) {
        resources[resource] = (resources[resource] ?? 0) + (trade.request[resource] ?? 0) - (trade.offer[resource] ?? 0);
      } else {
        resources[resource] = (resources[resource] ?? 0) + (trade.offer[resource] ?? 0) - (trade.request[resource] ?? 0);
      }
    });
    return { ...player, resources };
  });
  return {
    ...game,
    players,
    pendingTrade: null,
    log: [`${proposer.name} and ${responder.name} completed a trade.`, ...game.log].slice(0, 24),
  };
}
