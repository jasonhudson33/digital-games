import { shuffled } from "./shuffle.js";
import { catanRuntime } from "../components/catan-runtime.js";
import {
  chooseBestCatanEdge,
  chooseBestCatanVertex,
  chooseCatanDiscards,
  chooseCatanPirateTile,
  chooseCatanResource,
  chooseCatanRobberTile,
  computerAcceptsCatanTrade,
  scoreCatanVertex,
} from "../components/catan-computer-strategy.js";
import {
  ALL_CARD_TYPES,
  advancePairedTurn,
  cardTypesFor,
  CATAN_RULESETS,
  canProvideTradeResources,
  canPromoteKnight,
  cityProduction,
  COMMODITY_TYPES,
  createCitiesKnightsState,
  createPairedTurn,
  DEVELOPMENT_CARD_INFO,
  DEVELOPMENT_DECK,
  eligiblePirateVictimIds,
  getPortTradeRate,
  handLimitFor,
  hasCitiesKnights,
  hasSeafarers,
  numberDeckForPlayers,
  normalizeRuleset,
  portTypesForPlayers,
  pillageChosenCity,
  playProgressCard,
  PROGRESS_CARD_INFO,
  PROGRESS_DECKS,
  progressCardEligible,
  reconcileCatanAwards,
  RESOURCE_TYPES,
  resolveBarbarianAttack,
  resolveProgressCardChoice,
  resolveTradeResponse,
  SEAFARERS_FOREIGN_TERRAIN_DECK,
  startingBuildingType,
  terrainDeckForPlayers,
  totalVictoryPoints,
  usesExpandedBoard,
  usesDevelopmentCards,
  victoryTargetFor,
} from "../components/catan-rules.js";
import * as board from "./catan-board.js";
const { RESOURCE_INFO, SQRT3, BOARD_CENTER, HEX_SIZE, RESOURCES, PLAYER_STYLES, COSTS, axialTiles, centerFor, cornersFor, geometry, baseTileSpecs, expandedCenter, expandedHexSize, expandedTileSpecs, BASE_BOARD, EXPANDED_BOARD, seafarersAxials, seafarersCenter, seafarersHexSize, SEAFARERS_BOARD, axialDistance, FOREIGN_ISLANDS, boardForPlayerCount, boardForGame, createPorts, createSeafarersPorts, midpointForEdge, emptyResources, totalResources, canAfford, payCost, isSettlementLegal, edgeTouchesTerrain, isTransportLegal } = board;

function createGame(lobby) {
  const ruleset = normalizeRuleset(lobby.ruleset);
  const seafarers = hasSeafarers(ruleset);
  const citiesKnightsMode = hasCitiesKnights(ruleset);
  const board = boardForPlayerCount(lobby.players.length, ruleset);
  const terrainOrder = shuffled(terrainDeckForPlayers(lobby.players.length));
  const mainIslandTerrain = shuffled(terrainDeckForPlayers(4));
  const foreignTerrain = shuffled(SEAFARERS_FOREIGN_TERRAIN_DECK);
  const numberOrder = shuffled(seafarers ? [...numberDeckForPlayers(6)] : numberDeckForPlayers(lobby.players.length));
  let numberIndex = 0;
  let mainTerrainIndex = 0;
  let foreignTerrainIndex = 0;
  const tiles = board.tiles.map((tile, index) => {
    const axialKey = tile.axial ? `${tile.axial.q},${tile.axial.r}` : "";
    const islandId = seafarers
      ? axialDistance(tile.axial) <= 2
        ? "main"
        : FOREIGN_ISLANDS.get(axialKey) ?? null
      : "main";
    const resource = seafarers
      ? islandId === "main"
        ? mainIslandTerrain[mainTerrainIndex++]
        : islandId
          ? foreignTerrain[foreignTerrainIndex++]
          : "sea"
      : terrainOrder[index];
    return {
      ...tile,
      resource,
      islandId,
      number: resource === "desert" || resource === "sea" ? null : numberOrder[numberIndex++],
    };
  });
  const claimedColors = new Set();
  const players = lobby.players.map((player, index) => {
    const preferredStyle = PLAYER_STYLES.find((style) => style.color === player.color);
    const style = preferredStyle && !claimedColors.has(preferredStyle.color)
      ? preferredStyle
      : PLAYER_STYLES.find((candidate) => !claimedColors.has(candidate.color)) ?? PLAYER_STYLES[index];
    claimedColors.add(style.color);
    return {
      id: player.id,
      name: player.name,
      isComputer: Boolean(player.isComputer),
      ...style,
      resources: emptyResources(),
      points: 0,
      hiddenVictoryPoints: 0,
      developmentCards: [],
      playedKnights: 0,
      progressCards: [],
      progressVictoryPoints: 0,
      settledIslandIds: [],
      defenderPoints: 0,
    };
  });
  const desert = tiles.find((tile) => tile.resource === "desert");
  const startingPirateTile = tiles.find((tile) => tile.resource === "sea" && tile.axial?.q === 0 && tile.axial?.r === -4)
    ?? tiles.find((tile) => tile.resource === "sea");
  const startingPlayerIndex = Math.floor(Math.random() * players.length);
  const tableOrder = Array.from(
    { length: players.length },
    (_, offset) => players[(startingPlayerIndex + offset) % players.length],
  );
  const setupOrder = [
    ...tableOrder.map((player) => player.id),
    ...[...tableOrder].reverse().map((player) => player.id),
  ];
  const citiesKnightsState = citiesKnightsMode
    ? {
        ...createCitiesKnightsState(players),
        progressDecks: Object.fromEntries(Object.entries(PROGRESS_DECKS).map(([color, deck]) => [color, shuffled(deck)])),
      }
    : null;
  return {
    roomCode: lobby.roomCode,
    hostId: lobby.hostId,
    phase: "playing",
    createdAt: lobby.createdAt,
    updatedAt: Date.now(),
    ruleset,
    victoryTarget: victoryTargetFor(ruleset),
    tiles,
    board,
    boardVariant: seafarers ? "seafarers" : usesExpandedBoard(players.length) ? "expanded" : "base",
    ports: seafarers
      ? createSeafarersPorts(board, tiles, portTypesForPlayers(players.length).slice(0, usesExpandedBoard(players.length) ? 10 : 8))
      : createPorts(board, portTypesForPlayers(players.length)),
    players,
    settlements: {},
    roads: {},
    ships: {},
    startingPlayerIndex,
    currentPlayerIndex: startingPlayerIndex,
    turn: 1,
    rolled: false,
    dice: [1, 1],
    robberTileId: citiesKnightsMode ? null : desert.id,
    robberInactiveTileId: citiesKnightsMode ? desert.id : null,
    pirateTileId: seafarers ? startingPirateTile?.id ?? null : null,
    winnerId: null,
    pendingSeven: null,
    pendingGold: null,
    pendingTrade: null,
    pendingDevelopment: null,
    pendingProgress: null,
    pendingCityLoss: null,
    pendingProgressDiscard: null,
    movedShipThisTurn: false,
    builtShipsThisTurn: [],
    developmentDeck: usesDevelopmentCards(ruleset) ? shuffled(DEVELOPMENT_DECK) : [],
    developmentCardPlayedThisTurn: false,
    longestRoadPlayerId: null,
    longestRouteLengths: Object.fromEntries(players.map((player) => [player.id, 0])),
    largestArmyPlayerId: null,
    pairedTurn: createPairedTurn(players),
    citiesKnights: citiesKnightsState,
    setup: {
      order: setupOrder,
      index: 0,
      step: "settlement",
      settlementVertexId: null,
    },
    log: [
      `${CATAN_RULESETS[ruleset].label} begins. First to ${victoryTargetFor(ruleset)} victory points wins.`,
      `${players[startingPlayerIndex].name} chooses the first ${citiesKnightsMode ? "settlement (the second placement will be a city)" : "settlement"}.`,
      `Starting placement begins. Choose a building, then place ${seafarers ? "a road or coastal ship" : "a road"} beside it.`,
    ],
  };
}

