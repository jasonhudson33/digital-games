import { SUITS as SEVEN_UP_SUITS } from "./game.js";
import { HEARTS_SUITS } from "./hearts.js";
import { SCUM_SUITS } from "./scum.js";
import { PINOCHLE_SUITS, PINOCHLE_RANKS } from "./pinochle.js";
import { HAND_FOOT_SUITS } from "./hand-and-foot.js";
import { SUITS as FIVE_CROWNS_SUITS } from "./five-crowns.js";
import { SKULL_KING_SUITS, SKULL_KING_SPECIALS } from "./skull-king.js";

/*
 * How a hand is SHOWN, highest card first, Ace high.
 *
 * Display only: the engines keep their own sorts (the bots and stored room
 * snapshots rely on them), and a client calls orderHand() when it renders.
 * That also puts hands saved before this order existed in the new order.
 *
 * Each game supplies three small keys:
 *   group     which cluster a card sits in (a suit, or "jokers first")
 *   strength  higher shows first inside a group
 *   tie       settles equal strength, so the order never flickers between deals
 */
const index = (list, value) => {
  const found = list.indexOf(value);
  return found === -1 ? list.length : found;
};

const standard = (suits, strength = (card) => card.rank) => ({
  group: (card) => index(suits, card.suit),
  strength,
  tie: (card) => card.copy || 0,
});

export const HAND_ORDERS = {
  hearts: standard(HEARTS_SUITS),

  // 7-Up ranks run 1-13 with the Ace stored as 1.
  "seven-up": standard(SEVEN_UP_SUITS, (card) => (card.rank === 1 ? 14 : card.rank)),

  // Scum groups by number: equal ranks sit together, suit only orders them.
  scum: {
    group: () => 0,
    strength: (card) => card.rank,
    tie: (card) => index([...SCUM_SUITS, "joker-black", "joker-red"], card.suit) * 10 + (card.copy || 0),
  },

  // Pinochle's own strength order (A, 10, K, Q, J, 9). Trump goes last, as the
  // engine already placed it.
  pinochle: {
    group: (card, { trump } = {}) => (trump && card.suit === trump ? PINOCHLE_SUITS.length : index(PINOCHLE_SUITS, card.suit)),
    strength: (card) => PINOCHLE_RANKS.indexOf(card.rank),
    tie: (card) => card.copy || 0,
  },

  // Jokers, then 2s (the wilds), then each suit from Ace down to 3.
  "hand-and-foot": {
    group: (card) => (card.rank === "joker" ? -2 : card.rank === 2 ? -1 : index(HAND_FOOT_SUITS, card.suit)),
    strength: (card) => (card.rank === "joker" ? 0 : card.rank),
    tie: (card) => (card.rank === "joker" ? 0 : index(HAND_FOOT_SUITS, card.suit)) * 10 + (card.copy || 0),
  },

  // Jokers first, then each suit from King down to 3 (Five Crowns has no Ace or 2).
  "five-crowns": {
    group: (card) => (card.type === "joker" ? -1 : index(FIVE_CROWNS_SUITS, card.suit)),
    strength: (card) => card.rank ?? 0,
    tie: (card) => String(card.id),
  },

  // Colours with their numbers high to low, then the 15 wild, then the specials
  // in the engine's order.
  "skull-king": {
    group: (card) => {
      if (card.type === "special") return 100 + index(Object.keys(SKULL_KING_SPECIALS), card.kind);
      if (card.type === "wild15") return SKULL_KING_SUITS.length;
      return index(SKULL_KING_SUITS, card.suit);
    },
    strength: (card) => (card.type === "special" ? 0 : card.type === "choice" ? (card.declaredValue ?? 7) : (card.rank ?? -1)),
    tie: (card) => String(card.id),
  },
};

const compareKeys = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** Cards in display order for `game`, highest first. Never mutates `cards`. */
export function orderHand(game, cards, context = {}) {
  const order = HAND_ORDERS[game];
  if (!order || !Array.isArray(cards)) return cards;
  return [...cards].sort(
    (a, b) =>
      order.group(a, context) - order.group(b, context)
      || order.strength(b) - order.strength(a)
      || compareKeys(order.tie(a), order.tie(b)),
  );
}
