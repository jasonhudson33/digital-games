import assert from "node:assert/strict";
import test from "node:test";

import { CITIES, ROUTES } from "../lib/ticket-to-ride.js";
import { CAR_H, CITY_CLEAR, carLayout, solveBends } from "../lib/ticket-to-ride-board.js";
import { LAKES, MAINLAND, inflate, inside } from "../lib/ticket-to-ride-map.js";

/*
 * Two routes that leave the same city on close bearings run alongside each other
 * for their whole first stretch, which is what made Los Angeles → Phoenix and
 * Los Angeles → El Paso impossible to tell apart. solveBends pushes them off one
 * another; these are the invariants that say it worked, and that keep working if
 * a route is added or a city moves.
 */

const POINTS = Object.fromEntries(
  Object.entries(CITIES).map(([id, city]) => [id, { x: city.x * 10, y: city.y * 6 }]),
);
const BENDS = solveBends(POINTS, ROUTES);

const laid = ROUTES.map((route) => ({
  route,
  cars: carLayout(POINTS[route.from], POINTS[route.to], route.length, route.lane ?? 0, BENDS.get(route.id) ?? 0),
}));

const norm180 = (degrees) => {
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
};

/** Two routes between the same pair of cities are separated by their lane. */
const parallelKey = (route) => route.parallelGroup ?? route.id;

test("every route gets the right number of cars", () => {
  for (const { route, cars } of laid) {
    assert.equal(cars.length, route.length, `${route.id} drew ${cars.length} cars for length ${route.length}`);
  }
});

test("cars on a route are evenly spaced", () => {
  for (const { route, cars } of laid) {
    if (cars.length < 3) continue;
    const gaps = cars.slice(1).map((car, index) => Math.hypot(car.x - cars[index].x, car.y - cars[index].y));
    const spread = Math.max(...gaps) / Math.min(...gaps);
    // The old board placed a fixed-width car at fixed fractions of the path, so
    // spacing varied by 3.4x across the map. Along one route it should be even.
    assert.ok(spread < 1.15, `${route.id} spacing varies by ${spread.toFixed(2)}x`);
  }
});

test("cars never overlap their neighbours on the same route", () => {
  for (const { route, cars } of laid) {
    if (cars.length < 2) continue;
    for (let index = 1; index < cars.length; index += 1) {
      const gap = Math.hypot(cars[index].x - cars[index - 1].x, cars[index].y - cars[index - 1].y);
      assert.ok(gap >= cars[index].length, `${route.id} cars overlap: ${gap.toFixed(1)} apart, ${cars[index].length.toFixed(1)} long`);
    }
  }
});

test("no two routes run alongside each other", () => {
  // Crossings are fine and normal on this board. What is unreadable is two
  // tracks running parallel and touching, so only near-parallel pairs count.
  const failures = [];
  for (let i = 0; i < laid.length; i += 1) {
    for (let j = i + 1; j < laid.length; j += 1) {
      if (parallelKey(laid[i].route) === parallelKey(laid[j].route)) continue;
      for (const a of laid[i].cars) {
        for (const b of laid[j].cars) {
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance >= CAR_H + 3) continue;
          const between = Math.abs(norm180(a.angle - b.angle));
          if (Math.min(between, 180 - between) >= 30) continue;   // a crossing
          failures.push(`${laid[i].route.id} / ${laid[j].route.id} ${distance.toFixed(1)} apart`);
        }
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("no route runs through a city it does not serve", () => {
  for (const { route, cars } of laid) {
    for (const [id, point] of Object.entries(POINTS)) {
      if (id === route.from || id === route.to) continue;
      for (const car of cars) {
        const distance = Math.hypot(car.x - point.x, car.y - point.y);
        assert.ok(
          distance >= CITY_CLEAR,
          `${route.id} passes ${distance.toFixed(1)} from ${CITIES[id].name}`,
        );
      }
    }
  }
});

test("bending never pushes a route into a lake", () => {
  for (const { route, cars } of laid) {
    for (const car of cars) {
      for (const lake of LAKES) {
        assert.ok(
          !inside([car.x, car.y], inflate(lake.points)),
          `${route.id} was bent into Lake ${lake.name}`,
        );
      }
    }
  }
});

test("bending never pushes a route off the land", () => {
  const allowed = new Set(["new-orleans-miami", "atlanta-miami", "charleston-miami"]);
  for (const { route, cars } of laid) {
    if (allowed.has(route.id)) continue;
    for (const car of cars) {
      assert.ok(inside([car.x, car.y], MAINLAND), `${route.id} was bent into the sea`);
    }
  }
});

test("bends stay small enough to read as track, not as detours", () => {
  for (const [id, bend] of BENDS) {
    assert.ok(Math.abs(bend) <= 34, `${id} is bent by ${bend}`);
  }
  const bent = [...BENDS.values()].filter((value) => value !== 0);
  // Most of the board should be straight; bending everything would look wrong.
  assert.ok(bent.length < ROUTES.length / 3, `${bent.length} of ${ROUTES.length} routes are bent`);
});

test("the solver is deterministic", () => {
  const again = solveBends(POINTS, ROUTES);
  for (const [id, bend] of BENDS) assert.equal(again.get(id), bend, `${id} differs between runs`);
});