function createLobby(roomCode, playerId, name) {
  const now = Date.now();
  return {
    roomCode,
    hostId: playerId,
    phase: "lobby",
    ruleset: "original",
    players: [{ id: playerId, name, ...PLAYER_STYLES[0], resources: emptyResources(), points: 0 }],
    tiles: [],
    board: null,
    boardVariant: null,
    ports: [],
    settlements: {},
    roads: {},
    ships: {},
    currentPlayerIndex: 0,
    turn: 1,
    rolled: false,
    dice: [1, 1],
    robberTileId: null,
    winnerId: null,
    pendingSeven: null,
    pendingGold: null,
    pendingTrade: null,
    pendingDevelopment: null,
    pendingProgress: null,
    pendingCityLoss: null,
    pendingProgressDiscard: null,
    movedShipThisTurn: false,
    builtShipsThisTurn: [],
    developmentDeck: [],
    developmentCardPlayedThisTurn: false,
    longestRoadPlayerId: null,
    longestRouteLengths: {},
    largestArmyPlayerId: null,
    pairedTurn: null,
    setup: null,
    log: [`${name} created room ${roomCode}.`],
    createdAt: now,
    updatedAt: now,
  };
}


function placeStartingSettlement(game, playerId, vertexId) {
  if (!game.setup || game.setup.step !== "settlement") return game;
  const isSecondRound = game.setup.index >= game.players.length;
  const startingType = startingBuildingType(game.setup.index, game.players.length, game);
  const players = game.players.map((player) => {
    if (player.id !== playerId) return player;
    const resources = { ...player.resources };
    if (isSecondRound) {
      const vertex = boardForGame(game).vertices.find((candidate) => candidate.id === vertexId);
      vertex.tileIds.forEach((tileId) => {
        const resource = game.tiles[tileId].resource;
        if (resource !== "desert") resources[resource] += 1;
      });
    }
    return { ...player, resources, points: player.points + (startingType === "city" ? 2 : 1) };
  });
  return {
    ...game,
    players,
    settlements: {
      ...game.settlements,
      [vertexId]: { playerId, type: startingType },
    },
    setup: {
      ...game.setup,
      step: "road",
      settlementVertexId: vertexId,
    },
    log: [`${players.find((player) => player.id === playerId).name} placed a starting ${startingType}. Choose its ${hasSeafarers(game) ? "road or ship" : "road"}.`, ...game.log].slice(0, 24),
  };
}

function placeStartingRoad(game, playerId, edgeId, kind = "road") {
  if (!game.setup || game.setup.step !== "road") return game;
  if (!isTransportLegal(boardForGame(game), boardForGame(game).edges.find((edge) => edge.id === edgeId), playerId, game.roads, game.ships, game.settlements, kind, game.tiles, game.pirateTileId, game.citiesKnights?.knights)) return game;
  const roads = kind === "road" ? { ...game.roads, [edgeId]: playerId } : game.roads;
  const ships = kind === "ship" ? { ...game.ships, [edgeId]: playerId } : game.ships;
  const nextSetupIndex = game.setup.index + 1;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (nextSetupIndex >= game.setup.order.length) {
    return {
      ...game,
      roads,
      ships,
      setup: null,
      currentPlayerIndex: game.startingPlayerIndex ?? 0,
      log: [
        `${player.name} placed the final starting ${kind}. ${game.players[game.startingPlayerIndex ?? 0].name} takes the first turn.`,
        ...game.log,
      ].slice(0, 24),
    };
  }
  const nextPlayerId = game.setup.order[nextSetupIndex];
  const nextPlayerIndex = game.players.findIndex((candidate) => candidate.id === nextPlayerId);
  return {
    ...game,
    roads,
    ships,
    currentPlayerIndex: nextPlayerIndex,
    setup: {
      ...game.setup,
      index: nextSetupIndex,
      step: "settlement",
      settlementVertexId: null,
    },
    log: [
      `${player.name} placed a starting ${kind}. ${game.players[nextPlayerIndex].name} chooses next.`,
      ...game.log,
    ].slice(0, 24),
  };
}

function isShipMovable(game, edge, playerId) {
  if (!edge || game.ships?.[edge.id] !== playerId || game.movedShipThisTurn || game.builtShipsThisTurn?.includes(edge.id) || edge.tileIds.includes(game.pirateTileId)) return false;
  const board = boardForGame(game);
  return [edge.from, edge.to].some((vertexId) => {
    if (game.settlements[vertexId]?.playerId === playerId) return false;
    return !board.vertexEdges[vertexId].some((otherEdgeId) => otherEdgeId !== edge.id && game.ships[otherEdgeId] === playerId);
  });
}

function moveShip(game, playerId, sourceEdgeId, targetEdgeId) {
  const board = boardForGame(game);
  const source = board.edges.find((edge) => edge.id === sourceEdgeId);
  const target = board.edges.find((edge) => edge.id === targetEdgeId);
  if (!isShipMovable(game, source, playerId)) return game;
  const ships = { ...game.ships };
  delete ships[sourceEdgeId];
  if (!target || !isTransportLegal(board, target, playerId, game.roads, ships, game.settlements, "ship", game.tiles, game.pirateTileId, game.citiesKnights?.knights)) return game;
  ships[targetEdgeId] = playerId;
  const player = game.players.find((candidate) => candidate.id === playerId);
  return { ...game, ships, movedShipThisTurn: true, log: [`${player.name} moved an open ship.`, ...game.log].slice(0, 24) };
}

