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

// The simplified Heading for New Shores layout has six foreign-island hexes.
// Two are gold fields, matching the scenario's pair of gold fields.
export const SEAFARERS_FOREIGN_TERRAIN_DECK = ["wood", "sheep", "brick", "ore", "gold", "gold"];

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

export const DEVELOPMENT_CARD_INFO = {
  knight: { label: "Knight", description: "Move the robber and steal from an adjacent player." },
  victoryPoint: { label: "Victory Point", description: "A hidden victory point." },
  roadBuilding: { label: "Road Building", description: "Build 2 roads—or ships in Seafarers—for free." },
  yearOfPlenty: { label: "Year of Plenty", description: "Take any 2 resources from the supply." },
  monopoly: { label: "Monopoly", description: "Choose a resource; every player gives you all of that resource." },
};

export const DEVELOPMENT_DECK = [
  ...Array.from({ length: 14 }, () => "knight"),
  ...Array.from({ length: 5 }, () => "victoryPoint"),
  "roadBuilding", "roadBuilding",
  "yearOfPlenty", "yearOfPlenty",
  "monopoly", "monopoly",
];

export const PROGRESS_CARD_INFO = {
  alchemy: { color: "science", label: "Alchemy", description: "Choose both production dice before the event die is rolled." },
  crane: { color: "science", label: "Crane", description: "Build one city improvement for one fewer commodity." },
  engineering: { color: "science", label: "Engineering", description: "Build one city wall for free." },
  invention: { color: "science", label: "Invention", description: "Swap two number tokens other than 2, 6, 8, or 12." },
  irrigation: { color: "science", label: "Irrigation", description: "Gain two grain for each fields hex beside one of your buildings." },
  medicine: { color: "science", label: "Medicine", description: "Upgrade a settlement for one grain and two ore." },
  mining: { color: "science", label: "Mining", description: "Gain two ore for each mountains hex beside one of your buildings." },
  printing: { color: "science", label: "Printing", description: "Reveal immediately for one victory point.", victoryPoint: true },
  roadBuildingProgress: { color: "science", label: "Road Building", description: "Build two roads or eligible ships for free." },
  smithing: { color: "science", label: "Smithing", description: "Promote up to two different knights for free." },
  commercialHarbor: { color: "trade", label: "Commercial Harbor", description: "Offer each player a resource for one commodity." },
  guildDues: { color: "trade", label: "Guild Dues", description: "Take two resource or commodity cards from a player with more victory points." },
  merchant: { color: "trade", label: "Merchant", description: "Place the merchant beside your building for a 2:1 trade rate and one victory point." },
  merchantFleet: { color: "trade", label: "Merchant Fleet", description: "Choose one card type to trade at 2:1 for the rest of this turn." },
  resourceMonopolyProgress: { color: "trade", label: "Resource Monopoly", description: "Each opponent gives you up to two cards of one resource." },
  tradeMonopoly: { color: "trade", label: "Trade Monopoly", description: "Each opponent gives you one card of one commodity." },
  diplomacy: { color: "politics", label: "Diplomacy", description: "Remove an open route; replacing your own route is free." },
  espionage: { color: "politics", label: "Espionage", description: "View another player’s progress cards and take one non-VP card." },
  encouragement: { color: "politics", label: "Encouragement", description: "Activate all of your knights for free." },
  intrigue: { color: "politics", label: "Intrigue", description: "Displace an opponent’s knight connected to one of your routes." },
  taxation: { color: "politics", label: "Taxation", description: "Move the robber and steal one random card from every adjacent opponent." },
  constitution: { color: "politics", label: "Constitution", description: "Reveal immediately for one victory point.", victoryPoint: true },
  treason: { color: "politics", label: "Treason", description: "An opponent removes a knight; you may replace it with your own." },
  wedding: { color: "politics", label: "Wedding", description: "Players with more victory points give you two cards." },
  sabotage: { color: "politics", label: "Sabotage", description: "Players with at least your victory points discard half their hand." },
};

const repeatedCards = (type, count) => Array.from({ length: count }, () => type);

