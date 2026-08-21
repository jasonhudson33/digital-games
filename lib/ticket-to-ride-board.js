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

/**
 * Cars laid along the track, sized to the gap between the two cities.
 * Returns the centre, angle and length of each car.
 */
export function carLayout(from, to, count, lane = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = -dy / distance;
  const ny = dx / distance;
  const offset = lane * 10;

  const start = { x: from.x + nx * offset, y: from.y + ny * offset };
  const ux = dx / distance;
  const uy = dy / distance;

  const span = Math.max(distance - CITY_CLEARANCE * 2, count * 8);
  const slot = span / count;
  const length = Math.max(7, slot - CAR_GAP);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const inset = (distance - span) / 2;

  return Array.from({ length: count }, (_, index) => {
    const along = inset + slot * (index + 0.5);
    return { x: start.x + ux * along, y: start.y + uy * along, angle, length };
  });
}

export { BOARD_W, BOARD_H, CAR_H, COLOR_GLYPH };