function resolveDiceRoll(game, dieOne, dieTwo, eventDie = null) {
  if (!game || game.rolled) return game;
  const total = dieOne + dieTwo;
  const players = game.players.map((player) => ({ ...player, resources: { ...player.resources } }));
  const entries = [`${players[game.currentPlayerIndex].name} rolled ${dieOne} + ${dieTwo} = ${total}${eventDie ? ` · event die: ${eventDie}` : ""}.`];
  let pendingSeven = null;
  const robberDormant = hasCitiesKnights(game) && !game.citiesKnights.attacks;
  const afterSevenPhase = robberDormant ? null : hasSeafarers(game) ? "chooseToken" : "moveRobber";
  const goldClaims = [];

  if (total === 7) {
    const discarders = players.filter((player) => totalResources(player.resources) > handLimitFor(game, player.id));
    pendingSeven = discarders.length ? {
      phase: "discard",
      remainingDiscardPlayerIds: discarders.map((player) => player.id),
      discardCounts: Object.fromEntries(discarders.map((player) => [player.id, Math.floor(totalResources(player.resources) / 2)])),
      afterDiscardPhase: afterSevenPhase,
    } : afterSevenPhase ? { phase: afterSevenPhase, remainingDiscardPlayerIds: [], discardCounts: {} } : null;
    entries.push(discarders.length
      ? `${discarders.map((player) => player.name).join(", ")} must discard half their resource cards.`
      : robberDormant
        ? "The robber and pirate remain inactive until the first barbarian attack."
        : `${players[game.currentPlayerIndex].name} must move the ${hasSeafarers(game) ? "robber or pirate" : "robber"}.`);
  } else {
    const gains = Object.fromEntries(players.map((player) => [player.id, emptyResources()]));
    game.tiles.forEach((tile) => {
      if (tile.number !== total || tile.id === game.robberTileId || ["desert", "sea"].includes(tile.resource)) return;
      tile.vertexIds.forEach((vertexId) => {
        const building = game.settlements[vertexId];
        if (!building) return;
        const player = players.find((candidate) => candidate.id === building.playerId);
        const amount = building.type === "city" ? 2 : 1;
        if (tile.resource === "gold") {
          goldClaims.push({ playerId: building.playerId, count: amount });
          return;
        }
        const production = building.type === "city" && hasCitiesKnights(game)
          ? cityProduction(tile.resource)
          : { [tile.resource]: amount };
        Object.entries(production).forEach(([resource, count]) => {
          gains[building.playerId][resource] += count;
          player.resources[resource] += count;
        });
      });
    });
    const gainLines = players.map((player) => {
      const gain = gains[player.id];
      const text = cardTypesFor(game).filter((resource) => gain[resource] > 0)
        .map((resource) => `${gain[resource]} ${RESOURCE_INFO[resource].short.toLowerCase()}`).join(", ");
      return text ? `${player.name}: ${text}` : null;
    }).filter(Boolean);
    entries.push(gainLines.length ? `Production — ${gainLines.join(" · ")}.` : "No settlements produced resources.");
  }

  let next = {
    ...game,
    players,
    dice: [dieOne, dieTwo],
    eventDie,
    pendingSeven,
    pendingGold: goldClaims.length ? { claims: goldClaims } : null,
    citiesKnights: game.citiesKnights ? { ...game.citiesKnights, alchemyDice: null } : null,
    rolled: true,
    log: [...entries, ...game.log].slice(0, 24),
  };
  if (eventDie === "barbarian") next = advanceBarbarians(next);
  else if (eventDie) next = awardProgressCards(next, eventDie, dieOne);
  return next;
}

function advanceGameTurn(game) {
  if (game.pairedTurn) {
    const nextPairedTurn = advancePairedTurn(game.players, game.pairedTurn);
    if (nextPairedTurn.stage === "secondary") {
      const secondaryIndex = game.players.findIndex((player) => player.id === nextPairedTurn.secondaryPlayerId);
      return {
        ...game,
        currentPlayerIndex: secondaryIndex,
        pairedTurn: nextPairedTurn,
        developmentCardPlayedThisTurn: false,
        citiesKnights: game.citiesKnights ? { ...game.citiesKnights, promotedKnightIdsThisTurn: [], merchantFleet: null } : null,
        log: [`${game.players[secondaryIndex].name} now takes the paired build and bank-trade phase.`, ...game.log].slice(0, 24),
      };
    }
    const nextPrimaryIndex = game.players.findIndex((player) => player.id === nextPairedTurn.primaryPlayerId);
    return {
      ...game,
      currentPlayerIndex: nextPrimaryIndex,
      pairedTurn: nextPairedTurn,
      turn: nextPrimaryIndex === 0 ? game.turn + 1 : game.turn,
      rolled: false,
      movedShipThisTurn: false,
      builtShipsThisTurn: [],
      developmentCardPlayedThisTurn: false,
      citiesKnights: game.citiesKnights ? { ...game.citiesKnights, promotedKnightIdsThisTurn: [], merchantFleet: null } : null,
      log: [`${game.players[nextPrimaryIndex].name} is the next dice player.`, ...game.log].slice(0, 24),
    };
  }
  const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
  return {
    ...game,
    currentPlayerIndex: nextIndex,
    turn: nextIndex === 0 ? game.turn + 1 : game.turn,
    rolled: false,
    movedShipThisTurn: false,
    builtShipsThisTurn: [],
    developmentCardPlayedThisTurn: false,
    citiesKnights: game.citiesKnights ? { ...game.citiesKnights, promotedKnightIdsThisTurn: [], merchantFleet: null } : null,
    log: [`${game.players[nextIndex].name} is up next.`, ...game.log].slice(0, 24),
  };
}

function buyDevelopmentCardFor(game, playerId) {
  if (!usesDevelopmentCards(game) || !game.developmentDeck.length) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player || !canAfford(player, COSTS.development)) return game;
  const [type, ...developmentDeck] = game.developmentDeck;
  const card = { id: `${game.turn}-${playerId}-${game.developmentDeck.length}`, type, boughtTurn: game.turn };
  const winsImmediately = type === "victoryPoint" && totalVictoryPoints(player) === game.victoryTarget - 1;
  const players = game.players.map((candidate) => {
    if (candidate.id !== playerId) return candidate;
    const paid = payCost(candidate, COSTS.development);
    return {
      ...paid,
      points: paid.points + (winsImmediately ? 1 : 0),
      developmentCards: winsImmediately ? paid.developmentCards : [...paid.developmentCards, card],
    };
  });
  return {
    ...game,
    players,
    developmentDeck,
    winnerId: winsImmediately ? playerId : game.winnerId,
    log: [`${player.name} bought a development card${winsImmediately ? ", had the winning victory point, and played it immediately!" : "."}`, ...game.log].slice(0, 24),
  };
}

