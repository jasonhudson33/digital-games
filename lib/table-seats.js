/*
 * Where each player sits at a card table, and where the card they play goes down.
 *
 * Every card game in here had the same problem and solved it a different way: a
 * list of players down one side, a rail of opponents across the top, and the
 * cards on the table captioned with names in 12px type. "Who played the ace?"
 * was a question you answered by reading, on every trick.
 *
 * Position answers it instead, and two rules decide the arrangement:
 *
 *   1. The viewer always sits at the bottom. Every other seat is placed relative
 *      to them, so "the player on my left" is the player on your left.
 *   2. Play runs clockwise from there — bottom, left, top, right — which is what
 *      a physical deal does, and what puts a four-hand partnership opposite each
 *      other without any special-casing.
 *
 * A game passes in what its own furniture measures; this decides where it goes.
 * Nothing here knows about tricks, bids or suits.
 */

/**
 * A table shape: the felt, and the size of the three things on it that must
 * never touch — a name plate, a played card, and whatever sits in the middle.
 *
 * Every table is solved twice, because a phone renders smaller furniture on a
 * portrait felt. Solving the phone's arrangement against the desktop's plate is
 * what put a card under somebody's name.
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
   * them, so only one mark stays there and anything else moves down to the foot
   * of the felt, where nothing else is. */
  centre: { w: 32, h: 32 },
  gap: 5,
};

/*
 * Furniture gets smaller as the table fills up, in two steps.
 *
 * The pinch is not the seats — those go round a felt happily to ten. It is the
 * ring of played cards inside them: every card is pushed in far enough to clear
 * its own name plate, so a fuller table means a tighter ring, and the cards meet
 * each other well before the plates do.
 *
 * At seven and eight the cards keep their size and the table gives up some of the
 * gap between a plate and its card, which is the cheapest thing on the felt to
 * spend. From nine the plate loses its second line and a quarter of its width,
 * because nothing else buys enough room. A second ring of seats would, but a
 * table where some people sit at it and others sit behind it stops meaning what
 * it says.
 */
export const BUSY_ABOVE = 6;
export const CROWDED_ABOVE = 8;

export const WIDE_BUSY = { ...WIDE_TABLE, gap: 14 };
export const WIDE_CROWD = {
  ...WIDE_TABLE, plate: { w: 112, h: 32 }, card: { w: 52, h: 72 }, gap: 12,
};
export const PHONE_CROWD = {
  ...PHONE_TABLE, plate: { w: 72, h: 24 }, card: { w: 32, h: 44 }, gap: 4,
};

const tier = (count, small, busy, crowded) => (
  count > CROWDED_ABOVE ? crowded : count > BUSY_ABOVE ? busy : small
);

/**
 * The two shapes a table has to be solved in, given how many are sitting at it.
 *
 * @param {number} count   how many seats
 * @param {object} table   { wide, phone } partial overrides — a game whose cards
 *                         are a different size says so once, here
 * @returns {Array<{key: string, crowded: boolean, shape: object}>} `key` is the
 *          suffix on the custom properties each shape's positions are written to,
 *          so the stylesheet can pick the pair matching what it is drawing;
 *          `crowded` says the plates have lost their second line.
 */
export function tableShapes(count, table = {}) {
  const crowded = count > CROWDED_ABOVE;
  return [
    { key: "", crowded, shape: { ...tier(count, WIDE_TABLE, WIDE_BUSY, WIDE_CROWD), ...table.wide } },
    { key: "-n", crowded, shape: { ...tier(count, PHONE_TABLE, PHONE_TABLE, PHONE_CROWD), ...table.phone } },
  ];
}

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
 * @param {number} count   how many are at the table
 * @param {number} viewer  the viewer's index in the players array
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
     * cannot either, because a plate is much wider than it is tall, so a seat at
     * the side needs its card pushed nearly three times as far as one at the top.
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
      /* Pills hang away from the middle of the table, because the middle is
       * where the cards are. This says which way that is. */
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
