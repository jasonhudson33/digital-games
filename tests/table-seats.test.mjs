import assert from "node:assert/strict";
import test from "node:test";

import { backFan, clearance, seatLayout, tableShapes, WIDE_TABLE } from "../lib/table-seats.js";

/*
 * The seating has to hold for every table these games deal — two players up to
 * ten — and it is geometry, so it can be checked rather than eyeballed. These
 * are the invariants that make a table readable: nobody overlaps anybody, and
 * the card you played is nearer to you than to anyone else.
 *
 * Every count is checked in both shapes, because the stylesheet draws both. A
 * phone is not the desktop scaled down — it has its own plate, its own card and
 * a portrait felt — and it was the one that failed while only the desktop was
 * under test.
 */

const COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const boxAt = ({ x, y }, size) => ({
  left: x - size.w / 2, right: x + size.w / 2,
  top: y - size.h / 2, bottom: y + size.h / 2,
});
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Every table these games deal, in both shapes the stylesheet draws. */
function everyTable(run, table = {}) {
  for (const count of COUNTS) {
    for (const { key, shape } of tableShapes(count, table)) {
      run(seatLayout(count, 0, shape), shape, `${key === "" ? "desktop" : "phone"} ${count}-handed`);
    }
  }
}

test("the viewer always sits at the bottom, whichever seat they hold", () => {
  for (const count of COUNTS) {
    for (const { key, shape } of tableShapes(count)) {
      for (let viewer = 0; viewer < count; viewer += 1) {
        const layout = seatLayout(count, viewer, shape);
        const mine = layout.find((spot) => spot.index === viewer);
        assert.equal(mine.relative, 0, `${key} ${count}-handed, seat ${viewer}`);
        assert.equal(mine.side, "bottom");
        assert.ok(mine.seat.y > shape.box.height / 2, "the viewer is above the middle of the table");
        assert.ok(Math.abs(mine.seat.x - shape.box.width / 2) < 0.001, "the viewer is not centred");
      }
    }
  }
});

test("play runs clockwise, so the next seat is to your left", () => {
  everyTable((layout, shape, where) => {
    for (let relative = 1; relative < layout.length; relative += 1) {
      const step = (layout[relative].degrees - layout[relative - 1].degrees + 360) % 360;
      assert.ok(
        Math.abs(step - 360 / layout.length) < 0.001,
        `${where}: seat ${relative} is ${step.toFixed(1)}° on from the last, expected ${(360 / layout.length).toFixed(1)}°`,
      );
    }
  });
});

test("no two name plates overlap, at any size", () => {
  everyTable((layout, shape, where) => {
    for (let i = 0; i < layout.length; i += 1) {
      for (let j = i + 1; j < layout.length; j += 1) {
        assert.ok(
          !overlaps(boxAt(layout[i].seat, shape.plate), boxAt(layout[j].seat, shape.plate)),
          `${where}: seats ${i} and ${j} overlap`,
        );
      }
    }
  });
});

test("a played card never lands on anybody's name plate", () => {
  everyTable((layout, shape, where) => {
    for (const spot of layout) {
      for (const other of layout) {
        assert.ok(
          !overlaps(boxAt(spot.played, shape.card), boxAt(other.seat, shape.plate)),
          `${where}: ${spot.index}'s card covers ${other.index}'s plate`,
        );
      }
    }
  });
});

test("played cards never cover each other", () => {
  // This is what makes a full table hard: every card is pushed in far enough to
  // clear its own plate, so the ring tightens as the seats fill up.
  everyTable((layout, shape, where) => {
    for (let i = 0; i < layout.length; i += 1) {
      for (let j = i + 1; j < layout.length; j += 1) {
        assert.ok(
          !overlaps(boxAt(layout[i].played, shape.card), boxAt(layout[j].played, shape.card)),
          `${where}: cards from seats ${i} and ${j} overlap`,
        );
      }
    }
  });
});