function playDevelopmentCardFor(game, playerId, cardId) {
  if (!usesDevelopmentCards(game) || game.developmentCardPlayedThisTurn) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  const card = player?.developmentCards.find((candidate) => candidate.id === cardId);
  if (!card || card.boughtTurn === game.turn) return game;
  let players = game.players.map((candidate) => candidate.id === playerId
    ? {
        ...candidate,
        points: candidate.points + (card.type === "victoryPoint" ? 1 : 0),
        developmentCards: candidate.developmentCards.filter((developmentCard) => developmentCard.id !== cardId),
      }
    : candidate);
  let pendingSeven = game.pendingSeven;
  let pendingDevelopment = null;

  if (card.type === "knight") {
    players = players.map((candidate) => candidate.id === playerId ? { ...candidate, playedKnights: candidate.playedKnights + 1 } : candidate);
    pendingSeven = {
      phase: hasSeafarers(game) ? "chooseToken" : "moveRobber",
      remainingDiscardPlayerIds: [],
      discardCounts: {},
      source: "knight",
    };
  } else if (card.type === "roadBuilding") {
    pendingDevelopment = { type: "roadBuilding", remaining: 2, playerId };
  } else if (card.type === "yearOfPlenty") {
    pendingDevelopment = { type: "yearOfPlenty", remaining: 2, playerId };
  } else if (card.type === "monopoly") {
    pendingDevelopment = { type: "monopoly", playerId };
  }
  const winner = players.find((candidate) => totalVictoryPoints(candidate) >= game.victoryTarget);
  return {
    ...game,
    players,
    pendingSeven,
    pendingDevelopment,
    developmentCardPlayedThisTurn: true,
    winnerId: winner?.id ?? game.winnerId,
    log: [`${player.name} played ${DEVELOPMENT_CARD_INFO[card.type].label}.`, ...game.log].slice(0, 24),
  };
}

function completeFreeTransport(game, playerId, edgeId, kind) {
  const pending = game.pendingDevelopment;
  if (pending?.type !== "roadBuilding" || pending.playerId !== playerId || pending.remaining < 1 || !["road", "ship"].includes(kind) || (pending.fixedKind && pending.fixedKind !== kind) || (kind === "ship" && !hasSeafarers(game))) return game;
  const board = boardForGame(game);
  const edge = board.edges.find((candidate) => candidate.id === edgeId);
  if (!edge || !isTransportLegal(board, edge, playerId, game.roads, game.ships, game.settlements, kind, game.tiles, game.pirateTileId, game.citiesKnights?.knights)) return game;
  const remaining = pending.remaining - 1;
  const player = game.players.find((candidate) => candidate.id === playerId);
  return {
    ...game,
    roads: kind === "road" ? { ...game.roads, [edgeId]: playerId } : game.roads,
    ships: kind === "ship" ? { ...game.ships, [edgeId]: playerId } : game.ships,
    builtShipsThisTurn: kind === "ship" ? [...(game.builtShipsThisTurn ?? []), edgeId] : game.builtShipsThisTurn,
    pendingDevelopment: remaining ? { ...pending, remaining } : null,
    log: [`${player.name} placed a free ${kind}${remaining ? ` (${remaining} remaining)` : "."}`, ...game.log].slice(0, 24),
  };
}

function resolveDevelopmentResourceChoice(game, playerId, resource) {
  const pending = game.pendingDevelopment;
  if (!pending || pending.playerId !== playerId || !RESOURCES.includes(resource)) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (pending.type === "yearOfPlenty") {
    const remaining = pending.remaining - 1;
    return {
      ...game,
      players: game.players.map((candidate) => candidate.id === playerId
        ? { ...candidate, resources: { ...candidate.resources, [resource]: candidate.resources[resource] + 1 } }
        : candidate),
      pendingDevelopment: remaining ? { ...pending, remaining } : null,
      log: [`${player.name} chose ${RESOURCE_INFO[resource].short} from Year of Plenty.`, ...game.log].slice(0, 24),
    };
  }
  if (pending.type === "monopoly") {
    let collected = 0;
    const players = game.players.map((candidate) => {
      if (candidate.id === playerId) return candidate;
      const amount = candidate.resources[resource];
      collected += amount;
      return { ...candidate, resources: { ...candidate.resources, [resource]: 0 } };
    }).map((candidate) => candidate.id === playerId
      ? { ...candidate, resources: { ...candidate.resources, [resource]: candidate.resources[resource] + collected } }
      : candidate);
    return {
      ...game,
      players,
      pendingDevelopment: null,
      log: [`${player.name} monopolized ${RESOURCE_INFO[resource].short} and collected ${collected}.`, ...game.log].slice(0, 24),
    };
  }
  return game;
}

function completeBuild(game, playerId, kind, targetId) {
  const cost = COSTS[kind];
  const players = game.players.map((player) => {
    if (player.id !== playerId) return player;
    const paid = payCost(player, cost);
    let pointGain = ["road", "ship"].includes(kind) ? 0 : 1;
    let settledIslandIds = paid.settledIslandIds ?? [];
    if (kind === "settlement" && hasSeafarers(game)) {
      const vertex = boardForGame(game).vertices.find((candidate) => candidate.id === targetId);
      const foreignIslandId = vertex.tileIds.map((tileId) => game.tiles[tileId]?.islandId).find((islandId) => islandId && islandId !== "main");
      if (foreignIslandId && !settledIslandIds.includes(foreignIslandId)) {
        settledIslandIds = [...settledIslandIds, foreignIslandId];
        pointGain += 2;
      }
    }
    return { ...paid, settledIslandIds, points: paid.points + pointGain };
  });
  const player = players.find((candidate) => candidate.id === playerId);
  const settlements = { ...game.settlements };
  const roads = { ...game.roads };
  const ships = { ...game.ships };
  if (kind === "road") roads[targetId] = playerId;
  if (kind === "ship") ships[targetId] = playerId;
  if (kind === "settlement") settlements[targetId] = { playerId, type: "settlement" };
  if (kind === "city") settlements[targetId] = { playerId, type: "city" };
  const winnerId = totalVictoryPoints(player) >= game.victoryTarget ? playerId : null;
  return {
    ...game,
    players,
    settlements,
    roads,
    ships,
    builtShipsThisTurn: kind === "ship" ? [...(game.builtShipsThisTurn ?? []), targetId] : game.builtShipsThisTurn ?? [],
    winnerId,
    log: [`${player.name} built a ${kind}${winnerId ? ` and reached ${game.victoryTarget} victory points!` : "."}`, ...game.log].slice(0, 24),
  };
}

function resolveRobberMove(game, tileId) {
  if (!game.pendingSeven || game.pendingSeven.phase !== "moveRobber" || tileId === game.robberTileId) return game;
  const tile = game.tiles.find((candidate) => candidate.id === tileId);
  if (!tile) return game;
  const activePlayer = game.players[game.currentPlayerIndex];
  const victimIds = [...new Set(
    tile.vertexIds
      .map((vertexId) => game.settlements[vertexId]?.playerId)
      .filter((playerId) => playerId && playerId !== activePlayer.id),
  )];
  const eligibleVictimIds = victimIds.filter((playerId) => {
    const player = game.players.find((candidate) => candidate.id === playerId);
    return player && totalResources(player.resources) > 0;
  });
  if (game.pendingSeven.source === "bishop") {
    const players = game.players.map((player) => ({ ...player, resources: { ...player.resources } }));
    const roller = players.find((player) => player.id === activePlayer.id);
    let stolen = 0;
    eligibleVictimIds.forEach((victimId) => {
      const victim = players.find((player) => player.id === victimId);
      const hiddenCards = cardTypesFor(game).flatMap((resource) => Array.from({ length: victim.resources[resource] }, () => resource));
      const resource = hiddenCards[Math.floor(Math.random() * hiddenCards.length)];
      if (!resource) return;
      victim.resources[resource] -= 1;
      roller.resources[resource] += 1;
      stolen += 1;
    });
    return {
      ...game,
      players,
      robberTileId: tileId,
      pendingSeven: null,
      log: [`${activePlayer.name} moved the robber with Bishop and stole ${stolen} hidden card${stolen === 1 ? "" : "s"} from adjacent opponents.`, ...game.log].slice(0, 24),
    };
  }
  const needsVictimChoice = eligibleVictimIds.length > 0;
  return {
    ...game,
    robberTileId: tileId,
    pendingSeven: needsVictimChoice
      ? { ...game.pendingSeven, phase: "chooseVictim", eligibleVictimIds }
      : null,
    log: [
      needsVictimChoice
        ? `${activePlayer.name} moved the robber and must choose an adjacent player to steal from.`
        : `${activePlayer.name} moved the robber. No adjacent player had a card to steal.`,
      ...game.log,
    ].slice(0, 24),
  };
}

