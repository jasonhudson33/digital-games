import { Bot, Coins } from "lucide-react";

import { GamePiece, readyWorkers, totalWorkers } from "./pieces.js";

/**
 * The opponents and you, one compact chip each. A chip is also where motion
 * starts and ends (data-player-chip), so a worker or a coin gain has somewhere
 * to come from.
 */
export default function PlayerStrip({ room, playerId, actorId }) {
  const waitingOn = room.pending?.waitingOn ?? [];
  const order = [...room.players].sort((a, b) => (a.wakeRow ?? 99) - (b.wakeRow ?? 99));
  return <section className="viti-strip" aria-label="Vintners">
    {order.map((player) => {
      const acting = actorId === player.id && room.phase !== "finished" && !room.pending;
      const waiting = waitingOn.includes(player.id);
      const mine = player.id === playerId;
      const cards = player.cardCounts ? Object.values(player.cardCounts).reduce((sum, count) => sum + count, 0) : 0;
      return <article
        key={player.id}
        className={`viti-chip ${acting ? "is-acting" : ""} ${waiting ? "is-waiting" : ""} ${mine ? "is-me" : ""} ${room.winners.includes(player.id) ? "is-winner" : ""}`}
        data-player-chip={player.id}
        style={{ "--player": player.color }}
      >
        <span className="viti-chip-avatar">{player.isComputer ? <Bot aria-hidden="true" /> : player.name[0]}</span>
        <span className="viti-chip-name"><strong>{player.name}{mine ? " (you)" : ""}</strong><small>{acting ? (mine ? "Your move" : "Their move") : waiting ? "Choosing…" : player.wakeRow ? `Row ${player.wakeRow}` : "Asleep"}</small></span>
        <span className="viti-chip-score" aria-label={`${player.score} of 20 victory points`}><b>{player.score}</b><small>/20 VP</small></span>
        <span className="viti-chip-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (player.score / 20) * 100)}%` }} /></span>
        <span className="viti-chip-stats">
          <span title="Coins"><Coins aria-hidden="true" />{player.coins}</span>
          <span title="Workers ready"><GamePiece type="regular" color={player.color} />{readyWorkers(player)}/{totalWorkers(player)}</span>
          <span title="Cards in hand">{cards} cards</span>
        </span>
      </article>;
    })}
  </section>;
}
