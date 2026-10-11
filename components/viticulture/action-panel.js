"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

import { BUILDINGS, canFillOrder, canPlant, wineOptions } from "../../lib/viticulture.js";
import { GamePiece, SEASONS, fieldTotal, orderNeeds, typeLabel } from "./pieces.js";

export function payloadValid(actionId, payload) {
  if (actionId === "build") return Boolean(payload.buildingId);
  if (actionId === "plant") return Boolean(payload.cardId && payload.fieldId);
  if (actionId === "sell-grape") return Boolean(payload.grapeType);
  if (actionId === "play-summer" || actionId === "play-winter") return Boolean(payload.cardId);
  if (actionId === "harvest") return Boolean(payload.fieldId);
  if (actionId === "make-wine") return Boolean(payload.optionId);
  if (actionId === "fill-order") return Boolean(payload.orderId);
  return true;
}

/**
 * The choices an action needs, and nothing else, directly under the board.
 * (A one-tap action never gets here.) The worker is already decided by how the
 * space was tapped, so there is no worker picker.
 */
export default function ActionPanel({ room, player, pick, busy, onChange, onSubmit, onCancel }) {
  const { action, workerType, payload } = pick;
  const bonus = Boolean(room.bonusOpen?.[action.id]);
  const set = (next) => onChange({ ...pick, payload: next });
  const merge = (next) => onChange({ ...pick, payload: { ...payload, ...next } });
  const valid = payloadValid(action.id, payload);
  const ref = useRef(null);
  // Opened under the board, which can be below the fold on a phone.
  useEffect(() => { ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [action.id]);

  return <section className="viti-pick" ref={ref} aria-labelledby="viti-pick-title">
    <header>
      <GamePiece type={workerType} color={player.color} />
      <span><small>{SEASONS[room.season].label} · {workerType === "grande" ? "grande worker" : "worker"}{bonus ? ` · bonus: ${action.bonus}` : ""}</small><strong id="viti-pick-title">{action.name}</strong></span>
      <button type="button" className="viti-icon-button" aria-label="Cancel" onClick={onCancel}><X aria-hidden="true" /></button>
    </header>
    <Choices action={action} player={player} payload={payload} bonus={bonus} set={set} merge={merge} />
    <footer>
      <button type="button" className="viti-primary" disabled={busy || !valid} onClick={onSubmit}><Check aria-hidden="true" /> Place worker</button>
    </footer>
  </section>;
}

function Choices({ action, player, payload, bonus, set, merge }) {
  if (action.id === "build") {
    return <ChipRow label="Structure">{Object.values(BUILDINGS).map((building) => {
      const cost = Math.max(0, building.cost - (bonus ? 1 : 0));
      const blocked = player.structures.includes(building.id) || player.coins < cost || (building.id === "largeCellar" && !player.structures.includes("cellar"));
      return <Chip key={building.id} selected={payload.buildingId === building.id} disabled={blocked} title={building.name} meta={player.structures.includes(building.id) ? "Built" : `${cost} coins`} note={building.note} onClick={() => set({ buildingId: building.id })} />;
    })}</ChipRow>;
  }
  if (action.id === "plant") {
    const card = player.cards.vines.find((item) => item.uid === payload.cardId);
    return <>
      <ChipRow label="Vine">{player.cards.vines.map((vine) => <Chip key={vine.uid} selected={payload.cardId === vine.uid} disabled={!player.fields.some((field) => canPlant(player, vine, field))} title={vine.name} meta={`${vine.red} red · ${vine.white} white`} note={vine.requirement ? `Needs ${BUILDINGS[vine.requirement].name}` : "No structure needed"} onClick={() => merge({ cardId: vine.uid, fieldId: payload.fieldId && canPlant(player, vine, player.fields.find((field) => field.id === payload.fieldId)) ? payload.fieldId : undefined })} />)}</ChipRow>
      <ChipRow label="Field">{player.fields.map((field) => <Chip key={field.id} selected={payload.fieldId === field.id} disabled={!card || !canPlant(player, card, field)} highlight={Boolean(card) && canPlant(player, card, field)} title={`Field ${field.capacity}`} meta={`${fieldTotal(field)} / ${field.capacity}`} note="Vines stay planted" onClick={() => merge({ fieldId: field.id })} />)}</ChipRow>
    </>;
  }
  if (action.id === "sell-grape") {
    return <ChipRow label="Grape">{["red", "white"].map((type) => <Chip key={type} selected={payload.grapeType === type} disabled={!player.grapes[type].length} title={`${typeLabel(type)} grape`} meta={player.grapes[type].length ? `Sell value ${Math.min(...player.grapes[type])}` : "None"} note="Up to 4 coins" onClick={() => set({ grapeType: type })} />)}</ChipRow>;
  }
  if (action.id === "harvest") {
    return <ChipRow label="Field">{player.fields.map((field) => <Chip key={field.id} selected={payload.fieldId === field.id} disabled={!field.vines.length} title={`Field ${field.capacity}`} meta={`${field.vines.length} vine${field.vines.length === 1 ? "" : "s"}`} note="Makes red and white grapes" onClick={() => set({ fieldId: field.id })} />)}</ChipRow>;
  }
  if (action.id === "make-wine") {
    const options = wineOptions(player);
    return <ChipRow label="Wine">{options.length ? options.map((option) => <Chip key={option.id} selected={payload.optionId === option.id} title={option.label} meta={option.grapes.map((grape) => `${grape.type} ${grape.value}`).join(" + ")} note="Uses these grapes" onClick={() => set({ optionId: option.id })} />) : <p className="viti-none">No grapes to crush. Harvest a field first.</p>}</ChipRow>;
  }
  if (action.id === "fill-order") {
    return <ChipRow label="Order">{player.cards.orders.map((card) => <Chip key={card.uid} selected={payload.orderId === card.uid} disabled={!canFillOrder(player, card)} title={card.name} meta={`${card.vp} VP · +${card.income}`} note={orderNeeds(card)} onClick={() => set({ orderId: card.uid })} />)}</ChipRow>;
  }
  if (action.id === "play-summer" || action.id === "play-winter") {
    const season = action.id === "play-summer" ? "summer" : "winter";
    return <ChipRow label="Visitor">{player.cards[season].length ? player.cards[season].map((card) => <Chip key={card.uid} selected={payload.cardId === card.uid} title={card.name} meta={`${season} visitor`} note={card.text} onClick={() => set({ cardId: card.uid })} />) : <p className="viti-none">No {season} visitors in your hand.</p>}</ChipRow>;
  }
  return null;
}

function ChipRow({ label, children }) {
  return <div className="viti-choice-row"><h3>{label}</h3><div>{children}</div></div>;
}

function Chip({ selected, disabled, highlight, title, meta, note, onClick }) {
  return <button type="button" className={`viti-chip-choice ${selected ? "is-selected" : ""} ${highlight ? "is-fit" : ""}`} disabled={disabled} aria-pressed={selected} onClick={onClick}>
    <span><strong>{title}</strong><b>{meta}</b></span>
    <small>{note}</small>
    {selected && <Check aria-hidden="true" />}
  </button>;
}