function selectRobberVictim(game, victimId) {
  const pending = game.pendingSeven;
  if (!pending || pending.phase !== "chooseVictim" || !pending.eligibleVictimIds.includes(victimId)) return game;
  const victim = game.players.find((player) => player.id === victimId);
  if (!victim || totalResources(victim.resources) === 0) {
    return { ...game, pendingSeven: null };
  }
  return {
    ...game,
    pendingSeven: { ...pending, phase: "chooseCard", victimId },
    log: [`${game.players[game.currentPlayerIndex].name} chose to steal from ${victim.name}.`, ...game.log].slice(0, 24),
  };
}

function resolveRobberSteal(game, cardIndex) {
  const pending = game.pendingSeven;
  if (!pending || pending.phase !== "chooseCard" || !Number.isInteger(cardIndex)) return game;
  const players = game.players.map((player) => ({ ...player, resources: { ...player.resources } }));
  const roller = players[game.currentPlayerIndex];
  const victim = players.find((player) => player.id === pending.victimId);
  if (!victim || cardIndex < 0 || cardIndex >= totalResources(victim.resources)) return game;
  const availableResources = cardTypesFor(game).filter((resource) => victim.resources[resource] > 0);
  const stolenResource = availableResources[Math.floor(Math.random() * availableResources.length)];
  victim.resources[stolenResource] -= 1;
  roller.resources[stolenResource] += 1;
  return {
    ...game,
    players,
    pendingSeven: null,
    log: [`${roller.name} picked a face-down card from ${victim.name}.`, ...game.log].slice(0, 24),
  };
}

function resolvePirateMove(game, tileId) {
  if (!game.pendingSeven || game.pendingSeven.phase !== "movePirate" || tileId === game.pirateTileId) return game;
  const tile = game.tiles.find((candidate) => candidate.id === tileId);
  if (!tile || tile.resource !== "sea") return game;
  const activePlayer = game.players[game.currentPlayerIndex];
  const eligibleVictimIds = eligiblePirateVictimIds(boardForGame(game), game.ships, tileId, game.players, activePlayer.id);
  return {
    ...game,
    pirateTileId: tileId,
    pendingSeven: eligibleVictimIds.length
      ? { ...game.pendingSeven, phase: "chooseVictim", eligibleVictimIds, stealSource: "pirate" }
      : null,
    log: [eligibleVictimIds.length
      ? `${activePlayer.name} moved the pirate and must choose an adjacent ship owner.`
      : `${activePlayer.name} moved the pirate. No adjacent ship owner had a card to steal.`, ...game.log].slice(0, 24),
  };
}

function resolveGoldChoice(game, playerId, resource) {
  const claim = game.pendingGold?.claims?.[0];
  if (!claim || claim.playerId !== playerId || !RESOURCES.includes(resource)) return game;
  const players = game.players.map((player) => player.id === playerId
    ? { ...player, resources: { ...player.resources, [resource]: player.resources[resource] + 1 } }
    : player);
  const claims = claim.count > 1
    ? [{ ...claim, count: claim.count - 1 }, ...game.pendingGold.claims.slice(1)]
    : game.pendingGold.claims.slice(1);
  const player = players.find((candidate) => candidate.id === playerId);
  return {
    ...game,
    players,
    pendingGold: claims.length ? { claims } : null,
    log: [`${player.name} chose ${RESOURCE_INFO[resource].short.toLowerCase()} from a gold field.`, ...game.log].slice(0, 24),
  };
}

function awardProgressCards(game, color, redDie) {
  if (!hasCitiesKnights(game) || !PROGRESS_DECKS[color]) return game;
  const citiesKnights = {
    ...game.citiesKnights,
    progressDecks: Object.fromEntries(Object.entries(game.citiesKnights.progressDecks).map(([track, deck]) => [track, [...deck]])),
  };
  let players = game.players.map((player) => ({ ...player, progressCards: [...(player.progressCards ?? [])] }));
  const order = Array.from({ length: players.length }, (_, offset) => (game.currentPlayerIndex + offset) % players.length);
  const awardedNames = [];
  for (const playerIndex of order) {
    const player = players[playerIndex];
    const level = citiesKnights.improvements?.[player.id]?.[color] ?? 0;
    if (!progressCardEligible(level, redDie) || citiesKnights.progressDecks[color].length === 0) continue;
    const type = citiesKnights.progressDecks[color].shift();
    const info = PROGRESS_CARD_INFO[type];
    awardedNames.push(player.name);
    const winsImmediately = info.victoryPoint && totalVictoryPoints(player) === game.victoryTarget - 1;
    if (winsImmediately) {
      players[playerIndex] = {
        ...player,
        points: player.points + 1,
        progressVictoryPoints: (player.progressVictoryPoints ?? 0) + 1,
      };
    } else {
      players[playerIndex] = {
        ...player,
        progressCards: [...player.progressCards, { id: `${game.turn}-${color}-${player.id}-${citiesKnights.progressDecks[color].length}`, type, color, drawnTurn: game.turn }],
      };
    }
  }
  const overLimitPlayerIds = order
    .map((index) => players[index])
    .filter((player) => player.progressCards.length > 4)
    .map((player) => player.id);
  const firstOverLimitId = overLimitPlayerIds[0];
  const pendingProgressDiscard = firstOverLimitId
    ? { playerIds: overLimitPlayerIds, currentPlayerId: firstOverLimitId, required: players.find((player) => player.id === firstOverLimitId).progressCards.length - 4 }
    : null;
  const winner = players.find((player) => totalVictoryPoints(player) >= game.victoryTarget);
  return {
    ...game,
    players,
    citiesKnights,
    pendingProgressDiscard,
    winnerId: winner?.id ?? game.winnerId,
    log: [awardedNames.length
      ? `${awardedNames.join(", ")} drew a ${color} progress card because the red die showed ${redDie}.`
      : `No player qualified for a ${color} progress card on red ${redDie}.`, ...game.log].slice(0, 24),
  };
}

