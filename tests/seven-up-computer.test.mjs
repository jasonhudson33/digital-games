import assert from "node:assert/strict";
import test from "node:test";

import { chooseComputerMove } from "../lib/game.js";

const card = (suit, rank) => ({ suit, rank });

test("Seven Up computers open the suit that unlocks the longest private chain", () => {
  const legal = [card("clubs", 7), card("hearts", 7)];
  const hand = [
    ...legal,
    card("clubs", 6),
    card("clubs", 5),
    card("hearts", 8),
  ];
  assert.deepEqual(chooseComputerMove(legal, hand), card("clubs", 7));
});

test("Seven Up computers prioritize an immediate winning play", () => {
  assert.deepEqual(chooseComputerMove([card("spades", 13)], [card("spades", 13)]), card("spades", 13));
});
