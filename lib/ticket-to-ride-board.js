/**
 * Board rendering geometry for Ticket to Ride.
 *
 * Three things were wrong here.
 *
 * The map was a remote Wikimedia SVG, cropped to an arbitrary window and
 * stretched with preserveAspectRatio="none" beneath a hand-placed city grid —
 * two unrelated coordinate systems, so nothing could line up. It also failed to
 * load, leaving only three decorative blurs. It is now drawn from
 * lib/ticket-to-ride-map.js, in the cities' own coordinate space.
 *
 * Every train car was drawn 20 units wide wherever it happened to land, so
 * centre-to-centre spacing ran from 27 to 93 units — a 3.4× spread. Long routes
 * were a scatter of dashes with gaps three times the size of a car. Cars now
 * divide the track between the two city markers into equal slots.
 *
 * Route colour was carried by colour alone, on a game whose central mechanic is
 * matching a route to cards of that colour. Each car now carries the glyph its
 * card carries.
 */

const BOARD_W = 1000;
const BOARD_H = 610;
const CITY_CLEARANCE = 12;   // keep track ends off the city marker
const CAR_GAP = 3.2;         // between cars in adjacent slots
const CAR_H = 11;

/**
 * A shape per train colour, so the board is readable without colour vision.
 * Grey routes take any colour and deliberately carry no glyph — the absence is
 * the information.
 */
const COLOR_GLYPH = {
  red: "M0 -3.1 L2.9 2.2 L-2.9 2.2 Z",
  orange: "M0 -2.9 A2.9 2.9 0 1 1 0 2.9 A2.9 2.9 0 1 1 0 -2.9 Z",
  yellow: "M-2.6 -2.6 H2.6 V2.6 H-2.6 Z",
  green: "M0 -3.2 L3.2 0 L0 3.2 L-3.2 0 Z",
  blue: "M-0.95 -3 H0.95 V-0.95 H3 V0.95 H0.95 V3 H-0.95 V0.95 H-3 V-0.95 H-0.95 Z",
  purple: "M0 -3.3 L0.95 -1 L3.3 -1 L1.4 0.5 L2.1 2.9 L0 1.5 L-2.1 2.9 L-1.4 0.5 L-3.3 -1 L-0.95 -1 Z",
  black: "M-3.1 -1.3 H3.1 V1.3 H-3.1 Z",
  white: "M0 -3 A3 3 0 1 1 0 3 A3 3 0 1 1 0 -3 Z M0 -1.4 A1.4 1.4 0 1 0 0 1.4 A1.4 1.4 0 1 0 0 -1.4 Z",
  locomotive: "M0 -3.4 L1.1 -1.1 L3.4 0 L1.1 1.1 L0 3.4 L-1.1 1.1 L-3.4 0 L-1.1 -1.1 Z",
};

/* ── Bends ───────────────────────────────────────────────────────────────────
 *
 * Straight city-to-city lines are not enough on their own. Two routes leaving
 * the same city on close bearings run side by side for their whole first
 * stretch, and a route can pass straight through a city that is not one of its
 * endpoints. Both were happening:
 *
 *   Los Angeles → El Paso passes 13 units from Phoenix — closer than the width
 *   of one car — so it ran through the Phoenix marker and shared track with
 *   both Los Angeles → Phoenix and Phoenix → El Paso.
 *
 *   Chicago → Pittsburgh and St. Louis → Pittsburgh arrive 10.6° apart.
 *   El Paso → Dallas and El Paso → Houston leave 14.9° apart.
 *
 * Rather than hand-tuning offsets per route, the bends are solved from the
 * geometry: push a route off any city it passes too near, then push apart any
 * pair that shares a city and leaves on too close a bearing. Add a route to
 * ROUTES and it is separated automatically. The result is asserted in
 * tests/ticket-to-ride-board.test.mjs.
 */

const CITY_CLEAR = 24;     // a route should stay this far from a city it passes
const MIN_SEPARATION = 17; // degrees between two routes leaving the same city
const MAX_BEND = 34;
const MIN_TRACK = 15;   // centre-to-centre between cars on different routes

