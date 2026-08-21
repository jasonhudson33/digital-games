/*
 * Where each player sits, and where the card they play goes down.
 *
 * `game.players` is already in seat order — turn order is index + 1, and in a
 * partnership game `teamId` is `index % 2`, so partners are always an even
 * number of seats apart. That means the array can be laid out round an ellipse
 * directly; nothing has to be re-derived from it.
 *
 * Two rules decide the arrangement:
 *
 *   1. The viewer always sits at the bottom. Every other seat is placed relative
 *      to them, so "the player on my left" is the player on your left.
 *   2. Play runs clockwise from there — bottom, left, top, right — which is what
 *      a physical deal does, and what puts a four-hand partnership opposite each
 *      other without any special-casing.
 *
 * This replaced a vertical list of players beside a row of played cards captioned
 * with names in 12px type. Position answers "who played that" better than a
 * caption can, and it is the question a trick-taking game asks most often.
 */

/**
 * A table shape: the felt, and the size of the three things on it that must
 * never touch — a name plate, a played card, and whatever sits in the middle.
 *
 * There are two shapes, because a phone renders a smaller plate and a smaller
 * card on a portrait felt. Solving the phone's arrangement against the desktop's
 * plate is what put a card under somebody's name.
 */
export const WIDE_TABLE = {
  box: { width: 940, height: 580 },
  plate: { w: 152, h: 44 },
  card: { w: 62, h: 86 },
  /* The trump circle with the bid and trick line stacked under it. */
  centre: { w: 150, h: 72 },
  gap: 18,
};

export const PHONE_TABLE = {
  box: { width: 360, height: 500 },
  plate: { w: 92, h: 32 },
  card: { w: 40, h: 56 },
  /* Six cards on a phone leave a hole in the middle barely wider than one of
   * them, so only the trump suit stays there; the bid and trick line moves down
   * to the foot of the felt, where nothing else is. */
  centre: { w: 32, h: 32 },
  gap: 5,
};

/** Screen polar: 0° is east and angles increase clockwise, because y grows down. */
function point(cx, cy, rx, ry, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return { x: cx + (rx * Math.cos(radians)), y: cy + (ry * Math.sin(radians)) };
}

/**
 * How far apart two axis-aligned boxes must be, centre to centre, along a unit
 * direction, before they stop touching.
 *
 * They are clear as soon as EITHER axis separates them, so the distance is the
 * smaller of the two axis requirements — and each requirement has to be built
 * from both boxes together. Measuring each box's own edge separately and adding
 * the results undercounts on a diagonal, because the two measurements can be
 * limited by different axes.
 */
export function clearance(first, second, ux, uy) {
  const byX = Math.abs(ux) < 1e-6 ? Infinity : ((first.w + second.w) / 2) / Math.abs(ux);
  const byY = Math.abs(uy) < 1e-6 ? Infinity : ((first.h + second.h) / 2) / Math.abs(uy);
  return Math.min(byX, byY);
}

/**
 * @param {number} count   how many are at the table, 2 to 6
 * @param {number} viewer  the viewer's index in game.players
 * @param {object} shape   one of the table shapes above
 */
export function seatLayout(count, viewer, shape = WIDE_TABLE) {
  const { box, plate, card, centre, gap } = { ...WIDE_TABLE, ...shape };
  const cx = box.width / 2;
  const cy = box.height / 2;

  /* Inset far enough that a name plate at the top or bottom stays on the felt. */
  const rx = box.width * 0.325;
  const ry = box.height * 0.335;

  return Array.from({ length: count }, (unused, index) => {
    const relative = (((index - viewer) % count) + count) % count;
    // Wrapped, or the last seat comes out at 390° and misses every side test.
    const degrees = (90 + (relative * (360 / count))) % 360;
    const seat = point(cx, cy, rx, ry, degrees);

    /*
     * The card sits in front of its own seat, far enough out to clear the name
     * plate and no further. A fixed fraction of the table's radius cannot
     * satisfy every size — five seats want the ring pushed out to clear the
     * diagonals, six want it pulled in to clear the sides — and a fixed distance
     * cannot either, because the plate is much wider than it is tall, so a seat
     * at the side needs its card pushed nearly three times as far as one at the
     * top.
     */
    const toCentre = Math.hypot(seat.x - cx, seat.y - cy) || 1;
    const ux = (cx - seat.x) / toCentre;
    const uy = (cy - seat.y) / toCentre;
    const reach = clearance(plate, card, ux, uy) + gap;
    /* ...and stops short of whatever is in the middle of the felt. Both ends of
     * that range are real constraints, so if a table is ever crowded enough that
     * they cross, the overlap tests say so rather than the felt quietly lying. */
    const inset = Math.min(reach, toCentre - clearance(centre, card, ux, uy));

    return {
      index,
      relative,
      degrees,
      seat,
      played: { x: seat.x + (ux * inset), y: seat.y + (uy * inset) },
      /* Which way the plate hangs off the seat, so it never covers felt a card
       * needs. */
      side: relative === 0 ? "bottom"
        : degrees > 100 && degrees < 260 ? "left"
        : degrees > 280 || degrees < 80 ? "right"
        : "top",
      /* Bid and meld pills hang away from the middle of the table, because the
       * middle is where the cards are. This says which way that is. */
      half: Math.sin((degrees * Math.PI) / 180) < 0 ? "upper" : "lower",
      isViewer: relative === 0,
    };
  });
}

/**
 * A fan of face-down cards for a hand you cannot see, so a seat reads as
 * somebody holding cards rather than as a row in a list.
 */
export function backFan(cardCount, spread = 3.4) {
  const shown = Math.min(Math.max(0, cardCount), 8);
  const middle = (shown - 1) / 2;
  return Array.from({ length: shown }, (unused, index) => ({
    angle: +((index - middle) * spread).toFixed(2),
    offset: +((index - middle) * 7).toFixed(1),
  }));
}
