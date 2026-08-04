"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Anchor,
  Castle,
  Check,
  Copy,
  Crown,
  Dice5,
  DoorOpen,
  Home,
  Map as MapIcon,
  Shield,
  Play,
  RefreshCcw,
  Route,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { CatanRoomService, isCatanOnlineSyncEnabled } from "./catan-room-service";
import {
  ALL_CARD_TYPES,
  advancePairedTurn,
  cardTypesFor,
  CATAN_RULESETS,
  canProvideTradeResources,
  cityProduction,
  COMMODITY_TYPES,
  createCitiesKnightsState,
  createPairedTurn,
  getPortTradeRate,
  handLimitFor,
  hasCitiesKnights,
  hasSeafarers,
  numberDeckForPlayers,
  normalizeRuleset,
  portTypesForPlayers,
  RESOURCE_TYPES,
  resolveTradeResponse,
  rollEventDie,
  terrainDeckForPlayers,
  usesExpandedBoard,
  victoryTargetFor,
} from "./catan-rules";

const playerIdStorageKey = "catan-player-id";
const playerNameStorageKey = "catan-player-name";

const SQRT3 = Math.sqrt(3);
const BOARD_CENTER = { x: 430, y: 340 };
const HEX_SIZE = 67;

const RESOURCE_INFO = {
  wood: { label: "Lumber", short: "Wood", icon: "♣", terrain: "forest" },
  brick: { label: "Brick", short: "Brick", icon: "▰", terrain: "hills" },
  sheep: { label: "Wool", short: "Wool", icon: "●", terrain: "pasture" },
  wheat: { label: "Grain", short: "Grain", icon: "✦", terrain: "fields" },
  ore: { label: "Ore", short: "Ore", icon: "◆", terrain: "mountains" },
  paper: { label: "Paper", short: "Paper", icon: "▤", terrain: "paper" },
  cloth: { label: "Cloth", short: "Cloth", icon: "▧", terrain: "cloth" },
  coin: { label: "Coin", short: "Coin", icon: "●", terrain: "coin" },
};

const RESOURCES = RESOURCE_TYPES;
const PLAYER_STYLES = [
  { color: "red", hex: "#bd3437" },
  { color: "gold", hex: "#e6aa24" },
  { color: "teal", hex: "#217c76" },
  { color: "navy", hex: "#385377" },
  { color: "purple", hex: "#7c4ba5" },
  { color: "orange", hex: "#d66a27" },
];
const COSTS = {
  road: { wood: 1, brick: 1 },
  ship: { wood: 1, sheep: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  knight: { sheep: 1, ore: 1 },
  activateKnight: { wheat: 1 },
  cityWall: { brick: 2 },
};

const axialTiles = [];
for (let q = -2; q <= 2; q += 1) {
  for (let r = Math.max(-2, -q - 2); r <= Math.min(2, -q + 2); r += 1) {
    axialTiles.push({ q, r });
  }
}
axialTiles.sort((a, b) => {
  const ay = a.r + a.q / 2;
  const by = b.r + b.q / 2;
  return ay === by ? a.q - b.q : ay - by;
});

function centerFor(q, r) {
  return {
    x: BOARD_CENTER.x + HEX_SIZE * 1.5 * q,
    y: BOARD_CENTER.y + HEX_SIZE * SQRT3 * (r + q / 2),
  };
}

function cornersFor(center, size = HEX_SIZE) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index);
    return {
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    };
  });
}

function geometry(tileSpecs, size, center, viewBoxHeight) {
  const vertexMap = new Map();
  const vertices = [];
  const edgeMap = new Map();
  const edges = [];
  const tiles = tileSpecs.map((tileSpec, tileIndex) => {
    const tileCenter = tileSpec.center;
    const vertexIds = cornersFor(tileCenter, size).map((point) => {
      const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
      if (!vertexMap.has(key)) {
        const id = `v${vertices.length}`;
        vertexMap.set(key, id);
        vertices.push({ id, ...point, tileIds: [] });
      }
      return vertexMap.get(key);
    });
    vertexIds.forEach((vertexId) => vertices.find((vertex) => vertex.id === vertexId).tileIds.push(tileIndex));
    vertexIds.forEach((from, index) => {
      const to = vertexIds[(index + 1) % 6];
      const key = [from, to].sort().join(":");
      if (!edgeMap.has(key)) {
        const id = `e${edges.length}`;
        edgeMap.set(key, id);
        edges.push({ id, from, to, tileIds: [tileIndex] });
      } else {
        edges.find((edge) => edge.id === edgeMap.get(key)).tileIds.push(tileIndex);
      }
    });
    return { id: tileIndex, center: tileCenter, vertexIds, axial: tileSpec.axial ?? null };
  });

  const vertexEdges = Object.fromEntries(vertices.map((vertex) => [vertex.id, []]));
  const neighbors = Object.fromEntries(vertices.map((vertex) => [vertex.id, []]));
  edges.forEach((edge) => {
    vertexEdges[edge.from].push(edge.id);
    vertexEdges[edge.to].push(edge.id);
    neighbors[edge.from].push(edge.to);
    neighbors[edge.to].push(edge.from);
  });
  return { tiles, vertices, edges, vertexEdges, neighbors, center, viewBoxHeight };
}

const baseTileSpecs = axialTiles.map((axial) => ({ axial, center: centerFor(axial.q, axial.r) }));
const expandedCenter = { x: 430, y: 390 };
const expandedHexSize = 61;
const expandedTileSpecs = [3, 4, 5, 6, 5, 4, 3].flatMap((rowLength, columnIndex) =>
  Array.from({ length: rowLength }, (_, rowIndex) => ({
    center: {
      x: expandedCenter.x + (columnIndex - 3) * expandedHexSize * 1.5,
      y: expandedCenter.y + (rowIndex - (rowLength - 1) / 2) * expandedHexSize * SQRT3,
    },
  })),
);

const BASE_BOARD = geometry(baseTileSpecs, HEX_SIZE, BOARD_CENTER, 680);
const EXPANDED_BOARD = geometry(expandedTileSpecs, expandedHexSize, expandedCenter, 780);

const seafarersAxials = [];
for (let q = -4; q <= 4; q += 1) {
  for (let r = Math.max(-4, -q - 4); r <= Math.min(4, -q + 4); r += 1) {
    seafarersAxials.push({ q, r });
  }
}
const seafarersCenter = { x: 430, y: 410 };
const seafarersHexSize = 48;
const SEAFARERS_BOARD = geometry(
  seafarersAxials.map((axial) => ({
    axial,
    center: {
      x: seafarersCenter.x + seafarersHexSize * 1.5 * axial.q,
      y: seafarersCenter.y + seafarersHexSize * SQRT3 * (axial.r + axial.q / 2),
    },
  })),
  seafarersHexSize,
  seafarersCenter,
  820,
);

function axialDistance(axial) {
  return Math.max(Math.abs(axial.q), Math.abs(axial.r), Math.abs(-axial.q - axial.r));
}

const FOREIGN_ISLANDS = new Map([
  ["4,0", "east"], ["3,1", "east"],
  ["-4,0", "west"], ["-3,-1", "west"],
  ["0,4", "south"], ["1,3", "south"],
]);

function boardForPlayerCount(playerCount, ruleset = "original") {
  if (hasSeafarers(ruleset)) return SEAFARERS_BOARD;
  return usesExpandedBoard(playerCount) ? EXPANDED_BOARD : BASE_BOARD;
}

function boardForGame(game) {
  return game?.board ?? BASE_BOARD;
}

function createPorts(board, portTypes) {
  const boundaryEdges = board.edges
    .filter((edge) => edge.tileIds.length === 1)
    .sort((first, second) => {
      const firstMidpoint = midpointForEdge(board, first);
      const secondMidpoint = midpointForEdge(board, second);
      return Math.atan2(firstMidpoint.y - board.center.y, firstMidpoint.x - board.center.x)
        - Math.atan2(secondMidpoint.y - board.center.y, secondMidpoint.x - board.center.x);
    });
  const shuffledTypes = shuffled(portTypes);
  return shuffledTypes.map((type, index) => {
    const edge = boundaryEdges[Math.floor((index + 0.5) * boundaryEdges.length / shuffledTypes.length) % boundaryEdges.length];
    return { id: `port-${index}`, edgeId: edge.id, from: edge.from, to: edge.to, type };
  });
}

function createSeafarersPorts(board, tiles, portTypes) {
  const coastalEdges = board.edges
    .filter((edge) => {
      if (edge.tileIds.length !== 2) return false;
      const edgeTiles = edge.tileIds.map((tileId) => tiles[tileId]);
      return edgeTiles.some((tile) => tile.islandId === "main") && edgeTiles.some((tile) => tile.resource === "sea");
    })
    .sort((first, second) => {
      const firstMidpoint = midpointForEdge(board, first);
      const secondMidpoint = midpointForEdge(board, second);
      return Math.atan2(firstMidpoint.y - board.center.y, firstMidpoint.x - board.center.x)
        - Math.atan2(secondMidpoint.y - board.center.y, secondMidpoint.x - board.center.x);
    });
  return shuffled(portTypes).map((type, index) => {
    const edge = coastalEdges[Math.floor((index + 0.5) * coastalEdges.length / portTypes.length) % coastalEdges.length];
    return { id: `port-${index}`, edgeId: edge.id, from: edge.from, to: edge.to, type };
  });
}

