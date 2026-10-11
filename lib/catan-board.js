import { shuffled } from "./shuffle.js";
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

const SQRT3 = Math.sqrt(3);
const BOARD_CENTER = { x: 430, y: 340 };
const HEX_SIZE = 67;

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
  development: { sheep: 1, wheat: 1, ore: 1 },
  knight: { sheep: 1, ore: 1 },
  activateKnight: { wheat: 1 },
  promoteKnight: { sheep: 1, ore: 1 },
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


export { RESOURCE_INFO, SQRT3, BOARD_CENTER, HEX_SIZE, RESOURCES, PLAYER_STYLES, COSTS, axialTiles, centerFor, cornersFor, geometry, baseTileSpecs, expandedCenter, expandedHexSize, expandedTileSpecs, BASE_BOARD, EXPANDED_BOARD, seafarersAxials, seafarersCenter, seafarersHexSize, SEAFARERS_BOARD, axialDistance, FOREIGN_ISLANDS, boardForPlayerCount, boardForGame, createPorts, createSeafarersPorts, midpointForEdge, emptyResources, totalResources, canAfford, payCost, isSettlementLegal, edgeTouchesTerrain, isTransportLegal };