function discardProgressCardFor(game, playerId, cardId) {
  const pending = game.pendingProgressDiscard;
  if (!pending || pending.currentPlayerId !== playerId) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  const card = player?.progressCards.find((candidate) => candidate.id === cardId);
  if (!card) return game;
  const players = game.players.map((candidate) => candidate.id === playerId
    ? { ...candidate, progressCards: candidate.progressCards.filter((candidateCard) => candidateCard.id !== cardId) }
    : candidate);
  const progressDecks = {
    ...game.citiesKnights.progressDecks,
    [card.color]: [...game.citiesKnights.progressDecks[card.color], card.type],
  };
  const required = pending.required - 1;
  let pendingProgressDiscard = required > 0 ? { ...pending, required } : null;
  if (!pendingProgressDiscard) {
    const remainingIds = pending.playerIds.slice(1);
    const nextPlayerId = remainingIds[0];
    if (nextPlayerId) {
      pendingProgressDiscard = {
        playerIds: remainingIds,
        currentPlayerId: nextPlayerId,
        required: Math.max(1, players.find((candidate) => candidate.id === nextPlayerId).progressCards.length - 4),
      };
    }
  }
  return {
    ...game,
    players,
    citiesKnights: { ...game.citiesKnights, progressDecks },
    pendingProgressDiscard,
    log: [`${player.name} returned a progress card to the bottom of its deck.`, ...game.log].slice(0, 24),
  };
}

function computerHasAction(game) {
  const isComputer = (id) => game.players.some((player) => player.id === id && player.isComputer);
  if (game.pendingSeven?.phase === "discard") return isComputer(game.pendingSeven.remainingDiscardPlayerIds[0]);
  if (game.pendingGold) return isComputer(game.pendingGold.claims[0]?.playerId);
  if (game.pendingTrade) {
    return game.players.some((player) => player.isComputer
      && player.id !== game.pendingTrade.fromPlayerId
      && !game.pendingTrade.declinedPlayerIds?.includes(player.id)
      && (!game.pendingTrade.toPlayerId || game.pendingTrade.toPlayerId === player.id));
  }
  if (game.pendingCityLoss) return isComputer(game.pendingCityLoss.currentPlayerId);
  if (game.pendingProgressDiscard) return isComputer(game.pendingProgressDiscard.currentPlayerId);
  if (game.pendingProgress) return isComputer(game.pendingProgress.chooserId);
  return Boolean(game.players[game.currentPlayerIndex]?.isComputer);
}

function discardForComputer(game, playerId) {
  const pending = game.pendingSeven;
  const player = game.players.find((candidate) => candidate.id === playerId);
  const required = pending?.discardCounts?.[playerId] ?? 0;
  if (!player || pending?.phase !== "discard" || pending.remainingDiscardPlayerIds[0] !== playerId) return game;
  const resources = chooseCatanDiscards(player, required, cardTypesFor(game));
  const remainingDiscardPlayerIds = pending.remainingDiscardPlayerIds.slice(1);
  const phase = remainingDiscardPlayerIds.length ? "discard" : pending.afterDiscardPhase;
  return {
    ...game,
    players: game.players.map((candidate) => candidate.id === playerId ? { ...candidate, resources } : candidate),
    pendingSeven: phase ? { ...pending, phase, remainingDiscardPlayerIds } : null,
    log: [`${player.name} discarded ${required} card${required === 1 ? "" : "s"}.`, ...game.log].slice(0, 24),
  };
}

function bestComputerRobberTile(game) {
  const computerId = game.players[game.currentPlayerIndex].id;
  return chooseCatanRobberTile(game, computerId);
}

