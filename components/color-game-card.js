import { Ban, CirclePlus, Hash, RefreshCw, Shuffle, SkipForward } from "lucide-react";

export function ColorGameCard({ card, selected = false, disabled = false, small = false, dark = false, onClick, label }) {
  if (!card) return null;
  const content = cardContent(card);
  const className = `cg-card cg-${card.color || "wild"} ${dark ? "cg-dark-face" : ""} ${selected ? "selected" : ""} ${small ? "small" : ""}`;
  const title = label || cardName(card);
  if (onClick) return <button type="button" className={className} disabled={disabled} onClick={onClick} aria-label={title}>{content}</button>;
  return <div className={className} aria-label={title}>{content}</div>;
}

export function CardBack({ count, small = false, flipSide = null }) {
  return <div className={`cg-card cg-back ${flipSide ? `flip-${flipSide}` : ""} ${small ? "small" : ""}`}><span>{flipSide ? "UNO" : "COLOR"}</span><strong>{count ?? ""}</strong><span>{flipSide ? "FLIP" : "CARDS"}</span></div>;
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
  let middle;
  if (card.type === "number") middle = <strong>{card.value}</strong>;
  else if (card.type === "wildDos") middle = <><strong>2</strong><b>DOS</b></>;
  else if (card.type === "wildNumber") middle = <><Hash /><b>WILD</b></>;
  else if (card.type === "wild4") middle = <><CirclePlus /><strong>4</strong></>;
  else if (card.type === "wildDraw2") middle = <><CirclePlus /><strong>2</strong></>;
  else if (card.type === "wildDrawColor") middle = <><Shuffle /><b>COLOR</b></>;
  else if (card.type === "wild") middle = <Shuffle />;
  else if (card.type === "draw1") middle = <><CirclePlus /><strong>1</strong></>;
  else if (card.type === "draw2") middle = <><CirclePlus /><strong>2</strong></>;
  else if (card.type === "draw5") middle = <><CirclePlus /><strong>5</strong></>;
  else if (card.type === "reverse") middle = <RefreshCw />;
  else if (card.type === "skip") middle = <SkipForward />;
  else if (card.type === "skipEveryone") middle = <><Ban /><b>EVERYONE</b></>;
  else if (card.type === "flip") middle = <><RefreshCw /><b>FLIP</b></>;
  else middle = <Ban />;
  return <><small>{corner(card)}</small><i>{middle}</i><small>{corner(card)}</small></>;
}

function corner(card) {
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
