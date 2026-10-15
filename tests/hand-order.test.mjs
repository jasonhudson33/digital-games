import assert from "node:assert/strict";
import test from "node:test";

import { orderHand } from "../lib/hand-order.js";

const label = (cards) => cards.map((card) => (card.type === "joker" ? "joker" : `${card.rank ?? card.kind}${card.suit ? card.suit[0] : ""}`)).join(" ");

test("Hearts shows each suit from its lowest card up to the Ace", () => {
  const hand = [
    { id: "a", suit: "hearts", rank: 2 }, { id: "b", suit: "clubs", rank: 14 },
    { id: "c", suit: "hearts", rank: 13 }, { id: "d", suit: "hearts", rank: 14 }, { id: "e", suit: "clubs", rank: 5 },
  ];
  assert.equal(label(orderHand("hearts", hand)), "5c 14c 2h 13h 14h");
});

test("7-Up puts the Ace stored as 1 after the lower ranks", () => {
  const hand = [
    { id: "a", suit: "spades", rank: 13 }, { id: "b", suit: "spades", rank: 1 }, { id: "c", suit: "spades", rank: 2 },
  ];
  assert.equal(label(orderHand("seven-up", hand)), "2s 13s 1s");
});

test("Scum groups equal ranks together, lowest first, suit only as the tiebreak", () => {
  const hand = [
    { id: "a", suit: "spades", rank: 13 }, { id: "b", suit: "clubs", rank: 5 },
    { id: "c", suit: "hearts", rank: 14 }, { id: "d", suit: "clubs", rank: 13 },
    { id: "e", suit: "joker-red", rank: 15 },
  ];
  assert.equal(label(orderHand("scum", hand)), "5c 13c 13s 14h 15j");
});

test("Pinochle keeps its own strength order, with trump last", () => {
  const hand = [9, 11, 12, 13, 10, 14].map((rank) => ({ id: `h${rank}`, suit: "hearts", rank, copy: 0 }));
  assert.equal(label(orderHand("pinochle", hand)), "9h 11h 12h 13h 10h 14h");
  const mixed = [{ id: "x", suit: "clubs", rank: 9 }, { id: "y", suit: "spades", rank: 14 }, { id: "z", suit: "diamonds", rank: 9 }];
  assert.equal(label(orderHand("pinochle", mixed, { trump: "clubs" })), "9d 14s 9c");
});

test("Hand & Foot shows jokers, then 2s, then each suit from 3 up to Ace", () => {
  const hand = [
    { id: "a", suit: "hearts", rank: 3 }, { id: "b", suit: "clubs", rank: 14 }, { id: "c", suit: null, rank: "joker", copy: 0 },
    { id: "d", suit: "spades", rank: 2 }, { id: "e", suit: "clubs", rank: 9 }, { id: "f", suit: "hearts", rank: 14 },
  ];
  assert.equal(label(orderHand("hand-and-foot", hand)), "joker 2s 9c 14c 3h 14h");
});

test("Five Crowns shows jokers first, then each suit from 3 up to King", () => {
  const hand = [
    { id: "a", type: "normal", suit: "stars", rank: 3 }, { id: "b", type: "joker", suit: null, rank: null },
    { id: "c", type: "normal", suit: "stars", rank: 13 }, { id: "d", type: "normal", suit: "hearts", rank: 7 },
  ];
  assert.equal(label(orderHand("five-crowns", hand)), "joker 3s 13s 7h");
});

test("Skull King shows each colour low to high, then the specials", () => {
  const hand = [
    { id: "p", type: "special", kind: "pirate" }, { id: "g1", type: "number", suit: "green", rank: 1 },
    { id: "g9", type: "number", suit: "green", rank: 9 }, { id: "y5", type: "number", suit: "yellow", rank: 5 },
  ];
  assert.equal(label(orderHand("skull-king", hand)), "1g 9g 5y pirate");
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