function takeComputerAction(game) {
  if (!game || game.phase !== "playing" || game.winnerId) return game;
  const board = boardForGame(game);
  const activePlayer = game.players[game.currentPlayerIndex];

  if (game.pendingSeven?.phase === "discard") {
    const discarderId = game.pendingSeven.remainingDiscardPlayerIds[0];
    return game.players.find((player) => player.id === discarderId)?.isComputer ? discardForComputer(game, discarderId) : game;
  }
  if (game.pendingGold) {
    const claimantId = game.pendingGold.claims[0]?.playerId;
    const claimant = game.players.find((player) => player.id === claimantId);
    return claimant?.isComputer ? resolveGoldChoice(game, claimantId, chooseCatanResource(claimant)) : game;
  }
  if (game.pendingTrade) {
    const responder = game.players.find((player) => player.isComputer
      && player.id !== game.pendingTrade.fromPlayerId
      && !game.pendingTrade.declinedPlayerIds?.includes(player.id)
      && (!game.pendingTrade.toPlayerId || game.pendingTrade.toPlayerId === player.id));
    return responder ? resolveTradeResponse(
      game,
      canProvideTradeResources(responder, game.pendingTrade.request)
        && computerAcceptsCatanTrade(responder, game.pendingTrade.offer, game.pendingTrade.request),
      responder.id,
    ) : game;
  }
  if (game.pendingCityLoss) {
    const loser = game.players.find((player) => player.id === game.pendingCityLoss.currentPlayerId);
    const cityId = [...game.pendingCityLoss.eligibleVertexIds]
      .sort((left, right) => {
        const leftVertex = board.vertices.find((vertex) => vertex.id === left);
        const rightVertex = board.vertices.find((vertex) => vertex.id === right);
        return scoreCatanVertex(game, leftVertex) - scoreCatanVertex(game, rightVertex);
      })[0];
    return loser?.isComputer ? pillageChosenCity(game, loser.id, cityId) : game;
  }
  if (game.pendingProgressDiscard) {
    const holder = game.players.find((player) => player.id === game.pendingProgressDiscard.currentPlayerId);
    return holder?.isComputer ? discardProgressCardFor(game, holder.id, holder.progressCards[0]?.id) : game;
  }
  if (game.pendingProgress) {
    const chooser = game.players.find((player) => player.id === game.pendingProgress.chooserId);
    const choice = game.pendingProgress.options?.[0]?.id;
    return chooser?.isComputer && choice != null ? resolveProgressCardChoice(game, chooser.id, choice, board) : game;
  }
  if (!activePlayer?.isComputer) return game;

  if (game.setup?.step === "settlement") {
    const legalVertices = board.vertices.filter((candidate) =>
      isSettlementLegal(board, candidate.id, game.settlements, false, activePlayer.id, game.roads, game.ships)
      && (!hasSeafarers(game) || candidate.tileIds.some((tileId) => game.tiles[tileId]?.islandId === "main")));
    const vertex = chooseBestCatanVertex(game, legalVertices);
    return vertex ? placeStartingSettlement(game, activePlayer.id, vertex.id) : game;
  }
  if (game.setup?.step === "road") {
    const touchingEdges = board.edges.filter((edge) => [edge.from, edge.to].includes(game.setup.settlementVertexId));
    const road = chooseBestCatanEdge(game, board, touchingEdges.filter((edge) => isTransportLegal(board, edge, activePlayer.id, game.roads, game.ships, game.settlements, "road", game.tiles, game.pirateTileId, game.citiesKnights?.knights)));
    const ship = hasSeafarers(game) && chooseBestCatanEdge(game, board, touchingEdges.filter((edge) => isTransportLegal(board, edge, activePlayer.id, game.roads, game.ships, game.settlements, "ship", game.tiles, game.pirateTileId, game.citiesKnights?.knights)));
    return road ? placeStartingRoad(game, activePlayer.id, road.id, "road") : ship ? placeStartingRoad(game, activePlayer.id, ship.id, "ship") : game;
  }

  if (game.pendingSeven?.phase === "chooseToken") {
    return { ...game, pendingSeven: { ...game.pendingSeven, phase: "moveRobber" } };
  }
  if (game.pendingSeven?.phase === "moveRobber") {
    const tile = bestComputerRobberTile(game);
    return tile ? resolveRobberMove(game, tile.id) : game;
  }
  if (game.pendingSeven?.phase === "movePirate") {
    const tile = chooseCatanPirateTile(game, activePlayer.id);
    return tile ? resolvePirateMove(game, tile.id) : game;
  }
  if (game.pendingSeven?.phase === "chooseVictim") {
    const victimId = [...game.pendingSeven.eligibleVictimIds].sort((left, right) => {
      const leftPlayer = game.players.find((player) => player.id === left);
      const rightPlayer = game.players.find((player) => player.id === right);
      return totalResources(rightPlayer.resources) + rightPlayer.points * 2 - totalResources(leftPlayer.resources) - leftPlayer.points * 2;
    })[0];
    return selectRobberVictim(game, victimId);
  }
  if (game.pendingSeven?.phase === "chooseCard") return resolveRobberSteal(game, 0);

  if (game.pendingDevelopment?.playerId === activePlayer.id) {
    if (["yearOfPlenty", "monopoly"].includes(game.pendingDevelopment.type)) return resolveDevelopmentResourceChoice(game, activePlayer.id, chooseCatanResource(activePlayer));
    if (game.pendingDevelopment.type === "roadBuilding") {
      const kind = game.pendingDevelopment.fixedKind ?? "road";
      const edge = chooseBestCatanEdge(game, board, board.edges.filter((candidate) => isTransportLegal(board, candidate, activePlayer.id, game.roads, game.ships, game.settlements, kind, game.tiles, game.pirateTileId, game.citiesKnights?.knights)));
      if (edge) return completeFreeTransport(game, activePlayer.id, edge.id, kind);
      return { ...game, pendingDevelopment: null, log: [`${activePlayer.name} had no legal place for another free ${kind}.`, ...game.log].slice(0, 24) };
    }
  }

  const isSecondary = game.pairedTurn?.stage === "secondary";
  if (!game.rolled && !isSecondary) {
    const { dieOne, dieTwo, eventDie } = catanRuntime.rollDice(game);
    return resolveDiceRoll(game, dieOne, dieTwo, eventDie);
  }

  if (!isSecondary && !game.developmentCardPlayedThisTurn) {
    // A card that cannot be played right now leaves the game unchanged; try the next one.
    for (const card of activePlayer.developmentCards.filter((candidate) => candidate.boughtTurn !== game.turn)) {
      const played = playDevelopmentCardFor(game, activePlayer.id, card.id);
      if (played !== game) return played;
    }
  }
  if (!isSecondary) {
    for (const card of activePlayer.progressCards.filter((candidate) => !Number.isInteger(candidate.drawnTurn) || candidate.drawnTurn !== game.turn)) {
      const played = playProgressCard(game, activePlayer.id, card.id, board);
      if (played !== game) return played;
    }
  }

  const cityVertexId = Object.entries(game.settlements)
    .filter(([, building]) => building.playerId === activePlayer.id && building.type === "settlement")
    .sort(([left], [right]) => {
      const leftVertex = board.vertices.find((vertex) => vertex.id === left);
      const rightVertex = board.vertices.find((vertex) => vertex.id === right);
      return scoreCatanVertex(game, rightVertex) - scoreCatanVertex(game, leftVertex);
    })[0]?.[0];
  if (cityVertexId && canAfford(activePlayer, COSTS.city)) return completeBuild(game, activePlayer.id, "city", cityVertexId);
  if (canAfford(activePlayer, COSTS.settlement)) {
    const vertex = chooseBestCatanVertex(game, board.vertices.filter((candidate) => isSettlementLegal(board, candidate.id, game.settlements, true, activePlayer.id, game.roads, game.ships)));
    if (vertex) return completeBuild(game, activePlayer.id, "settlement", vertex.id);
  }
  if (hasCitiesKnights(game)) {
    const inactiveKnightId = Object.entries(game.citiesKnights.knights)
      .find(([, knight]) => knight.playerId === activePlayer.id && !knight.active)?.[0];
    if (inactiveKnightId && (game.citiesKnights.barbarianDistance ?? 7) <= 4 && canAfford(activePlayer, COSTS.activateKnight)) return activateKnightAt(game, activePlayer.id, inactiveKnightId);

    const tracks = ["science", "trade", "politics"].sort((left, right) => (
      (game.citiesKnights.improvements[activePlayer.id]?.[right] ?? 0)
      - (game.citiesKnights.improvements[activePlayer.id]?.[left] ?? 0)
    ));
    for (const track of tracks) {
      const improved = improveCityTrack(game, activePlayer.id, track);
      if (improved !== game) return improved;
    }

    if ((game.citiesKnights.barbarianDistance ?? 7) <= 3 && canAfford(activePlayer, COSTS.knight)) {
      const knightVertex = board.vertices.find((vertex) => !game.settlements[vertex.id]
        && !game.citiesKnights.knights[vertex.id]
        && board.vertexEdges[vertex.id].some((edgeId) => game.roads[edgeId] === activePlayer.id || game.ships[edgeId] === activePlayer.id));
      if (knightVertex) {
        const built = buildKnight(game, activePlayer.id, knightVertex.id);
        if (built !== game) return built;
      }
    }

    if (totalResources(activePlayer.resources) > handLimitFor(game, activePlayer.id) - 2 && canAfford(activePlayer, COSTS.cityWall)) {
      const wallCityId = Object.entries(game.settlements).find(([vertexId, building]) => (
        building.playerId === activePlayer.id
        && building.type === "city"
        && !game.citiesKnights.cityWalls[vertexId]
      ))?.[0];
      if (wallCityId) {
        const walled = buildCityWall(game, activePlayer.id, wallCityId);
        if (walled !== game) return walled;
      }
    }
  }
  if (canAfford(activePlayer, COSTS.road)) {
    const edge = chooseBestCatanEdge(game, board, board.edges.filter((candidate) => isTransportLegal(board, candidate, activePlayer.id, game.roads, game.ships, game.settlements, "road", game.tiles, game.pirateTileId, game.citiesKnights?.knights)));
    if (edge) return completeBuild(game, activePlayer.id, "road", edge.id);
  }
  if (hasSeafarers(game) && canAfford(activePlayer, COSTS.ship)) {
    const edge = chooseBestCatanEdge(game, board, board.edges.filter((candidate) => isTransportLegal(board, candidate, activePlayer.id, game.roads, game.ships, game.settlements, "ship", game.tiles, game.pirateTileId, game.citiesKnights?.knights)));
    if (edge) return completeBuild(game, activePlayer.id, "ship", edge.id);
  }
  if (usesDevelopmentCards(game) && game.developmentDeck.length && canAfford(activePlayer, COSTS.development)) return buyDevelopmentCardFor(game, activePlayer.id);
  return advanceGameTurn(game);
}

