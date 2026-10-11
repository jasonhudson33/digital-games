"use client";

import { useState } from "react";
import { ChevronRight, Sparkles, Sun } from "lucide-react";

import { ACTION_SPACES, actionCapacity, canUseAction } from "../../lib/viticulture.js";
import { CARD_ART, GamePiece, SEASONS, actionIcon, readyWorkers } from "./pieces.js";

const WAKE_REWARDS = ["First to act", "Draw a vine", "+1 coin", "Draw an order", "Extra worker", "+1 VP", "+1 coin & first player"];

/** Spring: the wake-up chart, in the same frame the action spaces use later. */
export function WakeChart({ room, myTurn, busy, onChoose }) {
  return <div className="viti-wake" aria-label="Wake-up chart">
    {WAKE_REWARDS.map((reward, index) => {
      const row = index + 1;
      const ownerId = Object.entries(room.wakeChoices).find(([, value]) => value === row)?.[0];
      const owner = room.players.find((player) => player.id === ownerId);
      return <button key={row} type="button" className={owner ? "is-taken" : ""} disabled={!myTurn || busy || Boolean(owner)} onClick={() => onChoose(row)}>
        <b>{row}</b>
        <span><strong>{reward}</strong><small>{owner ? `${owner.name} is here` : row < 3 ? "Early riser" : "Sleep in"}</small></span>
        {owner ? <GamePiece type="rooster" color={owner.color} label={`${owner.name}'s rooster`} /> : <Sun aria-hidden="true" />}
      </button>;
    })}
  </div>;
}

/** The six spaces of the current season. Tap a space to place a worker. */
export function ActionSpaces({ room, playerId, myTurn, busy, suggestedId, onSpace }) {
  const spaces = ACTION_SPACES.filter((space) => space.season === room.season);
  const slots = actionCapacity(room.players.length);
  return <div className={`viti-spaces season-${room.season}`} aria-label={`${SEASONS[room.season].label} action spaces`}>
    {spaces.map((space) => {
      const placements = room.placements[space.id] || [];
      const regular = placements.filter((placement) => placement.workerType !== "grande");
      const grande = placements.filter((placement) => placement.workerType === "grande");
      const canRegular = canUseAction(room, playerId, space.id, "regular");
      const canGrande = canUseAction(room, playerId, space.id, "grande");
      const usable = myTurn && !busy;
      const bonus = Boolean(room.bonusOpen?.[space.id]);
      const Icon = actionIcon(space.id);
      return <div key={space.id} className={`viti-space ${usable && (canRegular || canGrande) ? "is-open" : ""} ${suggestedId === space.id ? "is-suggested" : ""}`}>
        <button
          type="button"
          className="viti-space-main"
          disabled={!usable || !(canRegular || canGrande)}
          onClick={() => onSpace(space, canRegular ? "regular" : "grande")}
          aria-label={`${space.name}. ${space.detail}.${bonus ? ` Bonus: ${space.bonus}.` : ""} ${canRegular ? "Place a worker." : canGrande ? "Place your grande worker." : ""}`}
        >
          <span className="viti-space-icon"><Icon aria-hidden="true" /></span>
          <span className="viti-space-copy"><strong>{space.name}</strong><small>{space.detail}</small></span>
          <span className="viti-space-slots" aria-hidden="true">
            {Array.from({ length: slots }, (_, slot) => {
              const placement = regular[slot];
              const owner = placement && room.players.find((player) => player.id === placement.playerId);
              return <span key={slot} className={`viti-slot ${placement ? "is-filled" : ""}`} data-placed={placement ? `${space.id}:${placement.playerId}` : undefined}>{owner && <GamePiece type="regular" color={owner.color} />}</span>;
            })}
            {grande.map((placement, index) => {
              const owner = room.players.find((player) => player.id === placement.playerId);
              return <span key={`g-${index}`} className="viti-slot is-filled is-grande" data-placed={`${space.id}:${placement.playerId}`}><GamePiece type="grande" color={owner?.color} /></span>;
            })}
          </span>
          {bonus && <span className="viti-space-bonus" title={space.bonus}><Sparkles aria-hidden="true" />{space.bonus}</span>}
        </button>
        {usable && canRegular && canGrande && <button type="button" className="viti-grande-chip" onClick={() => onSpace(space, "grande")} aria-label={`Place your grande worker on ${space.name}`}>G</button>}
      </div>;
    })}
  </div>;
}

/** Ends your season. Asks first only when it would leave workers unused. */
export function PassControl({ room, me, myTurn, busy, onPass }) {
  const [asking, setAsking] = useState(false);
  const unused = readyWorkers(me);
  const target = room.season === "summer" ? "winter" : "year end";
  function press() {
    if (unused > 0 && !asking) { setAsking(true); return; }
    setAsking(false);
    onPass();
  }
  return <span className="viti-pass">
    {asking && <small role="status">{unused} worker{unused === 1 ? "" : "s"} unused</small>}
    <button type="button" disabled={!myTurn || busy} onClick={press} onBlur={() => setAsking(false)}>
      {asking ? "Pass anyway" : `Pass to ${target}`}<ChevronRight aria-hidden="true" />
    </button>
  </span>;
}

export function DeckRow({ room }) {
  const decks = [["vines", "Vines", "vine"], ["summer", "Summer", "summer"], ["orders", "Orders", "order"], ["winter", "Winter", "winter"]];
  return <ul className="viti-decks" aria-label="Card decks">
    {decks.map(([id, label, art]) => <li key={id}><i style={{ backgroundImage: `url(${CARD_ART[art]})` }} /><span>{label}</span><b>{room.deckCounts?.[id] ?? 0}</b></li>)}
  </ul>;
}
