import assert from "node:assert/strict";
import test from "node:test";

import { CITIES, ROUTES } from "../lib/ticket-to-ride.js";
import { COASTAL_ROUTES, LAKES, MAINLAND, inflate, inside, landPath, lakePaths } from "../lib/ticket-to-ride-map.js";

/*
 * The board's whole alignment problem was that the map and the cities lived in
 * different coordinate systems, and nothing could tell you so. These are the
 * invariants that make "the map lines up" checkable instead of a matter of
 * squinting at it: they fail loudly if a city or a route is moved onto water, or
 * if the coastline is edited out from under one.
 */

const point = (city) => [city.x * 10, city.y * 6];

function distanceToOutline(p, polygon) {
  let min = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
    min = Math.min(min, Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t)));
  }
  return min;
}

test("every city sits on land", () => {
  for (const city of Object.values(CITIES)) {
    assert.ok(inside(point(city), MAINLAND), `${city.name} is in the sea`);
  }
});

test("no city sits in a lake", () => {
  for (const city of Object.values(CITIES)) {
    for (const lake of LAKES) {
      assert.ok(!inside(point(city), lake.points), `${city.name} is in Lake ${lake.name}`);
    }
  }
});

test("no city marker overhangs the coast", () => {
  // The marker is r=7 with a 2px stroke, so it needs 8 units of land around it.
  for (const city of Object.values(CITIES)) {
    const clearance = distanceToOutline(point(city), MAINLAND);
    assert.ok(clearance >= 8, `${city.name} sits ${clearance.toFixed(1)} units from the coast`);
  }
});

test("no route drives through a lake", () => {
  for (const route of ROUTES) {
    const a = point(CITIES[route.from]);
    const b = point(CITIES[route.to]);
    for (let step = 1; step < 12; step += 1) {
      const t = step / 12;
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      for (const lake of LAKES) {
        assert.ok(
          !inside(p, inflate(lake.points)),
          `${route.id} crosses Lake ${lake.name} at ${p.map((v) => v.toFixed(0))}`,
        );
      }
    }
  }
});

test("only the two known coastal routes touch open water", () => {
  const wet = new Set();
  for (const route of ROUTES) {
    const a = point(CITIES[route.from]);
    const b = point(CITIES[route.to]);
    for (let step = 1; step < 12; step += 1) {
      const t = step / 12;
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (!inside(p, MAINLAND)) wet.add(route.id);
    }
  }
  assert.deepEqual([...wet].sort(), [...COASTAL_ROUTES].sort());
});

test("the outline stays inside the board", () => {
  for (const [x] of MAINLAND) {
    assert.ok(x >= -60 && x <= 1060, `outline x ${x} is far outside the 1000-unit board`);
  }
  for (const lake of LAKES) {
    for (const [x, y] of lake.points) {
      assert.ok(x > 0 && x < 1000 && y > 0 && y < 610, `Lake ${lake.name} has a point off the board`);
    }
  }
});

test("paths are emitted as closed béziers", () => {
  const land = landPath();
  assert.match(land, /^M [\d.]+ [-\d.]+ C /);
  assert.match(land, / Z$/);
  const lakes = lakePaths();
  assert.equal(lakes.length, LAKES.length);
  for (const lake of lakes) assert.match(lake.d, / Z$/);
});