export const PROGRESS_DECKS = {
  science: [
    ...repeatedCards("alchemy", 2), ...repeatedCards("crane", 2), "engineering",
    ...repeatedCards("invention", 2), ...repeatedCards("irrigation", 2), ...repeatedCards("medicine", 2),
    ...repeatedCards("mining", 2), "printing", ...repeatedCards("roadBuildingProgress", 2), ...repeatedCards("smithing", 2),
  ],
  trade: [
    ...repeatedCards("commercialHarbor", 2), ...repeatedCards("guildDues", 2), ...repeatedCards("merchant", 6),
    ...repeatedCards("merchantFleet", 2), ...repeatedCards("resourceMonopolyProgress", 4), ...repeatedCards("tradeMonopoly", 2),
  ],
  politics: [
    ...repeatedCards("diplomacy", 2), ...repeatedCards("espionage", 3), ...repeatedCards("encouragement", 2),
    ...repeatedCards("intrigue", 2), ...repeatedCards("taxation", 2), "constitution",
    ...repeatedCards("treason", 2), ...repeatedCards("wedding", 2), ...repeatedCards("sabotage", 2),
  ],
};

export function progressCardEligible(improvementLevel, redDie) {
  return improvementLevel > 0 && redDie >= 1 && redDie <= Math.min(6, improvementLevel + 1);
}

export function canPromoteKnight(game, playerId, vertexId) {
  const state = game?.citiesKnights;
  const knight = state?.knights?.[vertexId];
  if (!knight || knight.playerId !== playerId || knight.level >= 3) return false;
  if ((state.promotedKnightIdsThisTurn ?? []).includes(vertexId)) return false;
  if (knight.level === 2 && (state.improvements?.[playerId]?.politics ?? 0) < 3) return false;
  const nextLevelCount = Object.values(state.knights).filter((candidate) => candidate.playerId === playerId && candidate.level === knight.level + 1).length;
  return nextLevelCount < 2;
}

export function usesDevelopmentCards(rulesetOrGame) {
  const ruleset = typeof rulesetOrGame === "string" ? rulesetOrGame : rulesetOrGame?.ruleset;
  const normalizedRuleset = normalizeRuleset(ruleset);
  return normalizedRuleset === "original" || normalizedRuleset === "seafarers";
}

export function startingBuildingType(setupIndex, playerCount, rulesetOrGame) {
  return setupIndex >= playerCount && hasCitiesKnights(rulesetOrGame) ? "city" : "settlement";
}

export function totalVictoryPoints(player) {
  return (player?.points ?? 0) + (player?.hiddenVictoryPoints ?? 0);
}

export function eligiblePirateVictimIds(board, ships, pirateTileId, players, activePlayerId) {
  return [...new Set(
    (board?.edges ?? [])
      .filter((edge) => edge.tileIds.includes(pirateTileId))
      .map((edge) => ships?.[edge.id])
      .filter((ownerId) => ownerId && ownerId !== activePlayerId),
  )].filter((ownerId) => {
    const player = players.find((candidate) => candidate.id === ownerId);
    return player && ALL_CARD_TYPES.some((resource) => (player.resources?.[resource] ?? 0) > 0);
  });
}

export function longestRouteLength(board, roads = {}, ships = {}, settlements = {}, playerId, knights = {}) {
  const ownedEdges = (board?.edges ?? []).flatMap((edge) => {
    if (roads[edge.id] === playerId) return [{ ...edge, kind: "road" }];
    if (ships[edge.id] === playerId) return [{ ...edge, kind: "ship" }];
    return [];
  });
  if (!ownedEdges.length) return 0;

  const edgesByVertex = new Map();
  ownedEdges.forEach((edge) => {
    edgesByVertex.set(edge.from, [...(edgesByVertex.get(edge.from) ?? []), edge]);
    edgesByVertex.set(edge.to, [...(edgesByVertex.get(edge.to) ?? []), edge]);
  });
  const isBlocked = (vertexId) => {
    const building = settlements[vertexId];
    const knight = knights[vertexId];
    return (building && building.playerId !== playerId) || (knight && knight.playerId !== playerId);
  };
  const ownsBuilding = (vertexId) => settlements[vertexId]?.playerId === playerId;

  const search = (vertexId, usedEdgeIds, incomingKind) => {
    let longest = usedEdgeIds.size;
    if (usedEdgeIds.size && isBlocked(vertexId)) return longest;
    for (const edge of edgesByVertex.get(vertexId) ?? []) {
      if (usedEdgeIds.has(edge.id)) continue;
      if (incomingKind && edge.kind !== incomingKind && !ownsBuilding(vertexId)) continue;
      usedEdgeIds.add(edge.id);
      const nextVertexId = edge.from === vertexId ? edge.to : edge.from;
      longest = Math.max(longest, search(nextVertexId, usedEdgeIds, edge.kind));
      usedEdgeIds.delete(edge.id);
    }
    return longest;
  };

  return Math.max(...[...edgesByVertex.keys()].map((vertexId) => search(vertexId, new Set(), null)));
}

