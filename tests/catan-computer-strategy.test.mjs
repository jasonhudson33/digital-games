import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseBestCatanVertex,
  chooseCatanDiscards,
  chooseCatanResource,
  chooseCatanRobberTile,
  computerAcceptsCatanTrade,
} from "../components/catan-computer-strategy.js";

test("Catan computers prefer productive and diverse settlement vertices", () => {
  const game = {
    tiles: [
      { id: 0, resource: "ore", number: 6 },
      { id: 1, resource: "wheat", number: 8 },
      { id: 2, resource: "wood", number: 3 },
      { id: 3, resource: "sheep", number: 2 },
    ],
    ports: [],
  };
  const weak = { id: "weak", tileIds: [2, 3] };
  const strong = { id: "strong", tileIds: [0, 1, 2] };
  assert.equal(chooseBestCatanVertex(game, [weak, strong]).id, "strong");
});

test("Catan computers request scarce city resources and discard surpluses", () => {
  const player = { resources: { wood: 4, brick: 1, sheep: 1, wheat: 0, ore: 1 } };
  assert.equal(chooseCatanResource(player), "ore");
  assert.deepEqual(
    chooseCatanDiscards(player, 2, ["wood", "brick", "sheep", "wheat", "ore"]),
    { wood: 2, brick: 1, sheep: 1, wheat: 0, ore: 1 },
  );
});

test("Catan computers block high-production opponents without blocking themselves", () => {
  const game = {
    robberTileId: 2,
    players: [{ id: "bot", points: 3 }, { id: "leader", points: 8 }],
    settlements: {
      mine: { playerId: "bot", type: "city" },
      field: { playerId: "leader", type: "city" },
    },
    tiles: [
      { id: 0, resource: "ore", number: 6, vertexIds: ["mine"] },
      { id: 1, resource: "wheat", number: 8, vertexIds: ["field"] },
      { id: 2, resource: "desert", number: null, vertexIds: [] },
    ],
  };
  assert.equal(chooseCatanRobberTile(game, "bot").id, 1);
});

test("Catan computers reject equal-count trades that give away a scarce resource", () => {
  const player = { resources: { wood: 4, brick: 0, sheep: 1, wheat: 2, ore: 3 } };
  assert.equal(computerAcceptsCatanTrade(player, { wood: 1 }, { brick: 1 }), false);
  assert.equal(computerAcceptsCatanTrade(player, { brick: 1 }, { wood: 1 }), true);
});