function midpointForEdge(board, edge) {
  const from = board.vertices.find((vertex) => vertex.id === edge.from);
  const to = board.vertices.find((vertex) => vertex.id === edge.to);
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function shuffled(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function emptyResources() {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, paper: 0, cloth: 0, coin: 0 };
}

function totalResources(resources) {
  return ALL_CARD_TYPES.reduce((sum, resource) => sum + (resources[resource] ?? 0), 0);
}

function canAfford(player, cost) {
  return Object.entries(cost).every(([resource, count]) => player.resources[resource] >= count);
}

function payCost(player, cost) {
  const resources = { ...player.resources };
  Object.entries(cost).forEach(([resource, count]) => {
    resources[resource] -= count;
  });
  return { ...player, resources };
}

function isSettlementLegal(board, vertexId, settlements, requireConnection, playerId, roads, ships = {}) {
  if (settlements[vertexId]) return false;
  if (board.neighbors[vertexId].some((neighbor) => settlements[neighbor])) return false;
  if (!requireConnection) return true;
  return board.vertexEdges[vertexId].some((edgeId) => roads[edgeId] === playerId || ships[edgeId] === playerId);
}

function edgeTouchesTerrain(edge, tiles, resource) {
  return edge.tileIds.some((tileId) => tiles[tileId]?.resource === resource);
}

function isTransportLegal(board, edge, playerId, roads, ships, settlements, kind, tiles, pirateTileId, knights = {}) {
  if (roads[edge.id] || ships[edge.id]) return false;
  if (kind === "road" && !edge.tileIds.some((tileId) => !["sea"].includes(tiles[tileId]?.resource))) return false;
  if (kind === "ship" && !edgeTouchesTerrain(edge, tiles, "sea")) return false;
  if (kind === "ship" && edge.tileIds.includes(pirateTileId)) return false;
  return [edge.from, edge.to].some((vertexId) => {
    const building = settlements[vertexId];
    if (building?.playerId === playerId) return true;
    if (building && building.playerId !== playerId) return false;
    const knight = knights[vertexId];
    if (knight && knight.playerId !== playerId) return false;
    const sameTransport = kind === "road" ? roads : ships;
    return board.vertexEdges[vertexId].some((edgeId) => sameTransport[edgeId] === playerId);
  });
}

function createGame(lobby) {
  const ruleset = normalizeRuleset(lobby.ruleset);
  const seafarers = hasSeafarers(ruleset);
  const citiesKnightsMode = hasCitiesKnights(ruleset);
  const board = boardForPlayerCount(lobby.players.length, ruleset);
  const terrainOrder = shuffled(terrainDeckForPlayers(lobby.players.length));
  const mainIslandTerrain = shuffled(terrainDeckForPlayers(4));
  const foreignTerrain = shuffled(["wood", "sheep", "wheat", "brick", "ore", "gold"]);
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
      ...style,
      resources: emptyResources(),
      points: 0,
      settledIslandIds: [],
      defenderPoints: 0,
    };
  });
  const desert = tiles.find((tile) => tile.resource === "desert");
  const startingPirateTile = tiles.find((tile) => tile.resource === "sea" && tile.axial?.q === 0 && tile.axial?.r === -4)
    ?? tiles.find((tile) => tile.resource === "sea");
  const setupOrder = [
    ...players.map((player) => player.id),
    ...[...players].reverse().map((player) => player.id),
  ];
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
    currentPlayerIndex: 0,
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
    movedShipThisTurn: false,
    builtShipsThisTurn: [],
    pairedTurn: createPairedTurn(players),
    citiesKnights: citiesKnightsMode ? createCitiesKnightsState(players) : null,
    setup: {
      order: setupOrder,
      index: 0,
      step: "settlement",
      settlementVertexId: null,
    },
    log: [
      `${CATAN_RULESETS[ruleset].label} begins. First to ${victoryTargetFor(ruleset)} victory points wins.`,
      `${players[0].name} chooses the first ${citiesKnightsMode ? "settlement (the second placement will be a city)" : "settlement"}.`,
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
    movedShipThisTurn: false,
    builtShipsThisTurn: [],
    pairedTurn: null,
    setup: null,
    log: [`${name} created room ${roomCode}.`],
    createdAt: now,
    updatedAt: now,
  };
}