function awardHolder(counts, currentHolderId, minimum, previousCounts = {}) {
  const highest = Math.max(0, ...Object.values(counts));
  if (highest < minimum) return null;
  const leaders = Object.keys(counts).filter((playerId) => counts[playerId] === highest);
  if (leaders.length === 1) return leaders[0];
  if (!leaders.includes(currentHolderId)) return null;
  const holderLostGround = (previousCounts[currentHolderId] ?? counts[currentHolderId]) > counts[currentHolderId];
  return holderLostGround ? null : currentHolderId;
}

function transferAwardPoints(players, previousHolderId, nextHolderId) {
  if (previousHolderId === nextHolderId) return players;
  return players.map((player) => {
    if (player.id === previousHolderId) return { ...player, points: Math.max(0, player.points - 2) };
    if (player.id === nextHolderId) return { ...player, points: player.points + 2 };
    return player;
  });
}

export function reconcileCatanAwards(game, board) {
  const longestRouteLengths = Object.fromEntries(game.players.map((player) => [
    player.id,
    longestRouteLength(board, game.roads, game.ships, game.settlements, player.id, game.citiesKnights?.knights),
  ]));
  const longestRoadPlayerId = awardHolder(
    longestRouteLengths,
    game.longestRoadPlayerId,
    5,
    game.longestRouteLengths,
  );
  const knightCounts = Object.fromEntries(game.players.map((player) => [player.id, player.playedKnights ?? 0]));
  const largestArmyPlayerId = usesDevelopmentCards(game)
    ? awardHolder(knightCounts, game.largestArmyPlayerId, 3)
    : null;

  let players = transferAwardPoints(game.players, game.longestRoadPlayerId, longestRoadPlayerId);
  players = transferAwardPoints(players, game.largestArmyPlayerId, largestArmyPlayerId);
  const awardLog = [];
  const routeLabel = hasSeafarers(game) ? "Longest Route" : "Longest Road";
  if (game.longestRoadPlayerId !== longestRoadPlayerId) {
    if (longestRoadPlayerId) {
      const player = players.find((candidate) => candidate.id === longestRoadPlayerId);
      awardLog.push(`${player.name} claimed ${routeLabel} with ${longestRouteLengths[longestRoadPlayerId]} connected pieces and gained 2 victory points.`);
    } else if (game.longestRoadPlayerId) {
      awardLog.push(`${routeLabel} is unclaimed after the route was broken or tied.`);
    }
  }
  if (game.largestArmyPlayerId !== largestArmyPlayerId) {
    if (largestArmyPlayerId) {
      const player = players.find((candidate) => candidate.id === largestArmyPlayerId);
      awardLog.push(`${player.name} claimed Largest Army with ${knightCounts[largestArmyPlayerId]} played knights and gained 2 victory points.`);
    } else if (game.largestArmyPlayerId) {
      awardLog.push("Largest Army is currently unclaimed.");
    }
  }
  const winner = players.find((player) => totalVictoryPoints(player) >= game.victoryTarget);
  return {
    ...game,
    players,
    longestRouteLengths,
    longestRoadPlayerId,
    largestArmyPlayerId,
    winnerId: game.winnerId ?? winner?.id ?? null,
    log: [...awardLog, ...(game.log ?? [])].slice(0, 24),
  };
}

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
    promotedKnightIdsThisTurn: [],
    progressDecks: { science: [], trade: [], politics: [] },
    improvements: Object.fromEntries(players.map((player) => [player.id, { trade: 0, politics: 0, science: 0 }])),
    metropolises: { trade: null, politics: null, science: null },
  };
}

