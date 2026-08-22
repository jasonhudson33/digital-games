import assert from "node:assert/strict";
import test from "node:test";

import { createPinochleGame } from "../lib/pinochle.js";
import { seatLayout } from "../lib/table-seats.js";

/*
 * The shared geometry is tested in table-seats.test.mjs. This is the one claim
 * that is Pinochle's own: a partnership has to read off the table, so partners
 * must never be sitting next to each other.
 */

test("partners sit opposite each other", () => {
  for (const count of [4, 6]) {
    const game = createPinochleGame({
      playerSeeds: Array.from({ length: count }, (unused, index) => ({ playerId: `p${index}`, name: `P${index}` })),
    });
    assert.ok(game.partnershipGame, `${count}-handed should be a partnership game`);
    const layout = seatLayout(count, 0);
    const mine = game.players[0].teamId;
    const partners = layout.filter((spot) => spot.index !== 0 && game.players[spot.index].teamId === mine);
    assert.ok(partners.length > 0);
    for (const partner of partners) {
      // Opposite, or evenly spaced round from you — never in the seat next door.
      assert.notEqual(partner.relative, 1, `${count}-handed: a partner is sitting on your immediate left`);
      assert.notEqual(partner.relative, count - 1, `${count}-handed: a partner is sitting on your immediate right`);
    }
    if (count === 4) assert.equal(partners[0].side, "top", "a four-hand partner should be straight across");
  }
});
