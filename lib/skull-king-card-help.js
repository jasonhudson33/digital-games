import { SKULL_KING_SPECIALS, SKULL_KING_SUIT_DETAILS } from "./skull-king.js";

const SPECIAL_CARD_HELP = {
  escape: {
    summary: "Counts as nothing and normally cannot win a trick.",
    details: [
      "You may play it even when you could follow the led suit.",
      "If no numbered or character card can win, the first Escape or Doubloons card played wins the trick.",
    ],
  },
  doubloon: {
    summary: "An Escape that can create a 20-point alliance with the trick winner.",
    details: [
      "It follows all Escape rules and normally cannot win.",
      "If another player wins the trick, you form an alliance with that player.",
      "You and the winner each gain 20 points only if both players make their bids exactly.",
    ],
  },
  mermaid: {
    summary: "Beats numbered cards, the Skull King, and First Mate Con, but normally loses to Pirates.",
    details: [
      "If a Mermaid, Pirate, and Skull King are all played, the first Mermaid wins.",
      "Capturing the Skull King adds 40 bonus points; capturing First Mate Con adds 30, provided you make your bid exactly.",
    ],
  },
  tigress: {
    summary: "Choose whether Tigress acts as a Pirate or an Escape when you play her.",
    details: [
      "As a Pirate, she uses the Pirate hierarchy and character capture bonuses.",
      "As an Escape, she counts as nothing and normally cannot win.",
    ],
  },
  skullKing: {
    summary: "Beats numbered cards, Pirates, and First Mate Con, but loses to a Mermaid.",
    details: [
      "Each Pirate or First Mate Con captured adds 30 bonus points when you make your bid exactly.",
      "If a Mermaid is in the trick, the first Mermaid wins instead.",
    ],
  },
  firstMate: {
    summary: "Beats Pirates and numbered cards, but loses to the Skull King and Mermaids.",
    details: [
      "If First Mate Con wins, you may use the special ability of each named Pirate captured in the trick.",
      "A Mermaid or the Skull King that captures him can earn a 30-point bonus when that player makes their bid exactly.",
    ],
  },
  kraken: {
    summary: "Destroys the entire trick, so no player wins it.",
    details: [
      "The player to the left of the Kraken player leads the next trick.",
      "If another Sea Monster is played later, that later monster replaces the Kraken's effect.",
      "Davy Jones’ Locker destroys the Kraken regardless of play order.",
    ],
  },
  whiteWhale: {
    summary: "Flattens the hierarchy so the highest numbered card of any suit wins.",
    details: [
      "Suits, black trump, Pirates, Mermaids, and royal characters do not rank while its effect is active.",
      "If no numbered card was played, no one wins the trick.",
      "A later Sea Monster replaces this effect; Davy Jones’ Locker destroys it regardless of play order.",
    ],
  },
  spottedStingray: {
    summary: "Reverses the trick so the lowest numbered card of any suit wins.",
    details: [
      "Suits, black trump, Pirates, Mermaids, and royal characters do not rank while its effect is active.",
      "If no numbered card was played, no one wins the trick.",
      "A later Sea Monster replaces this effect; Davy Jones’ Locker destroys it regardless of play order.",
    ],
  },
  walkThePlank: {
    summary: "Removes one Pirate from the trick before the winner is determined.",
    details: [
      "After everyone plays, choose one Pirate in the trick to remove.",
      "The removed Pirate cannot win or provide a capture bonus. If there is no Pirate, this card has no effect.",
      "Walk the Plank is not itself a winning card.",
    ],
  },
  lastVolley: {
    summary: "Lets you play one extra card now, then makes you skip the final trick.",
    details: [
      "After every player makes their regular play, you immediately add a second card to this trick.",
      "You do not play a card in the round's final trick.",
      "If played during the final trick, it provides no extra play and cannot win.",
    ],
  },
  davyJones: {
    summary: "Destroys every Sea Monster in the trick, regardless of play order.",
    details: [
      "After the monsters are removed, the remaining cards determine the winner normally.",
      "You gain 20 bonus points for each destroyed monster when you make your bid exactly.",
      "Davy Jones’ Locker is not itself a winning card.",
    ],
  },
};

export function getSkullKingCardHelp(card) {
  if (!card) return null;

  if (card.type === "special" && card.kind === "pirate") {
    return {
      title: card.name || "Pirate",
      summary: "May be played regardless of suit and beats numbered cards and Mermaids.",
      details: [
        `When this Pirate wins: ${card.ability}`,
        "Capturing each Mermaid adds 20 bonus points when you make your bid exactly.",
        "Pirates lose to First Mate Con and the Skull King.",
      ],
    };
  }

  if (card.type === "special") {
    const help = SPECIAL_CARD_HELP[card.kind];
    return help
      ? { title: SKULL_KING_SPECIALS[card.kind].label, ...help }
      : null;
  }

  if (card.type === "wild15") {
    return {
      title: "Wild Monkey 15",
      summary: "A 15 that becomes green, yellow, or purple—never black trump.",
      details: [
        "When following an existing non-black lead, it adopts that suit automatically.",
        "When leading, or when no suit has been established, choose green, yellow, or purple.",
        "Black still trumps it under normal rules; under White Whale, it is the highest numbered card.",
      ],
    };
  }

  if (card.type === "choice") {
    const suit = SKULL_KING_SUIT_DETAILS[card.suit].label;
    return {
      title: `Wild ${suit} 0/14`,
      summary: `Choose whether this ${suit} card counts as 0 or 14 when you play it.`,
      details: [
        `It always follows its printed ${suit} suit.`,
        "Choosing 14 does not provide the normal 14-card bonus.",
      ],
    };
  }

  if (card.type === "number" && card.expansion && [7, 8].includes(card.rank)) {
    const points = card.rank === 7 ? -5 : 5;
    return {
      title: `Expansion ${card.rank}`,
      summary: `A normal ${card.rank} with a ${points > 0 ? "+" : "−"}${Math.abs(points)}-point capture value.`,
      details: [
        "It follows its suit and ranks exactly like the standard card with the same number.",
        `${points > 0 ? "The winner gains" : "The winner loses"} ${Math.abs(points)} points for capturing it, but only if that winner makes their bid exactly.`,
        "When equal cards tie, the first one played ranks first.",
      ],
    };
  }

  return null;
}
