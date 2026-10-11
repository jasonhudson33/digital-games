import assert from "node:assert/strict";
import test from "node:test";

import { orderHand } from "../lib/hand-order.js";

const label = (cards) => cards.map((card) => (card.type === "joker" ? "joker" : `${card.rank ?? card.kind}${card.suit ? card.suit[0] : ""}`)).join(" ");

test("Hearts shows each suit Ace first and the 2 last", () => {
  const hand = [
    { id: "a", suit: "hearts", rank: 2 }, { id: "b", suit: "clubs", rank: 14 },
    { id: "c", suit: "hearts", rank: 13 }, { id: "d", suit: "hearts", rank: 14 }, { id: "e", suit: "clubs", rank: 5 },
  ];
  assert.equal(label(orderHand("hearts", hand)), "14c 5c 14h 13h 2h");
});

test("7-Up treats the Ace stored as 1 as the highest card", () => {
  const hand = [
    { id: "a", suit: "spades", rank: 13 }, { id: "b", suit: "spades", rank: 1 }, { id: "c", suit: "spades", rank: 2 },
  ];
  assert.equal(label(orderHand("seven-up", hand)), "1s 13s 2s");
});

test("Scum groups equal ranks together, highest first, suit only as the tiebreak", () => {
  const hand = [
    { id: "a", suit: "spades", rank: 13 }, { id: "b", suit: "clubs", rank: 5 },
    { id: "c", suit: "hearts", rank: 14 }, { id: "d", suit: "clubs", rank: 13 },
    { id: "e", suit: "joker-red", rank: 15 },
  ];
  assert.equal(label(orderHand("scum", hand)), "15j 14h 13c 13s 5c");
});

test("Pinochle keeps its own strength order, with trump last", () => {
  const hand = [9, 11, 12, 13, 10, 14].map((rank) => ({ id: `h${rank}`, suit: "hearts", rank, copy: 0 }));
  assert.equal(label(orderHand("pinochle", hand)), "14h 10h 13h 12h 11h 9h");
  const mixed = [{ id: "x", suit: "clubs", rank: 9 }, { id: "y", suit: "spades", rank: 14 }, { id: "z", suit: "diamonds", rank: 9 }];
  assert.equal(label(orderHand("pinochle", mixed, { trump: "clubs" })), "9d 14s 9c");
});

test("Hand & Foot shows jokers, then 2s, then each suit from Ace down to 3", () => {
  const hand = [
    { id: "a", suit: "hearts", rank: 3 }, { id: "b", suit: "clubs", rank: 14 }, { id: "c", suit: null, rank: "joker", copy: 0 },
    { id: "d", suit: "spades", rank: 2 }, { id: "e", suit: "clubs", rank: 9 }, { id: "f", suit: "hearts", rank: 14 },
  ];
  assert.equal(label(orderHand("hand-and-foot", hand)), "joker 2s 14c 9c 14h 3h");
});

test("Five Crowns shows jokers first, then each suit from King down", () => {
  const hand = [
    { id: "a", type: "normal", suit: "stars", rank: 3 }, { id: "b", type: "joker", suit: null, rank: null },
    { id: "c", type: "normal", suit: "stars", rank: 13 }, { id: "d", type: "normal", suit: "hearts", rank: 7 },
  ];
  assert.equal(label(orderHand("five-crowns", hand)), "joker 13s 3s 7h");
});

test("Skull King shows each colour high to low, then the specials", () => {
  const hand = [
    { id: "p", type: "special", kind: "pirate" }, { id: "g1", type: "number", suit: "green", rank: 1 },
    { id: "g9", type: "number", suit: "green", rank: 9 }, { id: "y5", type: "number", suit: "yellow", rank: 5 },
  ];
  assert.equal(label(orderHand("skull-king", hand)), "9g 1g 5y pirate");
});

test("ordering never mutates the hand or drops a card", () => {
  const hand = [{ id: "a", suit: "clubs", rank: 2 }, { id: "b", suit: "clubs", rank: 14 }];
  const copy = structuredClone(hand);
  const shown = orderHand("hearts", hand);
  assert.deepEqual(hand, copy);
  assert.equal(shown.length, hand.length);
});

test("a game with no entry is returned unchanged", () => {
  const hand = [{ id: "a" }, { id: "b" }];
  assert.equal(orderHand("uno", hand), hand);
});
