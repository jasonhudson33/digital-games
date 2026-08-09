const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const BASE_RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];
const RESERVE_TARGET = { wood: 1, brick: 1, sheep: 1, wheat: 2, ore: 3 };

export function scoreCatanVertex(game, vertex) {
  if (!vertex) return Number.NEGATIVE_INFINITY;
  const tiles = vertex.tileIds.map((tileId) => game.tiles[tileId]).filter(Boolean);
  const productive = tiles.filter((tile) => !["desert", "sea"].includes(tile.resource));
  const production = productive.reduce((score, tile) => score + (PIPS[tile.number] || 0), 0);
  const diversity = new Set(productive.map((tile) => tile.resource)).size;
  const goldBonus = productive.filter((tile) => tile.resource === "gold").length * 4;
  const portBonus = (game.ports || []).some((port) => port.from === vertex.id || port.to === vertex.id) ? 1.5 : 0;
  return production + diversity * 1.75 + goldBonus + portBonus;
}

export function chooseBestCatanVertex(game, vertices) {
  return [...vertices].sort((left, right) => scoreCatanVertex(game, right) - scoreCatanVertex(game, left))[0] ?? null;
}

export function chooseBestCatanEdge(game, board, edges) {
  return [...edges].sort((left, right) => {
    const leftScore = Math.max(...[left.from, left.to].map((id) => scoreCatanVertex(game, board.vertices.find((vertex) => vertex.id === id))));
    const rightScore = Math.max(...[right.from, right.to].map((id) => scoreCatanVertex(game, board.vertices.find((vertex) => vertex.id === id))));
    return rightScore - leftScore;
  })[0] ?? null;
}

export function chooseCatanResource(player) {
  const resources = player.resources || {};
  const priorities = BASE_RESOURCES.map((resource) => ({
    resource,
    deficit: Math.max(0, RESERVE_TARGET[resource] - (resources[resource] || 0)),
    reserve: RESERVE_TARGET[resource],
  }));
  return priorities.sort((left, right) => right.deficit - left.deficit || right.reserve - left.reserve)[0].resource;
}

export function chooseCatanDiscards(player, count, cardTypes = BASE_RESOURCES) {
  const resources = { ...player.resources };
  for (let discarded = 0; discarded < count; discarded += 1) {
    const resource = [...cardTypes]
      .filter((candidate) => (resources[candidate] || 0) > 0)
      .sort((left, right) => {
        const leftSurplus = (resources[left] || 0) - (RESERVE_TARGET[left] || 0);
        const rightSurplus = (resources[right] || 0) - (RESERVE_TARGET[right] || 0);
        return rightSurplus - leftSurplus || (resources[right] || 0) - (resources[left] || 0);
      })[0];
    if (!resource) break;
    resources[resource] -= 1;
  }
  return resources;
}

export function chooseCatanRobberTile(game, computerId) {
  const playerById = Object.fromEntries(game.players.map((player) => [player.id, player]));
  return game.tiles
    .filter((tile) => tile.id !== game.robberTileId && !["desert", "sea"].includes(tile.resource))
    .map((tile) => ({
      tile,
      score: tile.vertexIds.reduce((total, vertexId) => {
        const building = game.settlements[vertexId];
        if (!building) return total;
        const production = (PIPS[tile.number] || 0) * (building.type === "city" ? 2 : 1);
        if (building.playerId === computerId) return total - production * 2;
        return total + production + (playerById[building.playerId]?.points || 0) * 0.5;
      }, 0),
    }))
    .sort((left, right) => right.score - left.score)[0]?.tile ?? null;
}

export function chooseCatanPirateTile(game, computerId) {
  const board = game.board;
  return game.tiles
    .filter((tile) => tile.resource === "sea" && tile.id !== game.pirateTileId)
    .map((tile) => ({
      tile,
      score: board.edges.filter((edge) => edge.tileIds.includes(tile.id)).reduce((total, edge) => {
        const ownerId = game.ships?.[edge.id];
        if (!ownerId) return total;
        if (ownerId === computerId) return total - 6;
        return total + 3 + (game.players.find((player) => player.id === ownerId)?.points || 0);
      }, 0),
    }))
    .sort((left, right) => right.score - left.score)[0]?.tile ?? null;
}

export function computerAcceptsCatanTrade(player, offer, request) {
  const value = (bundle) => Object.entries(bundle || {}).reduce((total, [resource, count]) => {
    const deficit = Math.max(0, (RESERVE_TARGET[resource] || 1) - (player.resources?.[resource] || 0));
    return total + count * (1 + deficit * 0.45);
  }, 0);
  return value(offer) >= value(request) * 1.05;
}