const norm180 = (degrees) => {
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
};

function distanceToSegment(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1)));
  return { distance: Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)), t };
}

/**
 * Perpendicular offset at the midpoint for each route, in board units.
 * Positive bends towards the left of travel.
 *
 * @param {Record<string, {x: number, y: number}>} cities  already in board units
 * @param {Array<{id: string, from: string, to: string}>} routes
 */
export function solveBends(cities, routes) {
  const bends = new Map(routes.map((route) => [route.id, 0]));
  const add = (id, amount) => bends.set(id, bends.get(id) + amount);

  // 1. Push clear of any city the route passes but does not serve.
  for (const route of routes) {
    const a = cities[route.from];
    const b = cities[route.to];
    for (const [id, city] of Object.entries(cities)) {
      if (id === route.from || id === route.to) continue;
      const { distance, t } = distanceToSegment(city, a, b);
      if (distance >= CITY_CLEAR || t <= 0.08 || t >= 0.92) continue;
      // Which side is the city on? Bend the other way.
      const side = Math.sign((b.x - a.x) * (city.y - a.y) - (b.y - a.y) * (city.x - a.x)) || 1;
      add(route.id, -side * (CITY_CLEAR - distance + 8));
    }
  }

  // 2. Separate routes that share a city and leave on close bearings.
  const byCity = new Map();
  for (const route of routes) {
    for (const end of [route.from, route.to]) {
      if (!byCity.has(end)) byCity.set(end, []);
      byCity.get(end).push(route);
    }
  }

  for (const [cityId, list] of byCity) {
    const origin = cities[cityId];
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const first = list[i];
        const second = list[j];
        const firstOther = first.from === cityId ? first.to : first.from;
        const secondOther = second.from === cityId ? second.to : second.from;
        // Two routes between the same pair of cities are already separated by
        // their lane offset; that is a different mechanism.
        if (firstOther === secondOther) continue;

        const towards = (other) => Math.atan2(cities[other].y - origin.y, cities[other].x - origin.x) * (180 / Math.PI);
        const separation = Math.abs(norm180(towards(firstOther) - towards(secondOther)));
        if (separation >= MIN_SEPARATION) continue;

        const push = (MIN_SEPARATION - separation) * 1.5;
        // Bend each away from the other, in each route's own frame of reference.
        for (const [route, other] of [[first, secondOther], [second, firstOther]]) {
          const a = cities[route.from];
          const b = cities[route.to];
          const target = cities[other];
          const side = Math.sign((b.x - a.x) * (target.y - a.y) - (b.y - a.y) * (target.x - a.x)) || 1;
          add(route.id, -side * push);
        }
      }
    }
  }

  const clamp = () => {
    for (const [id, value] of bends) {
      bends.set(id, Math.max(-MAX_BEND, Math.min(MAX_BEND, value)));
    }
  };
  clamp();

  /*
   * 3. Relax against the geometry that actually gets drawn.
   *
   * Bearings alone miss two things. A parallel double route carries a lane
   * offset that can push it sideways into a third route out of the same city —
   * Denver → Kansas City (orange) sits in lane +1, which put it 3.9 units from
   * Denver → Oklahoma City. And a bend applied for one conflict can create
   * another.
   *
   * Routes that simply cross are left alone: crossing is normal on this board,
   * and only track running alongside track is hard to read. The two are told
   * apart by the angle between the cars — near-parallel is an overlap,
   * transverse is a crossing.
   */
  const parallelTo = (route) => route.parallelGroup ?? route.id;
  for (let pass = 0; pass < 8; pass += 1) {
    const laid = routes.map((route) => ({
      route,
      cars: carLayout(cities[route.from], cities[route.to], route.length, route.lane ?? 0, bends.get(route.id)),
    }));

    let moved = false;
    for (let i = 0; i < laid.length; i += 1) {
      for (let j = i + 1; j < laid.length; j += 1) {
        const a = laid[i];
        const b = laid[j];
        if (parallelTo(a.route) === parallelTo(b.route)) continue;

        let closest = null;
        for (const carA of a.cars) {
          for (const carB of b.cars) {
            const distance = Math.hypot(carA.x - carB.x, carA.y - carB.y);
            if (distance < (closest?.distance ?? Infinity)) closest = { distance, carA, carB };
          }
        }
        if (!closest || closest.distance >= MIN_TRACK) continue;

        const between = Math.abs(norm180(closest.carA.angle - closest.carB.angle));
        const alongside = Math.min(between, 180 - between) < 30;
        if (!alongside) continue;   // a crossing, which is fine

        const push = (MIN_TRACK - closest.distance) * 0.55;
        for (const [self, other] of [[a, closest.carB], [b, closest.carA]]) {
          const start = cities[self.route.from];
          const end = cities[self.route.to];
          const side = Math.sign(
            (end.x - start.x) * (other.y - start.y) - (end.y - start.y) * (other.x - start.x),
          ) || 1;
          bends.set(self.route.id, bends.get(self.route.id) - side * push);
        }
        moved = true;
      }
    }
    clamp();
    if (!moved) break;
  }

  for (const [id, value] of bends) bends.set(id, Math.round(value * 10) / 10);
  return bends;
}

