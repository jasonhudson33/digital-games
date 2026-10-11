import { Leaf } from "lucide-react";

import { CARD_ART, cardSummary } from "./pieces.js";

/**
 * Autumn, in the board's own frame. Everyone chooses at once, in any order; a
 * Cottage owner is shown the two visitors they were dealt and keeps one.
 */
export default function AutumnPanel({ room, me, busy, onDecide }) {
  const waiting = room.pending?.waitingOn ?? [];
  const names = room.players.filter((player) => waiting.includes(player.id)).map((player) => player.name);
  const mine = waiting.includes(me.id);
  const stash = room.pending?.stash?.[me.id];

  if (!mine) {
    return <div className="viti-autumn is-waiting" role="status">
      <Leaf aria-hidden="true" />
      <h2>Autumn visitors</h2>
      <p>{waiting.length ? `Waiting on ${names.join(", ")}.` : "Autumn is over."}</p>
    </div>;
  }
  return <div className="viti-autumn">
    <Leaf aria-hidden="true" />
    <h2>{stash ? "Your Cottage: keep one visitor" : "Welcome a visitor"}</h2>
    <p>{stash ? "You drew one of each colour. Keep one; the other is discarded." : "Choose the colour of the visitor you draw this autumn."}</p>
    <div className="viti-autumn-choices">
      {["summer", "winter"].map((colour) => {
        const card = stash?.[colour];
        const blocked = stash && !card && (stash.summer || stash.winter);
        return <button key={colour} type="button" className={`is-${colour}`} disabled={busy || Boolean(blocked)} onClick={() => onDecide(colour)}>
          <i style={{ backgroundImage: `url(${CARD_ART[colour]})` }} />
          <strong>{card ? card.name : colour === "summer" ? "Summer visitor" : "Winter visitor"}</strong>
          <small>{card ? cardSummary(card, colour) : colour === "summer" ? "Played in summer (yellow)" : "Played in winter (blue)"}</small>
        </button>;
      })}
    </div>
  </div>;
}
