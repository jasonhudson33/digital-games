"use client";

import { Bot, Coins, Dices, Flag, Handshake, MapPin } from "lucide-react";
import { RACING_CAMELS } from "../lib/camel-up.js";
import { CAMEL_LABELS, Camel } from "./camel-up-board.js";

export function Scoreboard({ room, playerId, active }) {
  return <section className="camel-scoreboard" aria-label="Bettors">
    {room.players.map((player) => {
      const isActive = active?.id === player.id;
      const partner = room.players.find((item) => item.id === player.partnerId);
      return <article className={`camel-player ${player.id === playerId ? "mine" : ""} ${isActive ? "active" : ""}`} key={player.id} aria-current={isActive ? "true" : undefined}>
        <span className="camel-avatar">{player.isComputer ? <Bot aria-hidden="true" /> : player.name.slice(0, 1).toUpperCase()}</span>
        <div className="camel-player-main">
          <strong><span className="camel-name">{player.name}{player.id === playerId ? " (you)" : ""}</span>{isActive && <em className="camel-turn">{room.phase === "playing" ? "Turn" : "Choosing"}</em>}</strong>
          <span className="camel-holdings" aria-label={`${player.name}'s bets this leg`}>
            {player.legTickets.map((ticket) => <i key={ticket.id} className={`camel-held camel-${ticket.camelId}`} title={`${CAMEL_LABELS[ticket.camelId]} leg ticket worth ${ticket.value}`}>{ticket.value}</i>)}
            {player.pyramidTickets > 0 && <i className="camel-held pyramid" title={`${player.pyramidTickets} pyramid ticket${player.pyramidTickets === 1 ? "" : "s"}`}><Dices aria-hidden="true" />×{player.pyramidTickets}</i>}
            {player.spectator && <i className={`camel-held tile ${player.spectator.side}`} title={`${player.spectator.side === "cheer" ? "Cheering" : "Booing"} tile on space ${player.spectator.space}`}><MapPin aria-hidden="true" />{player.spectator.space}</i>}
            {partner && <i className="camel-held partner" title={`Partnered with ${partner.name}`}><Handshake aria-hidden="true" />{partner.name}</i>}
            {!player.legTickets.length && !player.pyramidTickets && !player.spectator && !partner && <small>No bets yet</small>}
          </span>
        </div>
        <b className="camel-money" title="Egyptian Pounds"><Coins aria-hidden="true" /> {player.money}</b>
      </article>;
    })}
  </section>;
}

/**
 * Each racing camel's remaining leg tickets, next payout on top. With `onTake` the
 * stacks are buttons; otherwise they are a read-only display of the same state.
 */
export function TicketStacks({ stacks, onTake, reasonFor, busy = false }) {
  return <div className="camel-ticket-grid">
    {RACING_CAMELS.map((camelId) => {
      const values = stacks[camelId] || [];
      const next = [...values].reverse();
      const reason = reasonFor?.(camelId) ?? null;
      const body = <>
        <span className="camel-ticket-cards" style={{ "--n": Math.max(values.length - 1, 0) }} aria-hidden="true">
          {values.slice(1).map((_, index) => <i key={index} />)}
          <b>{next[0] ?? "—"}</b>
        </span>
        <Camel camelId={camelId} size="sm" />
        <span className="camel-ticket-name">{CAMEL_LABELS[camelId]}</span>
        <small>{values.length ? `${next.join(" · ")}` : "Sold out"}</small>
      </>;
      if (!onTake) return <div className="camel-ticket-stack" key={camelId}>{body}</div>;
      return <button type="button" className="camel-ticket-stack" key={camelId} disabled={busy || Boolean(reason)} title={reason ?? `Take the ${next[0]} ticket for ${CAMEL_LABELS[camelId]}`} onClick={() => onTake(camelId)}>{body}</button>;
    })}
  </div>;
}

export function BetsPanel({ room, me }) {
  const nameOf = (id) => room.players.find((player) => player.id === id)?.name ?? "Player";
  return <aside className="camel-bets">
    <header><span><Flag aria-hidden="true" /> Leg bets</span><small>Next payout shown on top</small></header>
    <TicketStacks stacks={room.legBetStacks} />
    <div className="camel-overall">
      {["winner", "loser"].map((type) => <div key={type}>
        <strong>Overall {type}</strong>
        <small>{room.finishBets[type].length} card{room.finishBets[type].length === 1 ? "" : "s"} placed</small>
        <ol className="camel-deck">
          {room.finishBets[type].map((bet, index) => {
            const mine = bet.playerId === me.id;
            const owner = nameOf(bet.playerId);
            return <li key={`${bet.playerId}-${index}`} className={bet.camelId ? `camel-card camel-${bet.camelId}` : "camel-card back"} title={bet.camelId ? `${owner}: ${CAMEL_LABELS[bet.camelId]}${mine ? " (only you can see this)" : ""}` : `${owner}: hidden until the race ends`}>
              <b>{bet.camelId ? CAMEL_LABELS[bet.camelId].slice(0, 1) : "?"}</b><small>{owner.slice(0, 1).toUpperCase()}</small>
            </li>;
          })}
          {!room.finishBets[type].length && <li className="camel-card-empty">None yet</li>}
        </ol>
      </div>)}
    </div>
    <div className="camel-log" aria-label="Recent moves">{room.log.slice(0, 6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
  </aside>;
}