/* ── Laying cars along the track ─────────────────────────────────────────── */

const quadPoint = (s, c, e, t) => ({
  x: (1 - t) * (1 - t) * s.x + 2 * (1 - t) * t * c.x + t * t * e.x,
  y: (1 - t) * (1 - t) * s.y + 2 * (1 - t) * t * c.y + t * t * e.y,
});

const quadTangent = (s, c, e, t) => ({
  x: 2 * (1 - t) * (c.x - s.x) + 2 * t * (e.x - c.x),
  y: 2 * (1 - t) * (c.y - s.y) + 2 * t * (e.y - c.y),
});

/** Cumulative arc length, so cars sit evenly along a curve rather than evenly in t. */
function arcTable(s, c, e, steps = 48) {
  const table = [{ t: 0, length: 0 }];
  let previous = s;
  let total = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const point = quadPoint(s, c, e, t);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    table.push({ t, length: total });
    previous = point;
  }
  return table;
}

function tAtLength(table, target) {
  for (let i = 1; i < table.length; i += 1) {
    if (table[i].length >= target) {
      const span = table[i].length - table[i - 1].length || 1;
      const ratio = (target - table[i - 1].length) / span;
      return table[i - 1].t + ratio * (table[i].t - table[i - 1].t);
    }
  }
  return 1;
}

/**
 * Cars laid along the track, sized to the gap between the two cities.
 * Returns the centre, angle and length of each car.
 *
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {number} count  cars on this route
 * @param {number} lane   parallel-route offset
 * @param {number} bend   perpendicular offset at the midpoint
 */
export function carLayout(from, to, count, lane = 0, bend = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const straight = Math.hypot(dx, dy) || 1;
  const nx = -dy / straight;
  const ny = dx / straight;
  const offset = lane * 10;

  const start = { x: from.x + nx * offset, y: from.y + ny * offset };
  const end = { x: to.x + nx * offset, y: to.y + ny * offset };
  // A quadratic passes half way to its control point, so double the bend.
  const control = {
    x: (start.x + end.x) / 2 + nx * bend * 2,
    y: (start.y + end.y) / 2 + ny * bend * 2,
  };

  const table = arcTable(start, control, end);
  const total = table[table.length - 1].length;
  const span = Math.max(total - CITY_CLEARANCE * 2, count * 8);
  const inset = (total - span) / 2;
  const slot = span / count;
  const length = Math.max(7, slot - CAR_GAP);

  return Array.from({ length: count }, (_, index) => {
    const t = tAtLength(table, inset + slot * (index + 0.5));
    const point = quadPoint(start, control, end, t);
    const tangent = quadTangent(start, control, end, t);
    return {
      x: point.x,
      y: point.y,
      angle: (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI,
      length,
    };
  });
}

export { BOARD_W, BOARD_H, CAR_H, CITY_CLEAR, COLOR_GLYPH, MIN_SEPARATION };