export default function CatanClient() {
  const [isReady, setIsReady] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [buildMode, setBuildMode] = useState(null);
  const [tradeGive, setTradeGive] = useState("wood");
  const [tradeGet, setTradeGet] = useState("brick");
  const [discardSelection, setDiscardSelection] = useState(emptyResources);
  const [tradePartnerId, setTradePartnerId] = useState("any");
  const [playerTradeOffer, setPlayerTradeOffer] = useState(emptyResources);
  const [playerTradeRequest, setPlayerTradeRequest] = useState(emptyResources);
  const [shipMoveSource, setShipMoveSource] = useState(null);
  const latestGame = useRef(null);

  useEffect(() => {
    let storedId = localStorage.getItem(playerIdStorageKey);
    if (!storedId) {
      storedId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(playerIdStorageKey, storedId);
    }
    setPlayerId(storedId);
    setName(localStorage.getItem(playerNameStorageKey) || "");
    setJoinCode(new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "");
    setIsReady(true);
  }, []);

  useEffect(() => {
    latestGame.current = game;
  }, [game]);

  useEffect(() => {
    const code = joinCode.trim().toUpperCase();
    if (!isReady || !playerId || !code || game) return;
    let cancelled = false;
    void CatanRoomService.load(code).then((existing) => {
      if (cancelled || !existing?.players.some((player) => player.id === playerId)) return;
      setGame(existing);
      latestGame.current = existing;
      const me = existing.players.find((player) => player.id === playerId);
      if (me) setName(me.name);
      window.history.replaceState(null, "", `?room=${existing.roomCode}`);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [game, isReady, joinCode, playerId]);

  useEffect(() => {
    if (!game?.roomCode) return undefined;
    return CatanRoomService.subscribe(game.roomCode, (remote) => {
      setGame((current) => {
        const next = !current || remote.updatedAt >= current.updatedAt ? remote : current;
        latestGame.current = next;
        return next;
      });
    });
  }, [game?.roomCode]);

  const activePlayer = game?.players[game.currentPlayerIndex];
  const board = boardForGame(game);
  const discardingPlayerId = game?.pendingSeven?.phase === "discard"
    ? game.pendingSeven.remainingDiscardPlayerIds[0]
    : null;
  const discardingPlayer = game?.players.find((player) => player.id === discardingPlayerId);
  const viewerPlayer = game?.players.find((player) => player.id === playerId);
  const tradePartners = game?.players.filter((player) => player.id !== activePlayer?.id) ?? [];
  const tradePartner = tradePartnerId === "any"
    ? null
    : tradePartners.find((player) => player.id === tradePartnerId) ?? tradePartners[0];
  const placementMode = game?.setup?.step === "road" && hasSeafarers(game)
    ? buildMode ?? "road"
    : game?.setup?.step ?? buildMode;
  const isHost = game?.hostId === playerId;
  const isMyTurn = activePlayer?.id === playerId;
  const isPairedSecondary = game?.pairedTurn?.stage === "secondary";
  const bankTradeRate = game && activePlayer
    ? getPortTradeRate(game.ports, game.settlements, activePlayer.id, tradeGive)
    : 4;
  const activePlayerPorts = game?.ports?.filter((port) =>
    [port.from, port.to].some((vertexId) => game.settlements[vertexId]?.playerId === activePlayer?.id),
  ) ?? [];
  const legalVertices = useMemo(() => {
    if (!game || !activePlayer || !isMyTurn) return new Set();
    if (placementMode === "knight") {
      return new Set(board.vertices.filter((vertex) =>
        !game.settlements[vertex.id]
        && !game.citiesKnights?.knights?.[vertex.id]
        && board.vertexEdges[vertex.id].some((edgeId) => game.roads[edgeId] === activePlayer.id || game.ships[edgeId] === activePlayer.id),
      ).map((vertex) => vertex.id));
    }
    if (placementMode === "cityWall") {
      return new Set(Object.entries(game.settlements).filter(([vertexId, building]) =>
        building.playerId === activePlayer.id && building.type === "city" && !game.citiesKnights?.cityWalls?.[vertexId],
      ).map(([vertexId]) => vertexId));
    }
    if (placementMode !== "settlement") return new Set();
    const startingPlacement = Boolean(game.setup);
    return new Set(
      board.vertices
        .filter((vertex) =>
          isSettlementLegal(board, vertex.id, game.settlements, !startingPlacement, activePlayer.id, game.roads, game.ships)
          && (!startingPlacement || !hasSeafarers(game) || vertex.tileIds.some((tileId) => game.tiles[tileId]?.islandId === "main")),
        )
        .map((vertex) => vertex.id),
    );
  }, [activePlayer, board, game, isMyTurn, placementMode]);
  const legalEdges = useMemo(() => {
    if (!game || !activePlayer || !isMyTurn) return new Set();
    if (placementMode === "moveShipSource") {
      return new Set(board.edges.filter((edge) => isShipMovable(game, edge, activePlayer.id)).map((edge) => edge.id));
    }
    if (placementMode === "moveShip" && shipMoveSource) {
      const ships = { ...game.ships };
      delete ships[shipMoveSource];
      return new Set(board.edges.filter((edge) => isTransportLegal(board, edge, activePlayer.id, game.roads, ships, game.settlements, "ship", game.tiles, game.pirateTileId, game.citiesKnights?.knights)).map((edge) => edge.id));
    }
    if (!["road", "ship"].includes(placementMode)) return new Set();
    if (game.setup) {
      return new Set(
        board.edges
          .filter((edge) =>
            [edge.from, edge.to].includes(game.setup.settlementVertexId)
            && isTransportLegal(board, edge, activePlayer.id, game.roads, game.ships, game.settlements, placementMode, game.tiles, game.pirateTileId, game.citiesKnights?.knights),
          )
          .map((edge) => edge.id),
      );
    }
    return new Set(
      board.edges
        .filter((edge) => isTransportLegal(board, edge, activePlayer.id, game.roads, game.ships, game.settlements, placementMode, game.tiles, game.pirateTileId, game.citiesKnights?.knights))
        .map((edge) => edge.id),
    );
  }, [activePlayer, board, game, isMyTurn, placementMode, shipMoveSource]);

  const resetLocalControls = () => {
    setBuildMode(null);
    setDiscardSelection(emptyResources());
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
    setTradePartnerId("any");
    setShipMoveSource(null);
  };

  const usePlayerName = () => {
    const cleanName = name.trim() || "Player";
    localStorage.setItem(playerNameStorageKey, cleanName);
    setName(cleanName);
    return cleanName;
  };

  const persist = async (next) => {
    const saved = await CatanRoomService.save(next);
    setGame(saved);
    latestGame.current = saved;
    window.history.replaceState(null, "", `?room=${saved.roomCode}`);
  };

  const updateGame = async (updater) => {
    const current = latestGame.current;
    if (!current) return;
    try {
      const next = await CatanRoomService.update(current.roomCode, updater);
      if (!next) return;
      setGame(next);
      latestGame.current = next;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save that action.");
    }
  };

  const createRoom = async () => {
    setError("");
    try {
      const roomCode = await CatanRoomService.createCode();
      await persist(createLobby(roomCode, playerId, usePlayerName()));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create a room.");
    }
  };

  const joinRoom = async () => {
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code first.");
    try {
      const existing = await CatanRoomService.load(code);
      if (!existing) return setError(`Room ${code} was not found.`);
      const returning = existing.players.find((player) => player.id === playerId);
      if (returning) {
        setGame(existing);
        latestGame.current = existing;
        setName(returning.name);
        window.history.replaceState(null, "", `?room=${code}`);
        return;
      }
      if (existing.phase !== "lobby") return setError("That game has already started.");
      if (existing.players.length >= 6) return setError("That room already has six players.");
      const cleanName = usePlayerName();
      const next = await CatanRoomService.update(code, (state) => {
        const usedColors = new Set(state.players.map((player) => player.color));
        const style = PLAYER_STYLES.find((candidate) => !usedColors.has(candidate.color)) ?? PLAYER_STYLES[0];
        return {
          ...state,
          players: [...state.players, {
            id: playerId,
            name: cleanName,
            ...style,
            resources: emptyResources(),
            points: 0,
          }],
          log: [`${cleanName} joined the room.`, ...state.log].slice(0, 24),
        };
      });
      if (next) {
        setGame(next);
        latestGame.current = next;
        window.history.replaceState(null, "", `?room=${code}`);
      }
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join the room.");
    }
  };

  const startGame = () => {
    if (!game || !isHost || game.players.length < 2) return;
    void updateGame((state) => createGame(state));
    resetLocalControls();
    window.scrollTo(0, 0);
  };

  const selectPlayerColor = (color) => {
    if (!game || game.phase !== "lobby") return;
    const style = PLAYER_STYLES.find((candidate) => candidate.color === color);
    if (!style) return;
    void updateGame((current) => {
      if (current.phase !== "lobby") return current;
      const colorTaken = current.players.some((player) => player.id !== playerId && player.color === color);
      if (colorTaken) return current;
      return {
        ...current,
        players: current.players.map((player) => player.id === playerId ? { ...player, ...style } : player),
      };
    });
  };

  const selectRuleset = (ruleset) => {
    if (!game || !isHost || game.phase !== "lobby" || !CATAN_RULESETS[ruleset]) return;
    void updateGame((current) => current.phase === "lobby" ? {
      ...current,
      ruleset,
      log: [`${CATAN_RULESETS[ruleset].label} selected.`, ...current.log].slice(0, 24),
    } : current);
  };

  const leaveRoom = () => {
    setGame(null);
    latestGame.current = null;
    resetLocalControls();
    window.history.replaceState(null, "", "/catan");
  };

  const restartRoom = () => {
    if (!game || !isHost) return;
    void updateGame((current) => ({
      ...createLobby(current.roomCode, current.hostId, current.players[0].name),
      ruleset: current.ruleset,
      players: current.players.map((player, index) => ({
        id: player.id,
        name: player.name,
        ...(PLAYER_STYLES.find((style) => style.color === player.color) ?? PLAYER_STYLES[index]),
        resources: emptyResources(),
        points: 0,
      })),
      createdAt: current.createdAt,
      log: ["The room is ready for another game."],
    }));
    resetLocalControls();
  };

  const rollDice = () => {
    if (!game || !isMyTurn || isPairedSecondary || game.setup || game.pendingSeven || game.pendingGold || game.rolled || game.winnerId || isRolling) return;
    setIsRolling(true);
    setBuildMode(null);
    window.setTimeout(() => {
      const dieOne = Math.floor(Math.random() * 6) + 1;
      const dieTwo = Math.floor(Math.random() * 6) + 1;
      const total = dieOne + dieTwo;
      const eventDie = hasCitiesKnights(game) ? rollEventDie() : null;
      void updateGame((current) => {
        if (!current || current.rolled) return current;
        const players = current.players.map((player) => ({
          ...player,
          resources: { ...player.resources },
        }));
        const entries = [`${players[current.currentPlayerIndex].name} rolled ${dieOne} + ${dieTwo} = ${total}${eventDie ? ` · event die: ${eventDie}` : ""}.`];
        let robberTileId = current.robberTileId;
        let pendingSeven = null;
        const robberDormant = hasCitiesKnights(current) && !current.citiesKnights.attacks;
        const afterSevenPhase = robberDormant ? null : hasSeafarers(current) ? "chooseToken" : "moveRobber";
        const goldClaims = [];

        if (total === 7) {
          const discarders = players.filter((player) => totalResources(player.resources) > handLimitFor(current, player.id));
          pendingSeven = discarders.length ? {
            phase: "discard",
            remainingDiscardPlayerIds: discarders.map((player) => player.id),
            discardCounts: Object.fromEntries(
              discarders.map((player) => [player.id, Math.floor(totalResources(player.resources) / 2)]),
            ),
            afterDiscardPhase: afterSevenPhase,
          } : afterSevenPhase ? { phase: afterSevenPhase, remainingDiscardPlayerIds: [], discardCounts: {} } : null;
          entries.push(
            discarders.length
              ? `${discarders.map((player) => player.name).join(", ")} must discard half their resource cards.`
              : robberDormant
                ? "The robber and pirate remain inactive until the first barbarian attack."
                : `${players[current.currentPlayerIndex].name} must move the ${hasSeafarers(current) ? "robber or pirate" : "robber"}.`,
          );
        } else {
          const gains = Object.fromEntries(players.map((player) => [player.id, emptyResources()]));
          current.tiles.forEach((tile) => {
            if (tile.number !== total || tile.id === current.robberTileId || ["desert", "sea"].includes(tile.resource)) return;
            tile.vertexIds.forEach((vertexId) => {
              const building = current.settlements[vertexId];
              if (!building) return;
              const player = players.find((candidate) => candidate.id === building.playerId);
              const amount = building.type === "city" ? 2 : 1;
              if (tile.resource === "gold") {
                goldClaims.push({ playerId: building.playerId, count: amount });
                return;
              }
              const production = building.type === "city" && hasCitiesKnights(current)
                ? cityProduction(tile.resource)
                : { [tile.resource]: amount };
              Object.entries(production).forEach(([resource, count]) => {
                gains[building.playerId][resource] += count;
                player.resources[resource] += count;
              });
            });
          });
          const gainLines = players
            .map((player) => {
              const gain = gains[player.id];
              const text = cardTypesFor(current).filter((resource) => gain[resource] > 0)
                .map((resource) => `${gain[resource]} ${RESOURCE_INFO[resource].short.toLowerCase()}`)
                .join(", ");
              return text ? `${player.name}: ${text}` : null;
            })
            .filter(Boolean);
          entries.push(gainLines.length ? `Production — ${gainLines.join(" · ")}.` : "No settlements produced resources.");
        }

        let next = {
          ...current,
          players,
          dice: [dieOne, dieTwo],
          eventDie,
          robberTileId,
          pendingSeven,
          pendingGold: goldClaims.length ? { claims: goldClaims } : null,
          rolled: true,
          log: [...entries, ...current.log].slice(0, 24),
        };
        if (eventDie === "barbarian") next = advanceBarbarians(next);
        return next;
      });
      setIsRolling(false);
    }, 950);
  };

  const buildAtVertex = (vertexId) => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingGold || game.pendingTrade || game.winnerId) return;
    if (game.setup?.step === "settlement") {
      if (!legalVertices.has(vertexId)) return;
      if (!isMyTurn) return;
      void updateGame((current) => placeStartingSettlement(current, activePlayer.id, vertexId));
      return;
    }
    if (!game.rolled) return;
    if (buildMode === "settlement") {
      if (!legalVertices.has(vertexId) || !canAfford(activePlayer, COSTS.settlement)) return;
      if (!isMyTurn) return;
      void updateGame((current) => completeBuild(current, activePlayer.id, "settlement", vertexId));
      setBuildMode(null);
      return;
    }
    if (buildMode === "city") {
      const building = game.settlements[vertexId];
      if (building?.playerId !== activePlayer.id || building.type !== "settlement" || !canAfford(activePlayer, COSTS.city)) return;
      if (!isMyTurn) return;
      void updateGame((current) => completeBuild(current, activePlayer.id, "city", vertexId));
      setBuildMode(null);
      return;
    }
    if (buildMode === "knight" && legalVertices.has(vertexId) && canAfford(activePlayer, COSTS.knight)) {
      void updateGame((current) => buildKnight(current, activePlayer.id, vertexId));
      setBuildMode(null);
      return;
    }
    if (buildMode === "cityWall" && legalVertices.has(vertexId) && canAfford(activePlayer, COSTS.cityWall)) {
      void updateGame((current) => buildCityWall(current, activePlayer.id, vertexId));
      setBuildMode(null);
    }
  };

  const buildRoad = (edgeId) => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingGold || game.pendingTrade || game.winnerId || !legalEdges.has(edgeId)) return;
    if (game.setup?.step === "road") {
      if (!isMyTurn) return;
      void updateGame((current) => placeStartingRoad(current, activePlayer.id, edgeId, placementMode));
      return;
    }
    if (buildMode === "moveShipSource") {
      if (!isShipMovable(game, board.edges.find((edge) => edge.id === edgeId), activePlayer.id)) return;
      setShipMoveSource(edgeId);
      setBuildMode("moveShip");
      return;
    }
    if (buildMode === "moveShip" && shipMoveSource) {
      void updateGame((current) => moveShip(current, activePlayer.id, shipMoveSource, edgeId));
      setShipMoveSource(null);
      setBuildMode(null);
      return;
    }
    if (!["road", "ship"].includes(buildMode) || !game.rolled) return;
    if (!canAfford(activePlayer, COSTS[buildMode])) return;
    if (!isMyTurn) return;
    void updateGame((current) => completeBuild(current, activePlayer.id, buildMode, edgeId));
    setBuildMode(null);
  };

  const bankTrade = () => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingGold || game.pendingTrade || !game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < bankTradeRate) return;
    if (!isMyTurn) return;
    void updateGame((current) => {
      const players = current.players.map((player) => {
        if (player.id !== activePlayer.id) return player;
        return {
          ...player,
          resources: {
            ...player.resources,
            [tradeGive]: player.resources[tradeGive] - bankTradeRate,
            [tradeGet]: player.resources[tradeGet] + 1,
          },
        };
      });
      return {
        ...current,
        players,
        log: [
          `${activePlayer.name} used a ${bankTradeRate}:1 ${bankTradeRate < 4 ? "port" : "bank"} trade: ${RESOURCE_INFO[tradeGive].short.toLowerCase()} for ${RESOURCE_INFO[tradeGet].short.toLowerCase()}.`,
          ...current.log,
        ].slice(0, 24),
      };
    });
  };

  const adjustPlayerTrade = (side, resource, change) => {
    if (!game || !activePlayer || game.pendingTrade || !isMyTurn || isPairedSecondary) return;
    const setter = side === "offer" ? setPlayerTradeOffer : setPlayerTradeRequest;
    setter((current) => {
      const nextValue = current[resource] + change;
      const maximum = side === "offer" ? activePlayer.resources[resource] : 19;
      if (nextValue < 0 || nextValue > maximum) return current;
      return { ...current, [resource]: nextValue };
    });
  };

  const proposePlayerTrade = () => {
    if (!game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || !activePlayer || isPairedSecondary) return;
    const openOffer = tradePartnerId === "any";
    if (!openOffer && !tradePartner) return;
    if (totalResources(playerTradeOffer) === 0 || totalResources(playerTradeRequest) === 0) return;
    const validOffer = cardTypesFor(game).every((resource) => playerTradeOffer[resource] <= activePlayer.resources[resource]);
    if (!validOffer) return;
    if (!isMyTurn) return;
    void updateGame((current) => ({
      ...current,
      pendingTrade: {
        fromPlayerId: activePlayer.id,
        toPlayerId: openOffer ? null : tradePartner.id,
        offer: { ...playerTradeOffer },
        request: { ...playerTradeRequest },
        declinedPlayerIds: [],
      },
      log: [`${activePlayer.name} offered ${openOffer ? "any player" : tradePartner.name} a trade.`, ...current.log].slice(0, 24),
    }));
  };

  const respondToPlayerTrade = (accepted) => {
    if (!game?.pendingTrade) return;
    void updateGame((current) => resolveTradeResponse(current, accepted, playerId));
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
  };

  const endTurn = () => {
    if (!game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.winnerId) return;
    if (!isMyTurn) return;
    void updateGame((current) => {
      if (current.pairedTurn) {
        const nextPairedTurn = advancePairedTurn(current.players, current.pairedTurn);
        if (nextPairedTurn.stage === "secondary") {
          const secondaryIndex = current.players.findIndex((player) => player.id === nextPairedTurn.secondaryPlayerId);
          return {
            ...current,
            currentPlayerIndex: secondaryIndex,
            pairedTurn: nextPairedTurn,
            log: [`${current.players[secondaryIndex].name} now takes the paired build and bank-trade phase.`, ...current.log].slice(0, 24),
          };
        }
        const nextPrimaryIndex = current.players.findIndex((player) => player.id === nextPairedTurn.primaryPlayerId);
        return {
          ...current,
          currentPlayerIndex: nextPrimaryIndex,
          pairedTurn: nextPairedTurn,
          turn: nextPrimaryIndex === 0 ? current.turn + 1 : current.turn,
          rolled: false,
          movedShipThisTurn: false,
          builtShipsThisTurn: [],
          log: [`${current.players[nextPrimaryIndex].name} is the next dice player.`, ...current.log].slice(0, 24),
        };
      }
      const nextIndex = (current.currentPlayerIndex + 1) % current.players.length;
      return {
        ...current,
        currentPlayerIndex: nextIndex,
        turn: nextIndex === 0 ? current.turn + 1 : current.turn,
        rolled: false,
        movedShipThisTurn: false,
        builtShipsThisTurn: [],
        log: [`${current.players[nextIndex].name} is up next.`, ...current.log].slice(0, 24),
      };
    });
    setBuildMode(null);
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
    setTradePartnerId("any");
    setShipMoveSource(null);
  };

  const adjustDiscard = (resource, change) => {
    if (!discardingPlayer || !game?.pendingSeven || game.pendingSeven.phase !== "discard") return;
    if (discardingPlayer.id !== playerId) return;
    const required = game.pendingSeven.discardCounts[discardingPlayer.id];
    setDiscardSelection((current) => {
      const selected = totalResources(current);
      const nextValue = current[resource] + change;
      if (nextValue < 0 || nextValue > discardingPlayer.resources[resource]) return current;
      if (change > 0 && selected >= required) return current;
      return { ...current, [resource]: nextValue };
    });
  };

  const confirmDiscard = () => {
    if (!discardingPlayer || !game?.pendingSeven || game.pendingSeven.phase !== "discard") return;
    const required = game.pendingSeven.discardCounts[discardingPlayer.id];
    if (totalResources(discardSelection) !== required) return;
    if (discardingPlayer.id !== playerId) return;
    void updateGame((current) => {
      if (!current?.pendingSeven || current.pendingSeven.phase !== "discard") return current;
      const players = current.players.map((player) => {
        if (player.id !== discardingPlayer.id) return player;
        const resources = { ...player.resources };
        cardTypesFor(current).forEach((resource) => {
          resources[resource] -= discardSelection[resource];
        });
        return { ...player, resources };
      });
      const remainingDiscardPlayerIds = current.pendingSeven.remainingDiscardPlayerIds.slice(1);
      const phase = remainingDiscardPlayerIds.length ? "discard" : current.pendingSeven.afterDiscardPhase;
      return {
        ...current,
        players,
        pendingSeven: phase ? {
          ...current.pendingSeven,
          phase,
          remainingDiscardPlayerIds,
        } : null,
        log: [
          `${discardingPlayer.name} discarded ${required} card${required === 1 ? "" : "s"}.${phase && phase !== "discard" ? ` ${current.players[current.currentPlayerIndex].name} must now move the ${phase === "chooseToken" ? "robber or pirate" : "robber"}.` : ""}`,
          ...current.log,
        ].slice(0, 24),
      };
    });
    setDiscardSelection(emptyResources());
  };

  const moveRobber = (tileId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "moveRobber" || tileId === game.robberTileId) return;
    if (!isMyTurn) return;
    void updateGame((current) => resolveRobberMove(current, tileId));
  };

  const chooseSevenToken = (token) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseToken" || !isMyTurn) return;
    void updateGame((current) => ({
      ...current,
      pendingSeven: { ...current.pendingSeven, phase: token === "pirate" ? "movePirate" : "moveRobber" },
    }));
  };

  const movePirate = (tileId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "movePirate" || tileId === game.pirateTileId || !isMyTurn) return;
    void updateGame((current) => resolvePirateMove(current, tileId));
  };

  const chooseRobberVictim = (playerId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseVictim") return;
    if (!isMyTurn) return;
    void updateGame((current) => selectRobberVictim(current, playerId));
  };

  const stealRobberCard = (cardIndex) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseCard") return;
    if (!isMyTurn) return;
    void updateGame((current) => resolveRobberSteal(current, cardIndex));
  };

  const chooseGoldResource = (resource) => {
    if (!game?.pendingGold || !RESOURCES.includes(resource)) return;
    const claim = game.pendingGold.claims[0];
    if (claim?.playerId !== playerId) return;
    void updateGame((current) => resolveGoldChoice(current, playerId, resource));
  };

  const activateKnight = (vertexId) => {
    if (!isMyTurn || !game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade) return;
    void updateGame((current) => activateKnightAt(current, activePlayer.id, vertexId));
  };

  const improveCity = (track) => {
    if (!isMyTurn || !game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade) return;
    void updateGame((current) => improveCityTrack(current, activePlayer.id, track));
  };

  if (!isReady) {
    return <main className="catan-page catan-setup-page"><section className="catan-setup-card"><p>Loading Catan…</p></section></main>;
  }

  if (!game) {
    return (
      <main className="catan-page catan-setup-page">
        <section className="catan-setup-card">
          <div className="catan-mark" aria-hidden="true"><span /><span /><span /></div>
          <p className="catan-kicker">The island awaits</p>
          <h1>CATAN</h1>
          <p className="catan-intro">Create a shared room for up to six settlers. Five- and six-player rooms use the expanded island and paired-player turns.</p>

          <label className="catan-entry-field">
            <span>Your name</span>
            <input value={name} maxLength={18} placeholder="Enter your name" onChange={(event) => setName(event.target.value)} />
          </label>

          <button className="catan-primary catan-start" onClick={createRoom}>
            <MapIcon size={19} /> Create room
          </button>

          <div className="entry-divider"><span>or join a room</span></div>
          <div className="join-room-row">
            <input value={joinCode} maxLength={5} placeholder="ROOM CODE" aria-label="Room code" onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
            <button onClick={joinRoom}><DoorOpen size={18} /> Join</button>
          </div>
          {error && <p className="catan-room-error">{error}</p>}
          <p className="setup-note">2–6 players · Live room sync {isCatanOnlineSyncEnabled ? "enabled" : "uses this game server"}</p>
        </section>
      </main>
    );
  }

  if (game.phase === "lobby") {
    const roomLink = typeof window === "undefined" ? "" : `${window.location.origin}/catan?room=${game.roomCode}`;
    return (
      <main className="catan-page catan-setup-page">
        <section className="catan-setup-card catan-lobby-card">
          <p className="catan-kicker">Gather your settlers</p>
          <h1>CATAN</h1>
          <div className="room-code-panel">
            <span>Room code</span>
            <strong>{game.roomCode}</strong>
            <button onClick={() => {
              void navigator.clipboard.writeText(roomLink);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
          </div>
          <div className="lobby-player-list">
            {game.players.map((player) => (
              <div key={player.id}>
                <span className={`player-swatch ${player.color}`} />
                <strong>{player.name}</strong>
                <small>{player.id === game.hostId ? "Host" : player.id === playerId ? "You" : "Ready"}</small>
              </div>
            ))}
            {Array.from({ length: 6 - game.players.length }, (_, index) => <div key={`empty-${index}`} className="empty"><span /> Waiting for player…</div>)}
          </div>
          <div className="lobby-color-picker">
            <strong>Choose your color</strong>
            <div>
              {PLAYER_STYLES.map((style) => {
                const takenByAnother = game.players.some((player) => player.id !== playerId && player.color === style.color);
                const selected = viewerPlayer?.color === style.color;
                return (
                  <button
                    key={style.color}
                    className={`${style.color} ${selected ? "selected" : ""}`}
                    disabled={takenByAnother}
                    aria-label={`Choose ${style.color}`}
                    aria-pressed={selected}
                    onClick={() => selectPlayerColor(style.color)}
                  >
                    <span style={{ background: style.hex }} />
                    {style.color}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ruleset-picker">
            <div>
              <strong>Game rules</strong>
              <span>Host chooses · applies to every device</span>
            </div>
            <div className="ruleset-options">
              {Object.entries(CATAN_RULESETS).map(([ruleset, info]) => (
                <button
                  key={ruleset}
                  className={game.ruleset === ruleset ? "selected" : ""}
                  disabled={!isHost}
                  onClick={() => selectRuleset(ruleset)}
                >
                  <span>{hasSeafarers(ruleset) ? <Anchor size={17} /> : <MapIcon size={17} />}</span>
                  <strong>{info.shortLabel}</strong>
                  <small>{info.description}</small>
                  <b>{info.victoryPoints} VP</b>
                </button>
              ))}
            </div>
          </div>
          {isHost ? (
            <button className="catan-primary catan-start" disabled={game.players.length < 2} onClick={startGame}>
              <Play size={18} /> Start game
            </button>
          ) : <p className="lobby-waiting">Waiting for the host to start the game…</p>}
          {isHost && game.players.length < 2 && <p className="setup-note">At least two players are needed.</p>}
          <p className="expansion-lobby-note">
            {CATAN_RULESETS[game.ruleset ?? "original"].label} · {CATAN_RULESETS[game.ruleset ?? "original"].victoryPoints} VP
            {game.players.length >= 5 ? " · 5–6 player paired turns" : ""}
          </p>
          {error && <p className="catan-room-error">{error}</p>}
          <button className="leave-room-button" onClick={leaveRoom}>Leave room</button>
        </section>
      </main>
    );
  }

  const winner = game.players.find((player) => player.id === game.winnerId);

  return (
    <main className="catan-page">
      {winner && <Winner player={winner} target={game.victoryTarget} canRestart={isHost} onRestart={restartRoom} onLeave={leaveRoom} />}
      <header className="catan-game-header">
        <div>
          <p className="catan-kicker">{CATAN_RULESETS[game.ruleset].shortLabel} · {game.setup ? `Setup round ${game.setup.index < game.players.length ? 1 : 2}` : `Turn ${game.turn}`}</p>
          <h1>CATAN</h1>
        </div>
        <div className="turn-banner">
          <span className={`player-swatch ${activePlayer.color}`} />
          <div><small>{game.setup ? "Now placing" : isPairedSecondary ? "Paired player 2" : game.pairedTurn ? "Paired player 1" : "Current turn"}</small><strong>{activePlayer.name}</strong></div>
        </div>
        <button className="icon-button" aria-label="Leave room" title="Leave room" onClick={() => window.confirm("Leave this room and return to Catan home?") && leaveRoom()}>
          <DoorOpen size={18} />
        </button>
      </header>

      <section className="catan-layout">
        <section className="board-panel">
          <div className="board-instruction">
            <span>{game.setup
              ? `Choose where ${activePlayer.name} will place a starting ${game.setup.step === "settlement" && hasCitiesKnights(game) && game.setup.index >= game.players.length ? "city" : game.setup.step}`
              : game.pendingSeven?.phase === "discard"
                ? `${discardingPlayer.name} must choose half their cards to discard`
                : game.pendingSeven?.phase === "moveRobber"
                  ? `${activePlayer.name}, choose a different tile for the robber`
                : game.pendingSeven?.phase === "chooseToken"
                  ? `${activePlayer.name}, choose the robber or pirate`
                : game.pendingSeven?.phase === "movePirate"
                  ? `${activePlayer.name}, choose a different sea tile for the pirate`
                  : game.pendingSeven?.phase === "chooseVictim"
                    ? `${activePlayer.name}, choose an adjacent player to steal from`
                    : game.pendingSeven?.phase === "chooseCard"
                      ? `${activePlayer.name}, pick one face-down card to steal`
                    : game.pendingTrade
                      ? game.pendingTrade.toPlayerId
                        ? `${game.players.find((player) => player.id === game.pendingTrade.toPlayerId)?.name} must answer the trade offer`
                        : "Open trade: the first eligible player to accept gets it"
                  : game.pendingGold
                    ? `${game.players.find((player) => player.id === game.pendingGold.claims[0]?.playerId)?.name} chooses a gold-field resource`
                  : buildMode
                    ? `Choose a place for your ${buildMode}`
                    : game.rolled
                      ? isPairedSecondary ? "Player 2 may build or trade with the bank" : "Build, trade, or end your turn"
                      : "Roll to begin your turn"}</span>
            {!game.setup && buildMode && <button onClick={() => setBuildMode(null)}><X size={15} /> Cancel</button>}
          </div>
          <CatanBoard
            game={game}
            buildMode={placementMode}
            legalVertices={legalVertices}
            legalEdges={legalEdges}
            onVertex={buildAtVertex}
            onEdge={buildRoad}
            robberMoveMode={game.pendingSeven?.phase === "moveRobber" && isMyTurn}
            pirateMoveMode={game.pendingSeven?.phase === "movePirate" && isMyTurn}
            onTile={game.pendingSeven?.phase === "movePirate" ? movePirate : moveRobber}
          />
          <div className="board-legend">
            <span><i className="number-hot">6</i> High production</span>
            <span><i className="robber-mini">♟</i> Robber blocks production</span>
          </div>
        </section>

        <aside className="catan-sidebar">
          <section className="turn-card">
            <div className="turn-card-head">
              <div>
                <p className="panel-kicker">{game.setup ? "Starting placement" : isMyTurn ? "Your turn" : "Current turn"}</p>
                <h2>{activePlayer.name}</h2>
              </div>
              <span className={`victory-chip ${activePlayer.color}`}><Crown size={16} /> {activePlayer.points}/{game.victoryTarget}</span>
            </div>

            {game.setup ? (
              <div className="setup-placement-panel">
                <span className={`setup-piece-icon ${game.setup.step}`}>
                  {game.setup.step === "settlement" ? (hasCitiesKnights(game) && game.setup.index >= game.players.length ? <Castle size={25} /> : <Home size={25} />) : <Route size={25} />}
                </span>
                <div>
                  <strong>{isMyTurn ? `Place your ${game.setup.step === "settlement" && hasCitiesKnights(game) && game.setup.index >= game.players.length ? "city" : game.setup.step}` : `Waiting for ${activePlayer.name}`}</strong>
                  <p>{isMyTurn ? (game.setup.step === "settlement" ? `Choose a highlighted corner${hasSeafarers(game) ? " on the main island" : ""}. Buildings cannot be adjacent.` : `Choose a highlighted ${placementMode} touching your new building.`) : `${activePlayer.name} is choosing a starting ${game.setup.step} on their device.`}</p>
                  {isMyTurn && game.setup.step === "road" && hasSeafarers(game) && <div className="setup-route-choice"><button className={placementMode === "road" ? "active" : ""} onClick={() => setBuildMode("road")}>Road</button><button className={placementMode === "ship" ? "active" : ""} onClick={() => setBuildMode("ship")}>Ship</button></div>}
                </div>
                <small>{game.setup.index + 1} of {game.setup.order.length}</small>
              </div>
            ) : <>
              <DiceTray dice={game.dice} rolling={isRolling} eventDie={game.eventDie} />
              {game.pendingSeven || game.pendingGold || game.pendingTrade ? (
                <p className="seven-turn-note">{game.pendingSeven ? "Resolve the seven" : game.pendingGold ? "Resolve gold production" : "Resolve the trade offer"} before continuing your turn.</p>
              ) : !game.rolled ? (
              <button className="catan-primary roll-button" disabled={isRolling || !isMyTurn} onClick={rollDice}>
                {isRolling ? <RefreshCcw className="spin" size={19} /> : <Dice5 size={20} />}
                {isRolling ? "Rolling…" : isMyTurn ? "Roll dice" : `Waiting for ${activePlayer.name}`}
              </button>
            ) : (
              <button className="catan-primary end-button" disabled={!isMyTurn} onClick={endTurn}>
                {isMyTurn ? (isPairedSecondary ? "Finish paired turn" : game.pairedTurn ? "Pass to player 2" : "End turn") : `Waiting for ${activePlayer.name}`} <ArrowRightLeft size={18} />
              </button>
              )}
            </>}
          </section>

          {game.pendingSeven && (
            <SevenResolution
              pendingSeven={game.pendingSeven}
              activePlayer={activePlayer}
              discardingPlayer={discardingPlayer}
              selection={discardSelection}
              onAdjust={adjustDiscard}
              onConfirm={confirmDiscard}
              players={game.players}
              onVictimChoice={chooseRobberVictim}
              onCardChoice={stealRobberCard}
              onTokenChoice={chooseSevenToken}
              viewerPlayerId={playerId}
              ruleset={game.ruleset}
            />
          )}

          {game.pendingGold && <GoldChoice pendingGold={game.pendingGold} players={game.players} viewerPlayerId={playerId} onChoose={chooseGoldResource} />}

          {viewerPlayer && <ResourceHand player={viewerPlayer} title="Your resource hand" cardTypes={cardTypesFor(game)} />}

          {game.pendingTrade && (
            <TradeDecision game={game} viewerPlayerId={playerId} onRespond={respondToPlayerTrade} />
          )}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && <section className="action-card">
            <div className="section-title"><h2>Build</h2><span>Click the board to place</span></div>
            <div className="build-list">
              <BuildButton icon={Route} label="Road" cost={COSTS.road} disabled={!game.rolled || !canAfford(activePlayer, COSTS.road)} active={buildMode === "road"} onClick={() => setBuildMode(buildMode === "road" ? null : "road")} />
              {hasSeafarers(game) && <BuildButton icon={Anchor} label="Ship" cost={COSTS.ship} disabled={!game.rolled || !canAfford(activePlayer, COSTS.ship)} active={buildMode === "ship"} onClick={() => setBuildMode(buildMode === "ship" ? null : "ship")} />}
              {hasSeafarers(game) && <button className={buildMode?.startsWith("moveShip") ? "build-button active" : "build-button"} disabled={!game.rolled || game.movedShipThisTurn} onClick={() => { setShipMoveSource(null); setBuildMode(buildMode?.startsWith("moveShip") ? null : "moveShipSource"); }}><span className="build-icon"><Anchor size={20} /></span><span><strong>Move ship</strong><small>One open ship per turn</small></span><ArrowRightLeft size={16} /></button>}
              <BuildButton icon={Home} label="Settlement" cost={COSTS.settlement} disabled={!game.rolled || !canAfford(activePlayer, COSTS.settlement)} active={buildMode === "settlement"} onClick={() => setBuildMode(buildMode === "settlement" ? null : "settlement")} />
              <BuildButton icon={Castle} label="City" cost={COSTS.city} disabled={!game.rolled || !canAfford(activePlayer, COSTS.city)} active={buildMode === "city"} onClick={() => setBuildMode(buildMode === "city" ? null : "city")} />
              {hasCitiesKnights(game) && <BuildButton icon={Shield} label="Knight" cost={COSTS.knight} disabled={!game.rolled || !canAfford(activePlayer, COSTS.knight)} active={buildMode === "knight"} onClick={() => setBuildMode(buildMode === "knight" ? null : "knight")} />}
              {hasCitiesKnights(game) && <BuildButton icon={Castle} label="City wall" cost={COSTS.cityWall} disabled={!game.rolled || !canAfford(activePlayer, COSTS.cityWall)} active={buildMode === "cityWall"} onClick={() => setBuildMode(buildMode === "cityWall" ? null : "cityWall")} />}
            </div>
          </section>}

          {isMyTurn && hasCitiesKnights(game) && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && game.rolled && <CitiesKnightsActions game={game} player={activePlayer} onActivateKnight={activateKnight} onImprove={improveCity} />}

          {isMyTurn && !isPairedSecondary && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && game.rolled && (
            <PlayerTradeBuilder
              activePlayer={activePlayer}
              partners={tradePartners}
              partner={tradePartner}
              partnerId={tradePartnerId}
              onPartnerChange={setTradePartnerId}
              offer={playerTradeOffer}
              request={playerTradeRequest}
              onAdjust={adjustPlayerTrade}
              onPropose={proposePlayerTrade}
              cardTypes={cardTypesFor(game)}
            />
          )}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && <section className="trade-card">
            <div className="section-title"><h2>Maritime trade</h2><span>Give {bankTradeRate} · Get 1</span></div>
            <PortPrivileges ports={activePlayerPorts} />
            <div className="trade-row">
              <ResourceSelect value={tradeGive} onChange={setTradeGive} label="Give" cardTypes={cardTypesFor(game)} />
              <ArrowRightLeft size={17} />
              <ResourceSelect value={tradeGet} onChange={setTradeGet} label="Get" cardTypes={cardTypesFor(game)} />
              <button className="trade-button" disabled={!game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < bankTradeRate} onClick={bankTrade}>Trade</button>
            </div>
          </section>}
        </aside>
      </section>

      <section className="game-footer-grid">
        <section className="score-card">
          <div className="section-title"><h2>Settlers</h2><span>First to {game.victoryTarget} points wins</span></div>
          <div className="score-list">
            {[...game.players].sort((a, b) => b.points - a.points).map((player) => (
              <div key={player.id} className={player.id === activePlayer.id ? "active" : ""}>
                <span className={`player-swatch ${player.color}`} />
                <strong>{player.name}</strong>
                <small>{totalResources(player.resources)} {totalResources(player.resources) === 1 ? "card" : "cards"}</small>
                <b>{player.points} VP</b>
              </div>
            ))}
          </div>
        </section>
        <section className="log-card">
          <div className="section-title"><h2>Island chronicle</h2><span>Latest first</span></div>
          <div className="catan-log">
            {game.log.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
          </div>
        </section>
      </section>
    </main>
  );
}

function placeStartingSettlement(game, playerId, vertexId) {
  if (!game.setup || game.setup.step !== "settlement") return game;
  const isSecondRound = game.setup.index >= game.players.length;
  const startingType = isSecondRound && hasCitiesKnights(game) ? "city" : "settlement";
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
      currentPlayerIndex: 0,
      log: [
        `${player.name} placed the final starting ${kind}. ${game.players[0].name} takes the first turn.`,
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
  const winnerId = player.points >= game.victoryTarget ? playerId : null;
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
  const eligibleVictimIds = [...new Set(
    boardForGame(game).edges
      .filter((edge) => edge.tileIds.includes(tileId))
      .map((edge) => game.ships?.[edge.id])
      .filter((ownerId) => ownerId && ownerId !== activePlayer.id),
  )].filter((ownerId) => totalResources(game.players.find((player) => player.id === ownerId).resources) > 0);
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

function advanceBarbarians(game) {
  const citiesKnights = { ...game.citiesKnights };
  if (citiesKnights.barbarianDistance > 1) {
    citiesKnights.barbarianDistance -= 1;
    return { ...game, citiesKnights, log: [`The barbarian ship advanced to ${citiesKnights.barbarianDistance} spaces away.`, ...game.log].slice(0, 24) };
  }

  const cityCount = Object.values(game.settlements).filter((building) => building.type === "city").length;
  const strengthByPlayer = Object.fromEntries(game.players.map((player) => [player.id, 0]));
  Object.values(citiesKnights.knights).forEach((knight) => {
    if (knight.active) strengthByPlayer[knight.playerId] += knight.level;
  });
  const totalStrength = Object.values(strengthByPlayer).reduce((sum, strength) => sum + strength, 0);
  let players = game.players.map((player) => ({ ...player }));
  let settlements = { ...game.settlements };
  let resultLog;

  if (totalStrength >= cityCount) {
    const best = Math.max(...Object.values(strengthByPlayer));
    const defenders = players.filter((player) => best > 0 && strengthByPlayer[player.id] === best);
    if (defenders.length === 1) {
      players = players.map((player) => player.id === defenders[0].id
        ? { ...player, points: player.points + 1, defenderPoints: (player.defenderPoints ?? 0) + 1 }
        : player);
      resultLog = `Catan was defended! ${defenders[0].name} earned 1 Defender of Catan victory point.`;
    } else {
      resultLog = "Catan was defended, but tied defenders receive no victory point.";
    }
  } else {
    const cityOwners = [...new Set(Object.values(settlements).filter((building) => building.type === "city").map((building) => building.playerId))];
    const lowest = Math.min(...cityOwners.map((ownerId) => strengthByPlayer[ownerId]));
    const raidedIds = cityOwners.filter((ownerId) => strengthByPlayer[ownerId] === lowest);
    const downgraded = [];
    raidedIds.forEach((ownerId) => {
      const cityEntry = Object.entries(settlements).find(([, building]) => building.playerId === ownerId && building.type === "city");
      if (cityEntry) {
        settlements[cityEntry[0]] = { ...cityEntry[1], type: "settlement" };
        downgraded.push(ownerId);
      }
    });
    players = players.map((player) => downgraded.includes(player.id) ? { ...player, points: Math.max(0, player.points - 1) } : player);
    resultLog = downgraded.length
      ? `The barbarians won. ${players.filter((player) => downgraded.includes(player.id)).map((player) => player.name).join(", ")} lost a city.`
      : "The barbarians attacked, but there were no cities to raid.";
  }

  const firstAttack = citiesKnights.attacks === 0;
  citiesKnights.attacks += 1;
  citiesKnights.barbarianDistance = 7;
  citiesKnights.knights = Object.fromEntries(Object.entries(citiesKnights.knights).map(([vertexId, knight]) => [vertexId, { ...knight, active: false }]));
  const winner = players.find((player) => player.points >= game.victoryTarget);
  return {
    ...game,
    players,
    settlements,
    citiesKnights,
    robberTileId: firstAttack ? game.robberInactiveTileId : game.robberTileId,
    robberInactiveTileId: firstAttack ? null : game.robberInactiveTileId,
    winnerId: winner?.id ?? game.winnerId,
    log: [`${resultLog}${firstAttack ? " The robber and pirate are now active." : ""}`, ...game.log].slice(0, 24),
  };
}

function buildKnight(game, playerId, vertexId) {
  if (!hasCitiesKnights(game) || game.settlements[vertexId] || game.citiesKnights.knights[vertexId]) return game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player || !canAfford(player, COSTS.knight)) return game;
  return {
    ...game,
    players: game.players.map((candidate) => candidate.id === playerId ? payCost(candidate, COSTS.knight) : candidate),
    citiesKnights: { ...game.citiesKnights, knights: { ...game.citiesKnights.knights, [vertexId]: { playerId, level: 1, active: false } } },
    log: [`${player.name} built an inactive knight.`, ...game.log].slice(0, 24),
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
  if (city?.playerId !== playerId || city.type !== "city" || game.citiesKnights.cityWalls[vertexId] || !canAfford(player, COSTS.cityWall)) return game;
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
  const cost = currentLevel + 1;
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
  const winner = players.find((candidate) => candidate.points >= game.victoryTarget);
  return {
    ...game,
    players,
    citiesKnights: { ...game.citiesKnights, improvements, metropolises },
    winnerId: winner?.id ?? game.winnerId,
    log: [`${player.name} advanced ${track} to level ${currentLevel + 1}${metropolises[track] === playerId && holderId !== playerId ? " and claimed its metropolis" : ""}.`, ...game.log].slice(0, 24),
  };
}

function CatanBoard({ game, buildMode, legalVertices, legalEdges, onVertex, onEdge, robberMoveMode, pirateMoveMode, onTile }) {
  const board = boardForGame(game);
  const vertexById = Object.fromEntries(board.vertices.map((vertex) => [vertex.id, vertex]));
  const expanded = game.boardVariant !== "base";
  return (
    <div className={`board-wrap ${expanded ? "expanded" : ""}`}>
      <svg className="catan-board" viewBox={`0 0 860 ${board.viewBoxHeight}`} role="img" aria-label={`Interactive Catan ${expanded ? "expanded " : ""}island board`}>
        <defs>
          <filter id="tile-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#12364a" floodOpacity=".24" />
          </filter>
          <radialGradient id="sea" cx="48%" cy="40%" r="65%">
            <stop offset="0" stopColor="#5cb9c4" /><stop offset="1" stopColor="#16728b" />
          </radialGradient>
          <pattern id="waves" width="32" height="18" patternUnits="userSpaceOnUse">
            <path d="M0 9 Q8 2 16 9 T32 9" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="860" height={board.viewBoxHeight} rx="28" fill="url(#sea)" />
        <rect width="860" height={board.viewBoxHeight} rx="28" fill="url(#waves)" />
        <ellipse className="island-halo" cx={board.center.x} cy={board.center.y} rx={expanded ? 370 : 311} ry={expanded ? 340 : 277} />

        {game.tiles.map((tile) => {
          const robberTarget = robberMoveMode && tile.id !== game.robberTileId && !["sea"].includes(tile.resource);
          const pirateTarget = pirateMoveMode && tile.resource === "sea" && tile.id !== game.pirateTileId;
          const tokenTarget = robberTarget || pirateTarget;
          const terrainLabel = tile.resource === "desert" ? "desert" : tile.resource === "sea" ? "sea" : tile.resource === "gold" ? "gold field" : RESOURCE_INFO[tile.resource].label.toLowerCase();
          return (
          <g
            key={tile.id}
            className={`terrain-tile ${tile.resource} ${tokenTarget ? "robber-target" : ""}`}
            filter="url(#tile-shadow)"
            role={tokenTarget ? "button" : undefined}
            tabIndex={tokenTarget ? 0 : undefined}
            aria-label={tokenTarget ? `Move ${pirateTarget ? "pirate" : "robber"} to ${terrainLabel} tile${tile.number ? ` number ${tile.number}` : ""}` : undefined}
            onClick={() => tokenTarget && onTile(tile.id)}
            onKeyDown={(event) => {
              if (tokenTarget && (event.key === "Enter" || event.key === " ")) onTile(tile.id);
            }}
          >
            <polygon points={tile.vertexIds.map((id) => `${vertexById[id].x},${vertexById[id].y}`).join(" ")} />
            <TerrainArt resource={tile.resource} x={tile.center.x} y={tile.center.y} />
            {tile.number && (
              <g className={`number-token ${tile.number === 6 || tile.number === 8 ? "hot" : ""}`} transform={`translate(${tile.center.x} ${tile.center.y + 7})`}>
                <circle r="25" />
                <text y="2">{tile.number}</text>
                <g className="probability-dots" transform="translate(0 13)">
                  {Array.from({ length: 6 - Math.abs(7 - tile.number) }, (_, index) => <circle key={index} cx={(index - (5 - Math.abs(7 - tile.number)) / 2) * 4} r="1.25" />)}
                </g>
              </g>
            )}
            {game.robberTileId === tile.id && <g className="robber" transform={`translate(${tile.center.x + 31} ${tile.center.y - 30})`}><circle r="17" /><text y="6">♟</text></g>}
            {game.pirateTileId === tile.id && <g className="pirate" transform={`translate(${tile.center.x} ${tile.center.y - 3})`}><circle r="17" /><text y="6">☠</text></g>}
          </g>
          );
        })}

        {game.ports?.map((port) => {
          const edge = board.edges.find((candidate) => candidate.id === port.edgeId);
          if (!edge) return null;
          const from = vertexById[edge.from];
          const to = vertexById[edge.to];
          const midpoint = midpointForEdge(board, edge);
          const vectorX = midpoint.x - board.center.x;
          const vectorY = midpoint.y - board.center.y;
          const magnitude = Math.hypot(vectorX, vectorY) || 1;
          const markerX = midpoint.x + vectorX / magnitude * 35;
          const markerY = midpoint.y + vectorY / magnitude * 35;
          const resource = port.type === "generic" ? null : RESOURCE_INFO[port.type];
          return (
            <g key={port.id} className={`port-marker ${resource?.terrain ?? "generic"}`} aria-label={`${port.type === "generic" ? "Three to one" : `Two to one ${resource.label}`} port`}>
              <line className="port-coast" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              <line className="port-pier" x1={midpoint.x} y1={midpoint.y} x2={markerX} y2={markerY} />
              <circle cx={markerX} cy={markerY} r="22" />
              <text className="port-rate" x={markerX} y={markerY + 4}>{port.type === "generic" ? "3:1" : "2:1"}</text>
              <text className="port-kind" x={markerX} y={markerY + 35}>{resource?.short ?? "Any"}</text>
            </g>
          );
        })}

        {board.edges.map((edge) => {
          const from = vertexById[edge.from];
          const to = vertexById[edge.to];
          const shipOwnerId = game.ships?.[edge.id];
          const ownerId = game.roads[edge.id] ?? shipOwnerId;
          const owner = game.players.find((player) => player.id === ownerId);
          const legal = legalEdges.has(edge.id);
          return (
            <g key={edge.id} className={`board-edge ${legal ? "legal" : ""}`} onClick={() => legal && onEdge(edge.id)}>
              {owner && <line className="road-outline" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              {owner && <line className={shipOwnerId ? "ship-piece" : "road-piece"} style={{ "--piece-color": owner.hex }} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              {legal && <line className="road-preview" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              <line className="edge-hit" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
            </g>
          );
        })}

        {board.vertices.map((vertex) => {
          const building = game.settlements[vertex.id];
          const owner = game.players.find((player) => player.id === building?.playerId);
          const legal = legalVertices.has(vertex.id);
          const knight = game.citiesKnights?.knights?.[vertex.id];
          const knightOwner = game.players.find((player) => player.id === knight?.playerId);
          const canUpgrade = buildMode === "city" && building?.type === "settlement" && building.playerId === game.players[game.currentPlayerIndex].id;
          return (
            <g key={vertex.id} className={`board-vertex ${legal || canUpgrade ? "legal" : ""}`} transform={`translate(${vertex.x} ${vertex.y})`} onClick={() => (legal || canUpgrade) && onVertex(vertex.id)}>
              {(legal || canUpgrade) && <circle className="build-target" r="12" />}
              {building?.type === "settlement" && <Settlement color={owner.hex} />}
              {building?.type === "city" && <City color={owner.hex} />}
              {game.citiesKnights?.cityWalls?.[vertex.id] && <circle className="city-wall" r="18" />}
              {knight && <g className={`knight-piece ${knight.active ? "active" : ""}`} style={{ "--piece-color": knightOwner.hex }}><circle r="11" /><text y="5">♞</text></g>}
              <circle className="vertex-hit" r="15" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TerrainArt({ resource, x, y }) {
  if (resource === "sea") return <g className="terrain-art sea-art" transform={`translate(${x} ${y})`}><path d="M-27 0q9-8 18 0t18 0t18 0M-20 13q8-7 16 0t16 0" /></g>;
  if (resource === "gold") return <g className="terrain-art gold-art" transform={`translate(${x} ${y - 11})`}><circle r="20" /><text y="7">★</text></g>;
  if (resource === "wood") return <g className="terrain-art trees" transform={`translate(${x} ${y - 15})`}><text x="-21">▲</text><text x="2" y="8">▲</text><text x="18" y="-3">▲</text></g>;
  if (resource === "sheep") return <g className="terrain-art sheep" transform={`translate(${x} ${y - 18})`}><text>●</text><text x="-15" y="9">●</text><text x="15" y="9">●</text></g>;
  if (resource === "wheat") return <g className="terrain-art wheat" transform={`translate(${x} ${y - 16})`}><path d="M-18 14V-10M0 14V-16M18 14V-9M-18-5l-7-6m7 13l8-7M0-10l-8-7m8 14l8-7M18-4l-7-7m7 14l7-7" /></g>;
  if (resource === "brick") return <g className="terrain-art bricks" transform={`translate(${x} ${y - 19})`}><rect x="-27" width="26" height="13" /><rect x="2" width="26" height="13" /><rect x="-14" y="16" width="26" height="13" /></g>;
  if (resource === "ore") return <g className="terrain-art ore" transform={`translate(${x} ${y - 16})`}><path d="M-34 24L-13-16 3 7 18-12 36 24Z" /></g>;
  return <g className="terrain-art desert-art" transform={`translate(${x} ${y})`}><path d="M-38 13q18-24 38 0t38 0" /><circle cx="20" cy="-29" r="10" /></g>;
}

function Settlement({ color }) {
  return <g className="settlement-piece" style={{ "--piece-color": color }}><path d="M-11 3V12H11V3L0-7Z" /><path d="M-12 2L0-10 12 2" /></g>;
}

function City({ color }) {
  return <g className="city-piece" style={{ "--piece-color": color }}><path d="M-15-2V12H15V-8H5V-14H-5V-2Z" /><path d="M-17-3L-7-12 2-3M4-9L10-15 17-9" /></g>;
}

function DiceTray({ dice, rolling, eventDie }) {
  return (
    <div className="catan-dice-tray" aria-label={`Dice showing ${dice[0]} and ${dice[1]}`}>
      <Die value={rolling ? 6 : dice[0]} rolling={rolling} tone="red" />
      <Die value={rolling ? 5 : dice[1]} rolling={rolling} tone="yellow" delay />
      {eventDie && <div className={`event-die ${eventDie}`} aria-label={`Event die showing ${eventDie}`}>{eventDie === "barbarian" ? "⛵" : eventDie === "trade" ? "▧" : eventDie === "politics" ? "◆" : "▤"}</div>}
      <span className="dice-total">{rolling ? "…" : dice[0] + dice[1]}</span>
    </div>
  );
}

function Die({ value, rolling, tone, delay }) {
  return (
    <div className={`catan-die value-${value} ${tone} ${rolling ? "rolling" : ""} ${delay ? "delay" : ""}`} aria-label={`Die showing ${value}`}>
      <div className="die-shadow" />
      <div className="die-cube">
        {[1, 2, 3, 4, 5, 6].map((faceValue) => (
          <div key={faceValue} className={`die-face face-${faceValue}`}>
            {Array.from({ length: 9 }, (_, index) => (
              <span key={index} className={pipIsVisible(faceValue, index) ? "pip visible" : "pip"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function pipIsVisible(value, index) {
  const pips = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return pips[value].includes(index);
}

function SevenResolution({ pendingSeven, activePlayer, discardingPlayer, selection, onAdjust, onConfirm, players, onVictimChoice, onCardChoice, onTokenChoice, viewerPlayerId, ruleset }) {
  const isRobberController = activePlayer.id === viewerPlayerId;
  if (pendingSeven.phase === "chooseToken") {
    return <section className="seven-card token-choice-card"><p className="panel-kicker">Seven rolled</p><h2>Move the robber or pirate?</h2><p>The robber targets a land hex and adjacent buildings. The pirate targets a sea hex and adjacent ships.</p><div className="token-choice-buttons"><button disabled={!isRobberController} onClick={() => onTokenChoice("robber")}>♟ Robber</button><button disabled={!isRobberController} onClick={() => onTokenChoice("pirate")}>☠ Pirate</button></div></section>;
  }
  if (pendingSeven.phase === "moveRobber") {
    return (
      <section className="seven-card robber-choice-card">
        <div className="seven-badge">7</div>
        <div>
          <p className="panel-kicker">Move the robber</p>
          <h2>{activePlayer.name}, choose a new tile</h2>
          <p>{isRobberController ? "Every available tile is highlighted. The robber cannot stay on its previous tile." : `Waiting for ${activePlayer.name} to choose on their device.`}</p>
        </div>
      </section>
    );
  }
  if (pendingSeven.phase === "movePirate") {
    return <section className="seven-card robber-choice-card"><div className="seven-badge">☠</div><div><p className="panel-kicker">Move the pirate</p><h2>{activePlayer.name}, choose a new sea tile</h2><p>{isRobberController ? "Available sea tiles are highlighted. The pirate cannot stay in its previous location." : `Waiting for ${activePlayer.name} to choose on their device.`}</p></div></section>;
  }
  if (pendingSeven.phase === "chooseVictim") {
    const victims = players.filter((player) => pendingSeven.eligibleVictimIds.includes(player.id));
    return (
      <section className="seven-card victim-choice-card">
        <div className="section-title">
          <div><p className="panel-kicker">{pendingSeven.stealSource === "pirate" ? "Pirate placed" : "Robber placed"}</p><h2>Choose who to steal from</h2></div>
          <span>{pendingSeven.stealSource === "pirate" ? "Adjacent ship owners" : "Adjacent players only"}</span>
        </div>
        <div className="victim-list">
          {victims.map((player) => (
            <button key={player.id} disabled={!isRobberController} onClick={() => onVictimChoice(player.id)}>
              <span className={`player-swatch ${player.color}`} />
              <strong>{player.name}</strong>
              <small>{totalResources(player.resources)} cards</small>
              <span>Steal 1</span>
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (pendingSeven.phase === "chooseCard") {
    const victim = players.find((player) => player.id === pendingSeven.victimId);
    if (!victim) return null;
    return (
      <section className="seven-card card-choice-card">
        <div className="section-title">
          <div><p className="panel-kicker">Choose a card</p><h2>Take one from {victim.name}</h2></div>
          <span>{totalResources(victim.resources)} cards available</span>
        </div>
        <p className="hidden-card-copy">{isRobberController ? "The cards are face down. Pick one without seeing its resource." : `Waiting for ${activePlayer.name} to pick a face-down card.`}</p>
        <div className="robber-card-options">
          {Array.from({ length: totalResources(victim.resources) }, (_, index) => (
            <button key={index} disabled={!isRobberController} onClick={() => onCardChoice(index)} aria-label={`Pick face-down card ${index + 1}`}>
              <span>?</span>
              <strong>Card {index + 1}</strong>
              <small>Face down</small>
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (!discardingPlayer) return null;
  const required = pendingSeven.discardCounts[discardingPlayer.id];
  if (discardingPlayer.id !== viewerPlayerId) {
    return (
      <section className="seven-card discard-card waiting-discard-card">
        <div className="section-title">
          <div><p className="panel-kicker">Seven rolled</p><h2>Waiting for {discardingPlayer.name}</h2></div>
          <span>{required} cards</span>
        </div>
        <p className="discard-copy">They are choosing cards privately on their device.</p>
      </section>
    );
  }
  const selected = totalResources(selection);
  return (
    <section className="seven-card discard-card">
      <div className="section-title">
        <div><p className="panel-kicker">Seven rolled</p><h2>{discardingPlayer.name} discards</h2></div>
        <span>{selected} of {required} selected</span>
      </div>
      <p className="discard-copy">Choose exactly {required} of your {totalResources(discardingPlayer.resources)} cards.</p>
      <div className="discard-grid">
        {cardTypesFor(ruleset).map((resource) => (
          <div key={resource} className={`discard-resource ${RESOURCE_INFO[resource].terrain}`}>
            <span>{RESOURCE_INFO[resource].short}</span>
            <small>{discardingPlayer.resources[resource]} owned</small>
            <div>
              <button aria-label={`Remove one ${RESOURCE_INFO[resource].short} from discard`} disabled={selection[resource] === 0} onClick={() => onAdjust(resource, -1)}>−</button>
              <strong>{selection[resource]}</strong>
              <button aria-label={`Add one ${RESOURCE_INFO[resource].short} to discard`} disabled={selection[resource] >= discardingPlayer.resources[resource] || selected >= required} onClick={() => onAdjust(resource, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <button className="catan-primary confirm-discard" disabled={selected !== required} onClick={onConfirm}>
        <Check size={18} /> Discard {required} card{required === 1 ? "" : "s"}
      </button>
    </section>
  );
}

function GoldChoice({ pendingGold, players, viewerPlayerId, onChoose }) {
  const claim = pendingGold.claims[0];
  const player = players.find((candidate) => candidate.id === claim?.playerId);
  if (!claim || !player) return null;
  const isChooser = player.id === viewerPlayerId;
  return (
    <section className="seven-card gold-choice-card">
      <p className="panel-kicker">Gold field production</p>
      <h2>{player.name} chooses {claim.count} resource{claim.count === 1 ? "" : "s"}</h2>
      <p>{isChooser ? "Choose one resource at a time. Gold itself is not a resource card." : `Waiting for ${player.name} to choose privately.`}</p>
      <div className="gold-resource-buttons">
        {RESOURCES.map((resource) => <button key={resource} disabled={!isChooser} className={RESOURCE_INFO[resource].terrain} onClick={() => onChoose(resource)}>{RESOURCE_INFO[resource].icon}<span>{RESOURCE_INFO[resource].short}</span></button>)}
      </div>
    </section>
  );
}

function CitiesKnightsActions({ game, player, onActivateKnight, onImprove }) {
  const state = game.citiesKnights;
  const improvements = state.improvements[player.id];
  const inactiveKnights = Object.entries(state.knights).filter(([, knight]) => knight.playerId === player.id && !knight.active);
  const commodityForTrack = { trade: "cloth", politics: "coin", science: "paper" };
  const activeStrength = Object.values(state.knights).filter((knight) => knight.playerId === player.id && knight.active).reduce((sum, knight) => sum + knight.level, 0);
  return (
    <section className="action-card cities-knights-card">
      <div className="section-title"><h2>Cities & Knights</h2><span>Barbarians: {state.barbarianDistance} away</span></div>
      <div className="barbarian-track" aria-label={`${state.barbarianDistance} spaces until barbarian attack`}><span style={{ width: `${(8 - state.barbarianDistance) / 7 * 100}%` }} /></div>
      <p className="knight-strength"><Shield size={15} /> Your active strength: <strong>{activeStrength}</strong></p>
      {inactiveKnights.map(([vertexId]) => <button key={vertexId} className="ck-action-button" disabled={!canAfford(player, COSTS.activateKnight)} onClick={() => onActivateKnight(vertexId)}>Activate knight · 1 Grain</button>)}
      <div className="improvement-grid">
        {Object.entries(commodityForTrack).map(([track, commodity]) => {
          const level = improvements[track];
          const cost = level + 1;
          return <button key={track} disabled={level >= 5 || player.resources[commodity] < cost} onClick={() => onImprove(track)}><span>{RESOURCE_INFO[commodity].icon}</span><strong>{track}</strong><small>Level {level} · {level >= 5 ? "Complete" : `${cost} ${RESOURCE_INFO[commodity].short}`}</small>{state.metropolises[track] === player.id && <b>Metropolis</b>}</button>;
        })}
      </div>
    </section>
  );
}

function PlayerTradeBuilder({ activePlayer, partners, partner, partnerId, onPartnerChange, offer, request, onAdjust, onPropose, cardTypes }) {
  const canPropose = totalResources(offer) > 0 && totalResources(request) > 0;
  return (
    <section className="player-trade-card">
      <div className="section-title"><h2>Player trade</h2><span>Negotiate resources</span></div>
      <label className="trade-partner-select">
        <span>Trade with</span>
        <select value={partnerId} onChange={(event) => onPartnerChange(event.target.value)}>
          <option value="any">Anyone — first to accept</option>
          {partners.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
        </select>
      </label>
      <div className="player-trade-columns">
        <TradeResourceEditor title={`${activePlayer.name} offers`} values={offer} owner={activePlayer} side="offer" onAdjust={onAdjust} cardTypes={cardTypes} />
        <TradeResourceEditor title={`${partner?.name ?? "Accepting player"} gives`} values={request} owner={partner} side="request" hideInventory onAdjust={onAdjust} cardTypes={cardTypes} />
      </div>
      <button className="catan-primary propose-trade" disabled={!canPropose} onClick={onPropose}>
        <ArrowRightLeft size={17} /> Propose trade
      </button>
    </section>
  );
}

function TradeResourceEditor({ title, values, owner, side, hideInventory = false, onAdjust, cardTypes = RESOURCES }) {
  return (
    <div className="trade-editor">
      <strong>{title}</strong>
      {cardTypes.map((resource) => (
        <div key={resource}>
          <span>{RESOURCE_INFO[resource].short}</span>
          <small>{hideInventory ? "?" : owner?.resources[resource] ?? 0}</small>
          <button aria-label={`Remove ${RESOURCE_INFO[resource].short} from ${side}`} disabled={values[resource] === 0} onClick={() => onAdjust(side, resource, -1)}>−</button>
          <b>{values[resource]}</b>
          <button aria-label={`Add ${RESOURCE_INFO[resource].short} to ${side}`} disabled={(!owner && !hideInventory) || values[resource] >= (hideInventory ? 19 : owner.resources[resource])} onClick={() => onAdjust(side, resource, 1)}>+</button>
        </div>
      ))}
    </div>
  );
}

function TradeDecision({ game, viewerPlayerId, onRespond }) {
  const trade = game.pendingTrade;
  if (!trade) return null;
  const fromPlayer = game.players.find((player) => player.id === trade.fromPlayerId);
  const toPlayer = game.players.find((player) => player.id === trade.toPlayerId);
  const viewerPlayer = game.players.find((player) => player.id === viewerPlayerId);
  const isOpenOffer = !trade.toPlayerId;
  const isTarget = viewerPlayerId === trade.toPlayerId;
  const isProposer = viewerPlayerId === trade.fromPlayerId;
  const alreadyDeclined = trade.declinedPlayerIds?.includes(viewerPlayerId);
  const canRespond = !isProposer && !alreadyDeclined && (isOpenOffer || isTarget);
  const hasRequestedCards = canProvideTradeResources(viewerPlayer, trade.request);
  const offerStillAvailable = canProvideTradeResources(fromPlayer, trade.offer);
  const canAccept = canRespond && hasRequestedCards && offerStillAvailable;
  const recipientName = toPlayer?.name ?? "Accepting player";
  return (
    <section className="player-trade-card trade-decision-card">
      <p className="panel-kicker">{isOpenOffer ? "Open trade offer" : `Trade offer for ${toPlayer?.name}`}</p>
      <h2>{fromPlayer?.name} proposes a trade</h2>
      <div className="trade-summary">
        <div><span>{recipientName} receives</span><strong>{formatResourceBundle(trade.offer)}</strong></div>
        <ArrowRightLeft size={18} />
        <div><span>{recipientName} gives</span><strong>{formatResourceBundle(trade.request)}</strong></div>
      </div>
      {canRespond && !hasRequestedCards && <p className="trade-unavailable-copy">You do not have the requested cards, so you can only decline.</p>}
      {canRespond && !offerStillAvailable && <p className="trade-unavailable-copy">The offered cards are no longer available. Decline this expired offer.</p>}
      {canRespond && <div className={`trade-response-actions ${canAccept ? "" : "single"}`}>
          {canAccept && <button className="catan-primary" onClick={() => onRespond(true)}><Check size={17} /> Accept</button>}
          <button onClick={() => onRespond(false)}><X size={17} /> Decline</button>
        </div>}
      {isProposer && <div className="trade-response-actions single"><button onClick={() => onRespond(false)}><X size={17} /> Cancel offer</button></div>}
      {alreadyDeclined && <p className="trade-waiting-copy">You declined this open offer. Other players may still accept it.</p>}
      {!canRespond && !alreadyDeclined && !isProposer && <p className="trade-waiting-copy">Waiting for {toPlayer?.name} to answer on their device.</p>}
    </section>
  );
}

function formatResourceBundle(resources) {
  return ALL_CARD_TYPES
    .filter((resource) => resources[resource] > 0)
    .map((resource) => `${resources[resource]} ${RESOURCE_INFO[resource].short}`)
    .join(" · ");
}

function ResourceHand({ player, title = "Resource hand", cardTypes = RESOURCES }) {
  return (
    <section className="resource-card">
      <div className="section-title"><h2>{title}</h2><span>{totalResources(player.resources)} cards</span></div>
      <div className="resource-grid">
        {cardTypes.map((resource) => (
          <div key={resource} className={`resource-tile ${RESOURCE_INFO[resource].terrain}`}>
            <span>{RESOURCE_INFO[resource].icon}</span>
            <small>{RESOURCE_INFO[resource].short}</small>
            <strong>{player.resources[resource]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function BuildButton({ icon: Icon, label, cost, disabled, active, onClick }) {
  return (
    <button className={active ? "build-button active" : "build-button"} disabled={disabled} onClick={onClick}>
      <span className="build-icon"><Icon size={20} /></span>
      <span><strong>{label}</strong><small>{Object.entries(cost).map(([resource, count]) => `${count} ${RESOURCE_INFO[resource].short}`).join(" · ")}</small></span>
      {active ? <Check size={17} /> : <Sparkles size={16} />}
    </button>
  );
}

function ResourceSelect({ value, onChange, label, cardTypes = RESOURCES }) {
  return (
    <label className="resource-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {cardTypes.map((resource) => <option key={resource} value={resource}>{RESOURCE_INFO[resource].short}</option>)}
      </select>
    </label>
  );
}

function PortPrivileges({ ports }) {
  if (!ports.length) return <p className="port-privileges empty">No port settlement yet · Standard rate 4:1</p>;
  const labels = [...new Set(ports.map((port) =>
    port.type === "generic" ? "Any resource 3:1" : `${RESOURCE_INFO[port.type].short} 2:1`,
  ))];
  return (
    <div className="port-privileges" aria-label="Controlled ports">
      {labels.map((label) => <span key={label}>{label}</span>)}
    </div>
  );
}

function Winner({ player, target, canRestart, onRestart, onLeave }) {
  return (
    <div className="catan-winner" role="dialog" aria-modal="true" aria-label={`${player.name} won`}>
      <section>
        <div className="winner-rays"><Trophy size={64} /></div>
        <p className="catan-kicker">The island has a new ruler</p>
        <h2>{player.name} wins!</h2>
        <p>{target} victory points and a settlement worthy of legend.</p>
        {canRestart
          ? <button className="catan-primary" onClick={onRestart}><Users size={18} /> Return room to lobby</button>
          : <p className="winner-waiting">Waiting for the host to start another game.</p>}
        <button className="leave-room-button" onClick={onLeave}>Leave room</button>
      </section>
    </div>
  );
}