test("nothing lands on whatever is in the middle of the felt", () => {
  everyTable((layout, shape, where) => {
    const middle = { x: shape.box.width / 2, y: shape.box.height / 2 };
    for (const spot of layout) {
      assert.ok(
        !overlaps(boxAt(spot.played, shape.card), boxAt(middle, shape.centre)),
        `${where}: ${spot.index}'s card covers the middle of the table`,
      );
    }
  });
});

test("your card is nearer to you than to anyone else", () => {
  // This is the whole claim the layout makes, so it is worth asserting directly.
  everyTable((layout, shape, where) => {
    for (const spot of layout) {
      const mine = distance(spot.played, spot.seat);
      for (const other of layout) {
        if (other.index === spot.index) continue;
        assert.ok(
          distance(spot.played, other.seat) > mine,
          `${where}: ${spot.index}'s card sits closer to ${other.index}'s seat than to their own`,
        );
      }
    }
  });
});

test("everything stays on the felt", () => {
  everyTable((layout, shape, where) => {
    const cx = shape.box.width / 2;
    const cy = shape.box.height / 2;
    // Measured against an ellipse inset 4%, so there is margin left over.
    const fx = (shape.box.width * 0.92) / 2;
    const fy = (shape.box.height * 0.92) / 2;
    const within = ({ left, right, top, bottom }) => [[left, top], [right, top], [left, bottom], [right, bottom]]
      .every(([x, y]) => (((x - cx) / fx) ** 2) + (((y - cy) / fy) ** 2) <= 1);

    for (const spot of layout) {
      assert.ok(within(boxAt(spot.seat, shape.plate)), `${where}: seat ${spot.index} hangs off the table`);
      assert.ok(within(boxAt(spot.played, shape.card)), `${where}: card ${spot.index} hangs off the table`);
    }
  });
});

test("pills hang away from the middle of the table", () => {
  // A pill that hangs toward the middle lands on the ring of played cards.
  everyTable((layout, shape, where) => {
    for (const spot of layout) {
      const above = spot.seat.y < shape.box.height / 2;
      assert.equal(spot.half, above ? "upper" : "lower", `${where}: seat ${spot.index}'s pills point at the cards`);
    }
  });
});

test("the plates give up their second line only once they have to", () => {
  for (const count of COUNTS) {
    const [wide] = tableShapes(count);
    assert.equal(wide.crowded, count > 8, `${count} seats`);
  }
  // Seven and eight buy their room from the gap instead, so the cards keep their
  // size — the thing a player actually has to read.
  const [eight] = tableShapes(8);
  const [four] = tableShapes(4);
  assert.deepEqual(eight.shape.card, four.shape.card);
  assert.ok(eight.shape.gap < four.shape.gap);
});

test("a game can bring its own card size", () => {
  const table = { wide: { card: { w: 70, h: 96 } } };
  const [wide] = tableShapes(4, table);
  assert.deepEqual(wide.shape.card, { w: 70, h: 96 });
  assert.deepEqual(wide.shape.plate, { w: 152, h: 44 }, "an override should not disturb the rest");
});

test("clearance uses both boxes on each axis", () => {
  const { plate, card } = WIDE_TABLE;
  // Straight up: only the heights matter. Straight across: only the widths.
  assert.equal(clearance(plate, card, 0, -1), (plate.h + card.h) / 2);
  assert.equal(clearance(plate, card, 1, 0), (plate.w + card.w) / 2);
  // On a diagonal it is the easier of the two, never the sum of separate edges.
  const diagonal = clearance(plate, card, Math.SQRT1_2, Math.SQRT1_2);
  assert.ok(diagonal < (plate.w + card.w) / 2 / Math.SQRT1_2);
  assert.ok(diagonal >= (plate.h + card.h) / 2);
});

test("the fan of backs is capped and centred", () => {
  assert.equal(backFan(0).length, 0);
  assert.equal(backFan(5).length, 5);
  assert.equal(backFan(20).length, 8, "a twenty-card hand should not draw twenty backs");
  const fan = backFan(4);
  const spread = fan.reduce((sum, card) => sum + card.angle, 0);
  assert.ok(Math.abs(spread) < 1e-9, "the fan leans to one side");
});