export function resolveBarbarianAttack(game, now = Date.now()) {
  const citiesKnights = { ...game.citiesKnights };
  const cityEntries = Object.entries(game.settlements).filter(([, building]) => building.type === "city");
  const cityCount = cityEntries.length;
  const strengthByPlayer = Object.fromEntries(game.players.map((player) => [player.id, 0]));
  Object.values(citiesKnights.knights ?? {}).forEach((knight) => {
    if (knight.active) strengthByPlayer[knight.playerId] += knight.level;
  });
  const totalStrength = Object.values(strengthByPlayer).reduce((sum, strength) => sum + strength, 0);
  let players = game.players.map((player) => ({ ...player }));
  let pendingCityLoss = null;
  let resultLog;
  let alertMessage = "The barbarians have attacked!";

  if (totalStrength >= cityCount) {
    const best = Math.max(0, ...Object.values(strengthByPlayer));
    const defenders = players.filter((player) => best > 0 && strengthByPlayer[player.id] === best);
    if (defenders.length === 1) {
      players = players.map((player) => player.id === defenders[0].id
        ? { ...player, points: player.points + 1, defenderPoints: (player.defenderPoints ?? 0) + 1 }
        : player);
      resultLog = `${defenders[0].name} is the Defender of Catan and receives 1 victory point.`;
      alertMessage = `${defenders[0].name} is the Defender of Catan and gets 1 victory point!`;
    } else if (defenders.length > 1) {
      resultLog = `Catan was defended. ${defenders.map((player) => player.name).join(", ")} tied for strongest, so no Defender of Catan point was awarded.`;
    } else {
      resultLog = "Catan was defended, but no player contributed active knight strength.";
    }
  } else {
    const pillageableByPlayer = Object.fromEntries(game.players.map((player) => [
      player.id,
      cityEntries.filter(([, building]) => building.playerId === player.id).map(([vertexId]) => vertexId),
    ]));
    const eligiblePlayers = game.players.filter((player) => pillageableByPlayer[player.id].length > 0);
    const lowestStrength = eligiblePlayers.length ? Math.min(...eligiblePlayers.map((player) => strengthByPlayer[player.id])) : null;
    const losingPlayerIds = lowestStrength == null ? [] : eligiblePlayers.filter((player) => strengthByPlayer[player.id] === lowestStrength).map((player) => player.id);
    if (losingPlayerIds.length) {
      const firstPlayerId = losingPlayerIds[0];
      pendingCityLoss = {
        playerIds: losingPlayerIds,
        currentPlayerId: firstPlayerId,
        eligibleVertexIds: pillageableByPlayer[firstPlayerId],
      };
      const names = players.filter((player) => losingPlayerIds.includes(player.id)).map((player) => player.name).join(", ");
      resultLog = `The barbarians won. ${names} must choose a city to reduce to a settlement.`;
      alertMessage = `The barbarians have attacked! ${names} must choose a city to lose.`;
    } else {
      resultLog = "The barbarians attacked, but there were no cities to pillage.";
    }
  }

  const firstAttack = (citiesKnights.attacks ?? 0) === 0;
  citiesKnights.attacks = (citiesKnights.attacks ?? 0) + 1;
  citiesKnights.barbarianDistance = 7;
  citiesKnights.knights = Object.fromEntries(Object.entries(citiesKnights.knights ?? {}).map(([vertexId, knight]) => [vertexId, { ...knight, active: false }]));
  const winner = players.find((player) => totalVictoryPoints(player) >= game.victoryTarget);
  return {
    ...game,
    players,
    citiesKnights,
    pendingCityLoss,
    robberTileId: firstAttack ? game.robberInactiveTileId : game.robberTileId,
    robberInactiveTileId: firstAttack ? null : game.robberInactiveTileId,
    winnerId: winner?.id ?? game.winnerId,
    barbarianAlert: { id: `attack-${game.turn}-${now}`, createdAt: now, kind: "attack", message: alertMessage },
    log: [`${resultLog}${firstAttack ? " The robber and pirate are now active." : ""}`, ...game.log].slice(0, 24),
  };
}

export function pillageChosenCity(game, playerId, vertexId) {
  const pending = game.pendingCityLoss;
  if (!pending || pending.currentPlayerId !== playerId || !pending.eligibleVertexIds.includes(vertexId)) return game;
  const building = game.settlements[vertexId];
  if (building?.playerId !== playerId || building.type !== "city") return game;
  const cityWalls = { ...(game.citiesKnights?.cityWalls ?? {}) };
  delete cityWalls[vertexId];
  const players = game.players.map((player) => player.id === playerId ? { ...player, points: Math.max(0, player.points - 1) } : player);
  const settlements = { ...game.settlements, [vertexId]: { ...building, type: "settlement" } };
  const remainingPlayerIds = pending.playerIds.slice(1);
  let nextPending = null;
  for (const nextPlayerId of remainingPlayerIds) {
    const eligibleVertexIds = Object.entries(settlements)
      .filter(([, candidate]) => candidate.playerId === nextPlayerId && candidate.type === "city")
      .map(([candidateVertexId]) => candidateVertexId);
    if (eligibleVertexIds.length) {
      nextPending = { playerIds: remainingPlayerIds.slice(remainingPlayerIds.indexOf(nextPlayerId)), currentPlayerId: nextPlayerId, eligibleVertexIds };
      break;
    }
  }
  const player = players.find((candidate) => candidate.id === playerId);
  return {
    ...game,
    players,
    settlements,
    citiesKnights: { ...game.citiesKnights, cityWalls },
    pendingCityLoss: nextPending,
    log: [`${player.name} chose a city to be pillaged${game.citiesKnights?.cityWalls?.[vertexId] ? " and its city wall was removed" : ""}.`, ...game.log].slice(0, 24),
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
