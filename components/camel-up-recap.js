"use client";

import { ChoiceModal } from "./ui/table-shell";
import { CAMEL_LABELS, Camel } from "./camel-up-board.js";

const LEG_ROLLS = 5;

export const recapStorageKey = (roomCode) => `camel-up-recap-${roomCode}`;
export const signed = (amount) => `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${Math.abs(amount)}`;

/** The newest scored non-final leg this browser has not dismissed yet. */
export function pendingRecap(room, dismissedLeg) {
  const recap = room?.legRecap;
  return recap && !recap.final && recap.leg > dismissedLeg ? recap : null;
}

export function rollText(roll) {
  const tile = roll.tile
    ? ` — ${roll.tile.ownerName}'s ${roll.tile.side === "cheer" ? "cheering tile paid 1 EP and pushed it ahead" : "booing tile paid 1 EP and pushed it back"}`
    : "";
  return `${roll.playerName} rolled ${CAMEL_LABELS[roll.camelId]} ${roll.value}${tile}`;
}

export function DiceTray({ room }) {
  const rolls = room.legRolls || [];
  const latest = rolls.at(-1) ?? room.legRecap?.rolls?.at(-1) ?? null;
  const latestLeg = rolls.length ? room.leg : room.legRecap?.leg;
  return <section className="camel-tray" aria-label="Pyramid rolls this leg">
    <ol className="camel-dice">
      {Array.from({ length: LEG_ROLLS }, (_, index) => {
        const roll = rolls[index];
        return <li key={index} className={`camel-die ${roll ? "filled" : ""} ${roll && index === rolls.length - 1 ? "fresh" : ""}`}>
          {roll
            ? <><Camel camelId={roll.camelId} size="sm" /><b aria-label={`rolled ${roll.value}`}>{roll.value}</b><small>{roll.playerName}{roll.dieId === "grey" ? " · grey die" : ""}</small></>
            : <><span className="camel-die-empty" /><small>Roll {index + 1}</small></>}
        </li>;
      })}
    </ol>
    <p className="camel-roll-note" role="status" aria-live="polite" key={latest ? `${latestLeg}:${latest.n}` : "none"}>
      {latest ? rollText(latest) : "No pyramid rolls yet this leg."}
    </p>
  </section>;
}

function RollList({ rolls }) {
  return <ol className="camel-recap-rolls">
    {rolls.map((roll) => <li key={roll.n}><b>{roll.n}</b><Camel camelId={roll.camelId} size="sm" /><span>{rollText(roll)}</span><strong>{roll.value}</strong></li>)}
  </ol>;
}

export function LegRecapModal({ recap, final = false, onClose, onContinue }) {
  return <ChoiceModal
    wide
    title={final ? `The race is over — leg ${recap.leg} scored` : `Leg ${recap.leg} scored`}
    text={final ? "Here is how the last leg paid out. The overall bets come next." : "Every roll and payout from the leg that just ended. The next leg is already under way."}
    onClose={final ? undefined : onClose}
    actions={<button type="button" className="tbl-primary" onClick={final ? onContinue : onClose}>{final ? "Reveal overall bets" : "Continue"}</button>}
  >
    <div className="camel-recap">
      <section>
        <h3>Leg order</h3>
        <ol className="camel-recap-order">{recap.ranking.map((camelId, index) => <li key={camelId}><b>{index + 1}</b><Camel camelId={camelId} size="sm" />{CAMEL_LABELS[camelId]}</li>)}</ol>
      </section>
      <section>
        <h3>Rolls</h3>
        <RollList rolls={recap.rolls} />
      </section>
      <section>
        <h3>Payouts</h3>
        <table className="camel-recap-table">
          <thead><tr><th scope="col">Player</th><th scope="col">How they scored</th><th scope="col">Total</th></tr></thead>
          <tbody>
            {recap.rows.map((row) => {
              const change = row.legAfter - row.before;
              return <tr key={row.playerId}>
                <th scope="row">{row.name}</th>
                <td>
                  <span className="camel-chips">
                    {row.tickets.map((ticket, index) => <i key={index} className={ticket.reward >= 0 ? "gain" : "loss"}>{CAMEL_LABELS[ticket.camelId]} {ticket.value} · {signed(ticket.reward)}</i>)}
                    {row.pyramid > 0 && <i className="gain">Pyramid · +{row.pyramid}</i>}
                    {row.tileIncome > 0 && <i className="gain">Spectator tile · +{row.tileIncome}</i>}
                    {row.copied && <i className={row.copied.reward >= 0 ? "gain" : "loss"}>Partner {row.copied.label} · {signed(row.copied.reward)}</i>}
                    {row.floored && <i className="loss">Cannot go below 0</i>}
                    {!row.tickets.length && !row.pyramid && !row.tileIncome && !row.copied && <i>No bets</i>}
                  </span>
                </td>
                <td><strong>{row.before} → {row.legAfter}</strong><small className={change >= 0 ? "gain" : "loss"}>{signed(change)}</small></td>
              </tr>;
            })}
          </tbody>
        </table>
      </section>
    </div>
  </ChoiceModal>;
}

export function FinishBetsModal({ recap, onContinue }) {
  const decks = [["winner", "Overall winner"], ["loser", "Overall loser"]];
  return <ChoiceModal wide title="Overall bets revealed" text="Cards pay in the order they were placed." actions={<button type="button" className="tbl-primary" onClick={onContinue}>Final standings</button>}>
    <div className="camel-recap">
      {decks.map(([type, label]) => <section key={type}>
        <h3>{label}: <Camel camelId={recap.finish[type].camelId} size="sm" /> {CAMEL_LABELS[recap.finish[type].camelId]}</h3>
        {recap.finish[type].cards.length
          ? <ol className="camel-recap-rolls">{recap.finish[type].cards.map((card, index) => <li key={index} className={card.correct ? "gain" : "loss"}>
            <b>{index + 1}</b><Camel camelId={card.camelId} size="sm" /><span>{card.playerName} bet {CAMEL_LABELS[card.camelId]} — {card.correct ? "correct" : "wrong"}</span><strong>{signed(card.delta)}</strong>
          </li>)}</ol>
          : <p className="camel-recap-none">Nobody placed a card.</p>}
      </section>)}
    </div>
  </ChoiceModal>;
}
