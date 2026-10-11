"use client";

import { useState } from "react";
import { Check, Dices, Flag, Handshake, Landmark, Trophy, X } from "lucide-react";
import { RACING_CAMELS } from "../lib/camel-up.js";
import { unavailableReason } from "../lib/camel-up-actions.js";
import { CAMEL_LABELS, Camel } from "./camel-up-board.js";
import { TicketStacks } from "./camel-up-players.js";

const ACTIONS = [
  { id: "roll", label: "Roll", icon: Dices },
  { id: "leg", label: "Leg bet", icon: Flag },
  { id: "tile", label: "Tile", icon: Landmark },
  { id: "finish", label: "Finish bet", icon: Trophy },
  { id: "partner", label: "Partner", icon: Handshake },
];

/**
 * One choice per turn. The panel only submits named actions; which spaces are
 * legal and which actions are open come from the same checks the server runs.
 */
export function ActionPanel({ room, me, active, busy, act, action, setAction, tileSide, setTileSide, tileSpace, onCancelTile }) {
  const [finishCamel, setFinishCamel] = useState("");
  const [finishType, setFinishType] = useState("winner");
  const myTurn = room.phase === "playing" && active?.id === me.id;
  const offered = ACTIONS.filter((item) => item.id !== "partner" || room.players.length >= 6);
  const reasons = Object.fromEntries(offered.map((item) => [item.id, unavailableReason(room, me, item.id)]));
  const chosen = offered.some((item) => item.id === action) ? action : "roll";
  const left = 5 - room.pyramidTicketsTaken;
  const pickedFinish = me.finishCards.includes(finishCamel) ? finishCamel : me.finishCards[0] ?? "";
  const blocked = offered.filter((item) => myTurn && reasons[item.id]);
  const availablePartners = room.players.filter((player) => player.id !== me.id && !player.partnerId);

  return <section className={`camel-panel ${myTurn ? "ready" : "waiting"} ${myTurn && chosen === "tile" ? "placing" : ""}`} aria-label="Turn actions">
    <div className="camel-panel-head">
      <strong>{myTurn ? "Your turn" : `${active?.name ?? "Another player"}'s turn`}</strong>
      <small>{myTurn ? "Choose one action — it uses your whole turn." : active?.isComputer ? "The computer is thinking." : "You can bet again when it is your turn."}</small>
    </div>
    <div className="camel-seg" role="tablist" aria-label="Choose your action">
      {offered.map(({ id, label, icon: Icon }) => <button
        type="button"
        role="tab"
        key={id}
        aria-selected={chosen === id}
        disabled={!myTurn || busy || Boolean(reasons[id])}
        title={reasons[id] ?? label}
        className={chosen === id ? "on" : ""}
        onClick={() => { if (id !== "tile") onCancelTile(); setAction(id); }}
      ><Icon aria-hidden="true" />{label}</button>)}
    </div>
    {blocked.length > 0 && <ul className="camel-why" aria-label="Unavailable actions">
      {blocked.map((item) => <li key={item.id}><b>{item.label}:</b> {reasons[item.id]}</li>)}
    </ul>}

    {myTurn && <div className="camel-panel-body" role="tabpanel">
      {chosen === "roll" && <button type="button" className="camel-primary" disabled={busy || Boolean(reasons.roll)} onClick={() => act("rollPyramid")}>
        <Dices aria-hidden="true" /><span>Roll the pyramid</span><small>{left} ticket{left === 1 ? "" : "s"} left this leg · you earn 1 EP</small>
      </button>}

      {chosen === "leg" && <>
        <p className="camel-hint">Back a camel to lead at the end of the leg. Tap its ticket stack.</p>
        <TicketStacks stacks={room.legBetStacks} busy={busy} reasonFor={(camelId) => unavailableReason(room, me, "leg", camelId)} onTake={(camelId) => act("takeLegTicket", { camelId })} />
      </>}

      {chosen === "tile" && <>
        <div className="camel-toggle" role="group" aria-label="Tile side">
          <button type="button" aria-pressed={tileSide === "cheer"} onClick={() => setTileSide("cheer")}>Cheer <b>+1</b></button>
          <button type="button" aria-pressed={tileSide === "boo"} onClick={() => setTileSide("boo")}>Boo <b>−1</b></button>
        </div>
        <p className="camel-hint" role="status">{tileSpace ? `Space ${tileSpace} chosen — tap another to change it.` : "Tap a highlighted space on the track."}</p>
        <div className="camel-confirm">
          <button type="button" className="camel-primary" aria-label={`Place ${tileSide === "cheer" ? "cheering" : "booing"} tile`} disabled={busy || !tileSpace} onClick={() => act("placeSpectator", { space: tileSpace, side: tileSide })}><Check aria-hidden="true" /> Place tile</button>
          <button type="button" className="camel-quiet" onClick={() => { onCancelTile(); setAction("roll"); }}><X aria-hidden="true" /> Cancel</button>
        </div>
      </>}

      {chosen === "finish" && <>
        <p className="camel-hint">Secretly bet on the overall result. Earlier correct cards pay more.</p>
        <div className="camel-cards" role="radiogroup" aria-label="Camel for your finish card">
          {RACING_CAMELS.filter((camelId) => me.finishCards.includes(camelId)).map((camelId) => <button type="button" role="radio" aria-checked={pickedFinish === camelId} key={camelId} className={`camel-pick-card ${pickedFinish === camelId ? "on" : ""}`} onClick={() => setFinishCamel(camelId)}>
            <Camel camelId={camelId} size="sm" /><span>{CAMEL_LABELS[camelId]}</span>
          </button>)}
        </div>
        <div className="camel-toggle" role="group" aria-label="Finish bet type">
          <button type="button" aria-pressed={finishType === "winner"} onClick={() => setFinishType("winner")}>Overall winner</button>
          <button type="button" aria-pressed={finishType === "loser"} onClick={() => setFinishType("loser")}>Overall loser</button>
        </div>
        <button type="button" className="camel-primary" disabled={busy || !pickedFinish} onClick={() => act("placeFinishBet", { bet: finishType, camelId: pickedFinish })}><Trophy aria-hidden="true" /> Place secret {finishType} bet</button>
      </>}

      {chosen === "partner" && <>
        <p className="camel-hint">Pair up for this leg. At scoring, each of you may copy one of the other's rewards.</p>
        <div className="camel-partners">
          {availablePartners.map((player) => <button type="button" key={player.id} disabled={busy} onClick={() => act("formPartnership", { partnerId: player.id })}><Handshake aria-hidden="true" /> {player.name}</button>)}
        </div>
      </>}
    </div>}
  </section>;
}
