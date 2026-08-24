"use client";

export function Phase10Card({ card, compact = false }) {
  if (!card) return null;
  const label = card.type === "number" ? card.number : card.type === "wild" ? "W" : "S";
  const name = card.type === "number" ? `${card.color} ${card.number}` : card.type === "wild" ? "Wild" : "Skip";
  return (
    <span className={`p10-card p10-${card.type} ${card.color ? `p10-${card.color}` : ""} ${compact ? "compact" : ""}`} aria-label={name}>
      <i className="p10-index top">{label}</i>
      <span className="p10-card-orbit" aria-hidden="true" />
      <b>{card.type === "skip" ? <span className="p10-skip-mark" /> : label}</b>
      <em>{card.type === "wild" ? "WILD" : card.type === "skip" ? "SKIP" : card.color}</em>
      <i className="p10-index bottom">{label}</i>
    </span>
  );
}

export function Phase10CardBack() {
  return <span className="p10-card p10-back" aria-label="Draw pile"><span>PHASE</span><b>10</b></span>;
}
