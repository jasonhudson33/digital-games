import { Ban, CirclePlus, Hash, RefreshCw, Shuffle, SkipForward } from "lucide-react";

/*
 * The playing card used by UNO and DOS.
 *
 * The corners and face carried no class names, so the stylesheet reached them
 * with `.cg-card > small`, `> small:last-child` and `> i` — which meant the
 * card's appearance depended on the order of its children. They are named now.
 */

export function ColorGameCard({
  card,
  selected = false,
  disabled = false,
  small = false,
  dark = false,
  onClick,
  label,
}) {
  if (!card) return null;

  const className = [
    "tbl-card",
    `is-${card.color || "wild"}`,
    dark && "is-dark-face",
    selected && "is-selected",
    small && "is-small",
  ]
    .filter(Boolean)
    .join(" ");

  const content = cardContent(card);
  const title = label || cardName(card);

  if (onClick) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={onClick} aria-label={title}>
        {content}
      </button>
    );
  }
  return (
    <div className={className} role="img" aria-label={title}>
      {content}
    </div>
  );
}

export function CardBack({ count, small = false, flipSide = null }) {
  const className = [
    "tbl-card",
    "tbl-card-back",
    flipSide && `flip-${flipSide}`,
    small && "is-small",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} role="img" aria-label={`${count ?? 0} cards face down`}>
      <span>{flipSide ? "UNO" : "COLOR"}</span>
      <strong>{count ?? ""}</strong>
      <span>{flipSide ? "FLIP" : "CARDS"}</span>
    </div>
  );
}

export function cardName(card) {
  if (card.type === "number") return `${capitalize(card.color)} ${card.value}`;
  if (card.type === "wildDos") return "Wild DOS";
  if (card.type === "wildNumber") return `${capitalize(card.color)} Wild Number`;
  if (card.type === "wild4") return "Wild Draw Four";
  if (card.type === "wildDraw2") return "Wild Draw Two";
  if (card.type === "wildDrawColor") return "Wild Draw Color";
  if (card.type === "wild") return "Wild";
  if (card.type === "draw1") return `${capitalize(card.color)} Draw One`;
  if (card.type === "draw2") return `${capitalize(card.color)} Draw Two`;
  if (card.type === "draw5") return `${capitalize(card.color)} Draw Five`;
  if (card.type === "skipEveryone") return `${capitalize(card.color)} Skip Everyone`;
  if (card.type === "flip") return `${capitalize(card.color)} Flip`;
  return `${capitalize(card.color)} ${capitalize(card.type)}`;
}

function cardContent(card) {
  const corner = cornerLabel(card);
  return (
    <>
      <small className="tbl-card-corner">{corner}</small>
      <i className="tbl-card-face">{cardFaceContent(card)}</i>
      <small className="tbl-card-corner is-bottom">{corner}</small>
    </>
  );
}

function cardFaceContent(card) {
  if (card.type === "number") return <strong>{card.value}</strong>;
  if (card.type === "wildDos") return <><strong>2</strong><b>DOS</b></>;
  if (card.type === "wildNumber") return <><Hash /><b>WILD</b></>;
  if (card.type === "wild4") return <><CirclePlus /><strong>4</strong></>;
  if (card.type === "wildDraw2") return <><CirclePlus /><strong>2</strong></>;
  if (card.type === "wildDrawColor") return <><Shuffle /><b>COLOR</b></>;
  if (card.type === "wild") return <Shuffle />;
  if (card.type === "draw1") return <><CirclePlus /><strong>1</strong></>;
  if (card.type === "draw2") return <><CirclePlus /><strong>2</strong></>;
  if (card.type === "draw5") return <><CirclePlus /><strong>5</strong></>;
  if (card.type === "reverse") return <RefreshCw />;
  if (card.type === "skip") return <SkipForward />;
  if (card.type === "skipEveryone") return <><Ban /><b>EVERYONE</b></>;
  if (card.type === "flip") return <><RefreshCw /><b>FLIP</b></>;
  return <Ban />;
}

function cornerLabel(card) {
  if (card.type === "number") return card.value;
  if (card.type === "wildDos") return "2";
  if (card.type === "wildNumber") return "#";
  if (card.type === "wild4") return "+4";
  if (card.type === "wildDraw2") return "+2";
  if (card.type === "wildDrawColor") return "C";
  if (card.type === "wild") return "W";
  if (card.type === "draw1") return "+1";
  if (card.type === "draw2") return "+2";
  if (card.type === "draw5") return "+5";
  if (card.type === "reverse") return "↻";
  if (card.type === "skipEveryone") return "ALL";
  if (card.type === "flip") return "↔";
  return "⊘";
}

function capitalize(value) {
  return String(value || "").replace(/^./, (letter) => letter.toUpperCase());
}