function advanceBarbarians(game) {
  const citiesKnights = { ...game.citiesKnights };
  if (citiesKnights.barbarianDistance > 1) {
    citiesKnights.barbarianDistance -= 1;
    return {
      ...game,
      citiesKnights,
      barbarianAlert: citiesKnights.barbarianDistance === 1
        ? { id: `warning-${game.turn}-${Date.now()}`, createdAt: Date.now(), kind: "warning", message: "Warning: the barbarians are one space away!" }
        : game.barbarianAlert,
      log: [`The barbarian ship advanced to ${citiesKnights.barbarianDistance} spaces away.`, ...game.log].slice(0, 24),
    };
  }

  return resolveBarbarianAttack(game);
}

function buildKnight(game, playerId, vertexId) {
  if (!hasCitiesKnights(game) || game.settlements[vertexId] || game.citiesKnights.knights[vertexId]) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  const playerKnights = Object.values(game.citiesKnights.knights).filter((knight) => knight.playerId === playerId);
  if (!player || !canAfford(player, COSTS.knight) || playerKnights.length >= 6 || playerKnights.filter((knight) => knight.level === 1).length >= 2) return game;
  return {
    ...game,
    players: game.players.map((candidate) => candidate.id === playerId ? payCost(candidate, COSTS.knight) : candidate),
    citiesKnights: { ...game.citiesKnights, knights: { ...game.citiesKnights.knights, [vertexId]: { playerId, level: 1, active: false } } },
    log: [`${player.name} built an inactive knight.`, ...game.log].slice(0, 24),
  };
}

function promoteKnightAt(game, playerId, vertexId) {
  if (!canPromoteKnight(game, playerId, vertexId)) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player || !canAfford(player, COSTS.promoteKnight)) return game;
  const knight = game.citiesKnights.knights[vertexId];
  return {
    ...game,
    players: game.players.map((candidate) => candidate.id === playerId ? payCost(candidate, COSTS.promoteKnight) : candidate),
    citiesKnights: {
      ...game.citiesKnights,
      knights: { ...game.citiesKnights.knights, [vertexId]: { ...knight, level: knight.level + 1 } },
      promotedKnightIdsThisTurn: [...(game.citiesKnights.promotedKnightIdsThisTurn ?? []), vertexId],
    },
    log: [`${player.name} promoted a knight to level ${knight.level + 1}; its active status stayed the same.`, ...game.log].slice(0, 24),
  };
}

function activateKnightAt(game, playerId, vertexId) {
  const knight = game.citiesKnights?.knights?.[vertexId];
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!knight || knight.playerId !== playerId || knight.active || !canAfford(player, COSTS.activateKnight)) return game;
  return {
    ...game,
    players: game.players.map((candidate) => candidate.id === playerId ? payCost(candidate, COSTS.activateKnight) : candidate),
    citiesKnights: { ...game.citiesKnights, knights: { ...game.citiesKnights.knights, [vertexId]: { ...knight, active: true } } },
    log: [`${player.name} activated a knight for the next barbarian attack.`, ...game.log].slice(0, 24),
  };
}

function buildCityWall(game, playerId, vertexId) {
  const city = game.settlements[vertexId];
  const player = game.players.find((candidate) => candidate.id === playerId);
  const wallCount = Object.values(game.citiesKnights.cityWalls).filter((ownerId) => ownerId === playerId).length;
  if (city?.playerId !== playerId || city.type !== "city" || game.citiesKnights.cityWalls[vertexId] || wallCount >= 3 || !canAfford(player, COSTS.cityWall)) return game;
  return {
    ...game,
    players: game.players.map((candidate) => candidate.id === playerId ? payCost(candidate, COSTS.cityWall) : candidate),
    citiesKnights: { ...game.citiesKnights, cityWalls: { ...game.citiesKnights.cityWalls, [vertexId]: playerId } },
    log: [`${player.name} built a city wall and may hold 2 extra cards on a seven.`, ...game.log].slice(0, 24),
  };
}

function improveCityTrack(game, playerId, track) {
  const commodityForTrack = { trade: "cloth", politics: "coin", science: "paper" };
  const commodity = commodityForTrack[track];
  const player = game.players.find((candidate) => candidate.id === playerId);
  const hasCity = Object.values(game.settlements).some((building) => building.playerId === playerId && building.type === "city");
  const currentLevel = game.citiesKnights?.improvements?.[playerId]?.[track] ?? 0;
  const craneDiscount = game.citiesKnights?.cranePlayerIds?.includes(playerId) ? 1 : 0;
  const cost = Math.max(0, currentLevel + 1 - craneDiscount);
  if (!commodity || !hasCity || currentLevel >= 5 || player.resources[commodity] < cost) return game;
  const improvements = { ...game.citiesKnights.improvements, [playerId]: { ...game.citiesKnights.improvements[playerId], [track]: currentLevel + 1 } };
  let metropolises = { ...game.citiesKnights.metropolises };
  let players = game.players.map((candidate) => candidate.id === playerId
    ? { ...candidate, resources: { ...candidate.resources, [commodity]: candidate.resources[commodity] - cost } }
    : candidate);
  const holderId = metropolises[track];
  const holderLevel = holderId ? improvements[holderId]?.[track] ?? 0 : -1;
  if (currentLevel + 1 >= 4 && (!holderId || (holderId !== playerId && currentLevel + 1 > holderLevel))) {
    metropolises[track] = playerId;
    players = players.map((candidate) => candidate.id === playerId
      ? { ...candidate, points: candidate.points + 2 }
      : candidate.id === holderId
        ? { ...candidate, points: candidate.points - 2 }
        : candidate);
  }
  const winner = players.find((candidate) => totalVictoryPoints(candidate) >= game.victoryTarget);
  return {
    ...game,
    players,
    citiesKnights: { ...game.citiesKnights, improvements, metropolises, cranePlayerIds: (game.citiesKnights.cranePlayerIds ?? []).filter((id) => id !== playerId) },
    winnerId: winner?.id ?? game.winnerId,
    log: [`${player.name} advanced ${track} to level ${currentLevel + 1}${metropolises[track] === playerId && holderId !== playerId ? " and claimed its metropolis" : ""}.`, ...game.log].slice(0, 24),
  };
}


export { createGame, createLobby, placeStartingSettlement, placeStartingRoad, isShipMovable, moveShip, resolveDiceRoll, advanceGameTurn, buyDevelopmentCardFor, playDevelopmentCardFor, completeFreeTransport, resolveDevelopmentResourceChoice, completeBuild, resolveRobberMove, selectRobberVictim, resolveRobberSteal, resolvePirateMove, resolveGoldChoice, awardProgressCards, discardProgressCardFor, computerHasAction, discardForComputer, bestComputerRobberTile, takeComputerAction, advanceBarbarians, buildKnight, promoteKnightAt, activateKnightAt, buildCityWall, improveCityTrack };
