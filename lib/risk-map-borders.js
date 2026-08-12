import { TERRITORIES } from "./risk.js";

const point = (x, y) => ({ x, y });

export const RISK_BORDER_REGIONS = [
  {
    id: "north-america-mainland",
    territoryIds: ["alaska", "northwest-territory", "alberta", "ontario", "quebec", "western-united-states", "eastern-united-states", "central-america"],
    boundary: [point(55, 104), point(75, 82), point(150, 65), point(235, 70), point(310, 95), point(335, 125), point(320, 165), point(300, 205), point(270, 240), point(255, 282), point(225, 280), point(210, 245), point(175, 230), point(140, 205), point(95, 175), point(60, 145)],
  },
  {
    id: "south-america",
    territoryIds: ["venezuela", "peru", "brazil", "argentina"],
    boundary: [point(290, 285), point(340, 300), point(390, 330), point(420, 370), point(390, 420), point(360, 490), point(320, 520), point(285, 460), point(275, 390)],
  },
  {
    id: "europe-mainland",
    territoryIds: ["scandinavia", "northern-europe", "western-europe", "southern-europe", "ukraine"],
    boundary: [point(515, 92), point(555, 85), point(585, 100), point(620, 120), point(640, 150), point(610, 180), point(585, 215), point(545, 225), point(500, 210), point(465, 190), point(475, 155), point(500, 130)],
  },
  {
    id: "africa-mainland",
    territoryIds: ["north-africa", "egypt", "east-africa", "congo", "south-africa"],
    boundary: [point(455, 240), point(520, 230), point(590, 240), point(635, 270), point(650, 335), point(620, 400), point(590, 475), point(545, 485), point(515, 430), point(490, 370), point(460, 310)],
  },
  {
    id: "asia-mainland",
    territoryIds: ["ural", "siberia", "yakutsk", "kamchatka", "irkutsk", "mongolia", "afghanistan", "china", "middle-east", "india", "siam"],
    boundary: [point(620, 105), point(700, 80), point(820, 70), point(920, 80), point(970, 110), point(955, 155), point(915, 190), point(880, 225), point(830, 245), point(810, 300), point(770, 320), point(730, 290), point(690, 260), point(630, 250), point(610, 200)],
  },
  {
    id: "australia-mainland",
    territoryIds: ["western-australia", "eastern-australia"],
    boundary: [point(815, 385), point(880, 375), point(940, 395), point(960, 450), point(930, 500), point(850, 495), point(820, 455)],
  },
];

const EPSILON = 0.001;

function territoryPoint(territoryId) {
  const territory = TERRITORIES[territoryId];
  return point(territory.x * 10, territory.y * 6.5);
}

function bisectorValue(candidate, site, otherSite) {
  const dx = otherSite.x - site.x;
  const dy = otherSite.y - site.y;
  return (2 * candidate.x * dx) + (2 * candidate.y * dy)
    - ((otherSite.x ** 2 + otherSite.y ** 2) - (site.x ** 2 + site.y ** 2));
}

function intersectBisector(from, to, fromValue, toValue) {
  const denominator = fromValue - toValue;
  const ratio = Math.abs(denominator) < EPSILON ? 0 : fromValue / denominator;
  return point(
    from.x + ((to.x - from.x) * ratio),
    from.y + ((to.y - from.y) * ratio),
  );
}

function clipToClosestSite(polygon, site, otherSite) {
  const result = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentValue = bisectorValue(current, site, otherSite);
    const previousValue = bisectorValue(previous, site, otherSite);
    const currentInside = currentValue <= EPSILON;
    const previousInside = previousValue <= EPSILON;
    if (currentInside !== previousInside) {
      result.push(intersectBisector(previous, current, previousValue, currentValue));
    }
    if (currentInside) result.push(current);
  }
  return result;
}

export function buildRiskTerritoryCells(region) {
  return region.territoryIds.map((territoryId) => {
    const site = territoryPoint(territoryId);
    const points = region.territoryIds
      .filter((otherId) => otherId !== territoryId)
      .reduce((cell, otherId) => clipToClosestSite(cell, site, territoryPoint(otherId)), [...region.boundary]);
    return { territoryId, points };
  });
}

function pointOnSegment(candidate, from, to, epsilon = 0.02) {
  const cross = ((candidate.y - from.y) * (to.x - from.x)) - ((candidate.x - from.x) * (to.y - from.y));
  if (Math.abs(cross) > epsilon) return false;
  const dot = ((candidate.x - from.x) * (to.x - from.x)) + ((candidate.y - from.y) * (to.y - from.y));
  if (dot < -epsilon) return false;
  const lengthSquared = ((to.x - from.x) ** 2) + ((to.y - from.y) ** 2);
  return dot <= lengthSquared + epsilon;
}

export function isPointOnPolygonBoundary(candidate, polygon) {
  return polygon.some((from, index) => pointOnSegment(candidate, from, polygon[(index + 1) % polygon.length]));
}

function isBoundaryEdge(from, to, boundary) {
  return boundary.some((boundaryFrom, index) => {
    const boundaryTo = boundary[(index + 1) % boundary.length];
    return pointOnSegment(from, boundaryFrom, boundaryTo) && pointOnSegment(to, boundaryFrom, boundaryTo);
  });
}

function normalizedSegmentKey(from, to) {
  const fromKey = `${from.x.toFixed(2)},${from.y.toFixed(2)}`;
  const toKey = `${to.x.toFixed(2)},${to.y.toFixed(2)}`;
  return fromKey < toKey ? `${fromKey}|${toKey}` : `${toKey}|${fromKey}`;
}

export function buildRiskTerritoryBorderSegments(region) {
  const segments = new Map();
  for (const cell of buildRiskTerritoryCells(region)) {
    for (let index = 0; index < cell.points.length; index += 1) {
      const from = cell.points[index];
      const to = cell.points[(index + 1) % cell.points.length];
      if (isBoundaryEdge(from, to, region.boundary)) continue;
      const key = normalizedSegmentKey(from, to);
      if (!segments.has(key)) segments.set(key, { from, to });
    }
  }
  return [...segments.values()];
}

export function isPointInPolygon(candidate, polygon) {
  if (isPointOnPolygonBoundary(candidate, polygon)) return true;
  let inside = false;
  for (let currentIndex = 0, previousIndex = polygon.length - 1; currentIndex < polygon.length; previousIndex = currentIndex, currentIndex += 1) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const crossesRay = (current.y > candidate.y) !== (previous.y > candidate.y)
      && candidate.x < ((previous.x - current.x) * (candidate.y - current.y)) / (previous.y - current.y) + current.x;
    if (crossesRay) inside = !inside;
  }
  return inside;
}
