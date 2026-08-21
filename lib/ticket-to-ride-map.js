/**
 * North America, drawn in the board's own coordinate space (1000 × 610) — the
 * same space the cities in CITIES already live in.
 *
 * This replaces a remote Wikimedia SVG that the board pulled in at runtime and
 * placed with `viewBox="900 700 1340 1044"` and `preserveAspectRatio="none"`:
 * an arbitrary crop of a real projection, stretched non-uniformly, underneath a
 * hand-placed city grid. Those are two unrelated coordinate systems, so the
 * cities could never have sat where the map said they were. It also failed to
 * load at all — hotlinked from upload.wikimedia.org — which left the board
 * showing nothing but three decorative blurs.
 *
 * Drawing the land to fit the cities instead means they line up by
 * construction, and nothing is fetched at runtime.
 *
 * Stylised, not survey-accurate — the same licence the printed board takes.
 * What has to be true is checked in tests/ticket-to-ride-map.test.mjs: every
 * city sits on land, no city sits in a lake, no city marker overhangs the
 * coast, and no route drives through a lake.
 */

/** Mainland, clockwise from the top of the Pacific coast. */
export const MAINLAND = [
  [26, -40], [28, 20], [38, 56], [50, 94], [54, 126], [44, 164], [34, 212],
  [28, 264], [32, 314], [38, 350], [50, 382], [72, 412], [98, 440],
  [120, 468], [134, 490],                                   // San Diego
  [156, 516], [186, 546], [222, 572], [262, 594], [304, 610],
  [346, 622], [400, 626], [452, 620], [492, 606],
  [524, 588], [556, 568], [586, 556], [620, 552], [658, 550],
  [696, 546], [734, 538], [772, 524], [806, 504], [832, 476], [846, 452],
  [854, 478], [864, 512], [876, 540], [890, 562],           // Florida, down the Gulf side
  [920, 558], [930, 508], [922, 464], [902, 434],           // and back up the Atlantic side
  [894, 404], [902, 374], [910, 340], [920, 302],
  [928, 264], [934, 226], [942, 192], [954, 154], [964, 120], [972, 86],
  [978, 48], [984, 10], [986, -40],
];

/*
 * The Great Lakes.
 *
 * The board compresses this region hard — Duluth, Sault Ste. Marie, Chicago,
 * Toronto and Montreal all sit inside 300 × 220 units — so anatomically sized
 * lakes would swallow the cities and lie under half the routes in the
 * north-east. These are sized to read as the Great Lakes and positioned to stay
 * off the straight lines the routes take between cities. They render beneath
 * the network with a soft edge, so a track clipping a shoreline reads as
 * geography rather than as a train in the water.
 */
export const LAKES = [
  { name: "superior", points: [[560, 106], [586, 84], [618, 74], [642, 78], [644, 92], [618, 106], [588, 114], [566, 116]] },
  { name: "michigan", points: [[630, 170], [650, 166], [658, 186], [656, 206], [646, 214], [634, 208], [628, 194], [626, 180]] },
  { name: "huron", points: [[696, 156], [716, 150], [728, 160], [728, 178], [714, 188], [698, 184], [690, 172]] },
  { name: "erie", points: [[738, 188], [770, 182], [798, 188], [798, 204], [768, 212], [742, 204]] },
  { name: "ontario", points: [[826, 148], [854, 142], [870, 150], [864, 166], [836, 172], [822, 162]] },
];

/**
 * Two routes clip open water on the way to Miami. On the printed board these run
 * down the coast; ours are straight city-to-city lines, and bulging the Gulf
 * coast far enough south to contain them would flatten Florida into the
 * mainland. Listed here so the geometry test stays meaningful rather than being
 * loosened.
 */
export const COASTAL_ROUTES = new Set(["new-orleans-miami", "atlanta-miami"]);

/** Catmull-Rom through the points, emitted as cubic béziers. Closed loops only. */
export function smooth(points, tension = 0.5) {
  const count = points.length;
  const at = (index) => points[(index + count) % count];
  let d = `M ${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let index = 0; index < count; index += 1) {
    const p0 = at(index - 1), p1 = at(index), p2 = at(index + 1), p3 = at(index + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

export const landPath = () => smooth(MAINLAND, 0.5);
export const lakePaths = () => LAKES.map((lake) => ({ name: lake.name, d: smooth(lake.points, 0.6) }));

/** Ray casting. Used by the geometry tests. */
export function inside(point, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Grow a polygon about its centroid, to allow for the smoothed curve bulging
 *  outside the control points it was built from. */
export function inflate(points, by = 5) {
  const cx = points.reduce((total, p) => total + p[0], 0) / points.length;
  const cy = points.reduce((total, p) => total + p[1], 0) / points.length;
  return points.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * by, y + ((y - cy) / d) * by];
  });
}
