"use client";

import * as PlayingCards from "@letele/playing-cards";

const SUIT_PREFIX = { clubs: "C", diamonds: "D", hearts: "H", spades: "S" };
const RANK_TOKEN = { 11: "j", 12: "q", 13: "k" };
const RANK_LABEL = { 11: "J", 12: "Q", 13: "K" };

const PIP_LAYOUTS = {
  3: [[50, 22], [50, 50], [50, 78]],
  4: [[32, 27], [68, 27], [32, 73], [68, 73]],
  5: [[32, 25], [68, 25], [50, 50], [32, 75], [68, 75]],
  6: [[32, 22], [68, 22], [32, 50], [68, 50], [32, 78], [68, 78]],
  7: [[32, 19], [68, 19], [50, 35], [32, 50], [68, 50], [32, 81], [68, 81]],
  8: [[32, 18], [68, 18], [50, 33], [32, 48], [68, 48], [50, 63], [32, 80], [68, 80]],
  9: [[31, 18], [69, 18], [31, 39], [69, 39], [50, 50], [31, 61], [69, 61], [31, 82], [69, 82]],
  10: [[31, 15], [69, 15], [50, 27], [31, 38], [69, 38], [31, 62], [69, 62], [50, 73], [31, 85], [69, 85]],
};

export function FiveCrownsCard({ card, wild = false }) {
  if (!card) return null;
  if (card.type === "joker") {
    const Joker = PlayingCards.J1;
    return <span className={`fc-card fc-svg-card joker ${wild ? "wild" : ""}`}><Joker title="Joker" /></span>;
  }
  if (card.suit === "stars") return <StarCard rank={card.rank} wild={wild} />;

  const prefix = SUIT_PREFIX[card.suit];
  const token = RANK_TOKEN[card.rank] || card.rank;
  const SvgCard = PlayingCards[`${prefix}${token}`];
  const kind = card.rank >= 11 ? "court" : "number";
  return (
    <span className={`fc-card fc-svg-card ${card.suit} ${kind} ${wild ? "wild" : ""}`}>
      <SvgCard title={`${RANK_LABEL[card.rank] || card.rank} of ${card.suit}`} />
    </span>
  );
}

export function FiveCrownsCardBack() {
  const Back = PlayingCards.B1;
  return <span className="fc-card fc-svg-card fc-svg-back"><Back title="Five Crowns draw pile" /></span>;
}

function StarCard({ rank, wild }) {
  const label = RANK_LABEL[rank] || rank;
  const pips = PIP_LAYOUTS[rank] || [];
  const court = rank >= 11;
  return (
    <span className={`fc-card fc-svg-card stars ${court ? "court" : "number"} ${wild ? "wild" : ""}`}>
      <svg viewBox="0 0 100 140" role="img" aria-label={`${label} of stars`}>
        <rect className="star-card-paper" x="1" y="1" width="98" height="138" rx="8" />
        <g className="star-card-index">
          <text x="9" y="18">{label}</text><text className="star-index-pip" x="10" y="29">★</text>
        </g>
        <g className="star-card-index star-card-index-bottom">
          <text x="9" y="18">{label}</text><text className="star-index-pip" x="10" y="29">★</text>
        </g>
        {court ? <StarCourt rank={rank} /> : pips.map(([x, y], index) => (
          <text className={`star-pip ${y > 50 ? "turned" : ""}`} x={x} y={y * 1.22 + 8} key={`${x}-${y}-${index}`}>★</text>
        ))}
      </svg>
    </span>
  );
}

function StarCourt({ rank }) {
  const label = RANK_LABEL[rank];
  return <g className={`star-court rank-${label.toLowerCase()}`}>
    <path className="star-court-frame" d="M25 35 50 23 75 35 72 104 50 117 28 104Z" />
    <path className="star-court-crown" d="m34 52 5-14 11 10 11-10 5 14Z" />
    <circle cx="50" cy="62" r="12" />
    <path className="star-court-robe" d="M34 103c1-19 7-29 16-29s15 10 16 29Z" />
    <text className="star-court-letter" x="50" y="99">{label}</text>
    <text className="star-court-star" x="50" y="117">★</text>
  </g>;
}
