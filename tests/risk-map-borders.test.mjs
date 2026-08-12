import test from "node:test";
import assert from "node:assert/strict";
import { TERRITORIES } from "../lib/risk.js";
import {
  RISK_BORDER_REGIONS,
  buildRiskTerritoryCells,
  buildRiskTerritoryBorderSegments,
  isPointInPolygon,
  isPointOnPolygonBoundary,
} from "../lib/risk-map-borders.js";

const pointKey = ({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`;

test("Risk territory borders form connected partitions instead of disconnected strokes", () => {
  for (const region of RISK_BORDER_REGIONS) {
    const cells = buildRiskTerritoryCells(region);
    const segments = buildRiskTerritoryBorderSegments(region);
    assert.equal(cells.length, region.territoryIds.length);
    assert.ok(segments.length >= region.territoryIds.length - 1);

    for (const cell of cells) {
      const territory = TERRITORIES[cell.territoryId];
      assert.ok(isPointInPolygon({ x: territory.x * 10, y: territory.y * 6.5 }, cell.points));
      assert.ok(cell.points.length >= 3);
    }

    const endpointDegrees = new Map();
    for (const segment of segments) {
      for (const point of [segment.from, segment.to]) {
        const key = pointKey(point);
        endpointDegrees.set(key, (endpointDegrees.get(key) ?? 0) + 1);
      }
    }

    for (const segment of segments) {
      for (const point of [segment.from, segment.to]) {
        if (isPointOnPolygonBoundary(point, region.boundary)) continue;
        assert.ok(endpointDegrees.get(pointKey(point)) >= 2, `${region.id} has a dangling internal border`);
      }
    }
  }
});
