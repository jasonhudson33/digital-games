"use client";

import { useState } from "react";
import { Droplets, Grape, House, Leaf, ScrollText, Warehouse, X } from "lucide-react";

import { BUILDINGS, canPlant } from "../../lib/viticulture.js";
import CardFan from "../card-fan";
import { CARD_ART, GamePiece, StructurePiece, cardSummary, fieldTotal, handCards, totalWorkers } from "./pieces.js";

const TABS = [
  { id: "hand", label: "Hand", icon: ScrollText },
  { id: "fields", label: "Fields", icon: Leaf },
  { id: "cellar", label: "Cellar", icon: Warehouse },
  { id: "buildings", label: "Buildings", icon: House },
];

/**
 * Your side of the table, docked under the board so choosing an action never
 * means scrolling away from it. The hand is always showing; fields, cellar and
 * buildings open above it (a sheet on a phone).
 */
export default function Dock({ room, player, selected, onSelect, freshUids }) {
  const [tab, setTab] = useState("hand");
  const [open, setOpen] = useState(false);
  const cards = handCards(player);
  const vine = selected?.kind.id === "vines" ? selected.card : null;

  function pick(id) {
    if (id === "hand") { setOpen(false); setTab("hand"); return; }
    setTab(id);
    setOpen((current) => (tab === id ? !current : true));
  }

  return <section className={`viti-dock ${open ? "is-open" : ""}`} aria-label="Your estate">
    <div className="viti-dock-bar">
      <span className="viti-dock-stats" data-player-stats={player.id}>
        <span title="Coins"><GamePiece type="coin" /><b>{player.coins}</b></span>
        <span title="Income paid each year end"><GamePiece type="bottle" color={player.color} /><b>+{player.residualIncome}</b></span>
        <span title="Workers"><GamePiece type="worker" color={player.color} /><b>{totalWorkers(player)}</b></span>
      </span>
      <nav className="viti-dock-tabs" aria-label="Estate sections">
        {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-label={label} aria-pressed={id === "hand" ? !open : open && tab === id} onClick={() => pick(id)}><Icon aria-hidden="true" /><span>{label}</span>{id === "hand" && <b>{cards.length}</b>}</button>)}
      </nav>
    </div>

    {open && <div className="viti-dock-sheet" role="region" aria-label={TABS.find((item) => item.id === tab).label}>
      <button type="button" className="viti-icon-button viti-dock-close" aria-label="Close" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
      {tab === "fields" && <Fields player={player} vine={vine} />}
      {tab === "cellar" && <Cellar player={player} />}
      {tab === "buildings" && <Buildings player={player} />}
    </div>}

    <div className="viti-hand">
      {cards.length ? <CardFan className="viti-hand-fan" count={cards.length} aria-label="Your cards">
        {cards.map(({ kind, card }) => {
          const isSelected = selected?.card.uid === card.uid;
          return <button
            key={card.uid}
            type="button"
            className={`viti-card kind-${kind.art} ${isSelected ? "selected" : ""} ${freshUids?.has(card.uid) ? "is-new" : ""}`}
            aria-pressed={isSelected}
            aria-label={`${kind.label}: ${card.name}. ${cardSummary(card, kind.id)}`}
            onClick={() => onSelect(isSelected ? null : { kind, card })}
          >
            <i style={{ backgroundImage: `url(${CARD_ART[kind.art]})` }} />
            <strong>{card.name}</strong>
            <small>{kind.id === "vines" ? `${card.red}R ${card.white}W` : kind.id === "orders" ? `${card.vp} VP` : kind.label.split(" ")[0]}</small>
          </button>;
        })}
      </CardFan> : <p className="viti-none">No cards in hand.</p>}
      {selected && <p className="viti-hand-detail" role="status"><strong>{selected.card.name}</strong> {cardSummary(selected.card, selected.kind.id)}</p>}
    </div>
  </section>;
}

function Fields({ player, vine }) {
  return <div className="viti-fields">{player.fields.map((field) => {
    const fits = vine && canPlant(player, vine, field);
    return <article key={field.id} className={fits ? "is-fit" : ""}>
      <header><span>Field {field.capacity}</span><b>{fieldTotal(field)} / {field.capacity}</b></header>
      {field.vines.length ? field.vines.map((planted) => <div className="viti-planted" key={planted.uid}><Grape aria-hidden="true" /><span><strong>{planted.name}</strong><small>{[planted.red && `${planted.red} red`, planted.white && `${planted.white} white`].filter(Boolean).join(" · ")}</small></span></div>) : <p>Unplanted soil{fits ? " · the vine fits here" : ""}</p>}
    </article>;
  })}</div>;
}

function Track({ label, type, values }) {
  return <div className={`viti-track track-${type}`}><span>{label}</span><div>{Array.from({ length: 9 }, (_, index) => <i className={values.includes(index + 1) ? "filled" : ""} key={index}><span>{index + 1}</span></i>)}</div></div>;
}

function Cellar({ player }) {
  return <div className="viti-cellar">
    <Track label="Red grapes" type="red" values={player.grapes.red} />
    <Track label="White grapes" type="white" values={player.grapes.white} />
    <Track label="Red wine" type="red-wine" values={player.wines.red} />
    <Track label="White wine" type="white-wine" values={player.wines.white} />
    <Track label="Rosé" type="rose" values={player.wines.rose} />
    <Track label="Sparkling" type="sparkling" values={player.wines.sparkling} />
    <p className="viti-none"><Droplets aria-hidden="true" /> Everything ages one step at year end.</p>
  </div>;
}

function Buildings({ player }) {
  return <div className="viti-buildings">{Object.values(BUILDINGS).map((building) => {
    const built = player.structures.includes(building.id);
    return <article key={building.id} className={built ? "built" : ""}><span>{built ? <StructurePiece buildingId={building.id} /> : building.cost}</span><p><strong>{building.name}</strong><small>{building.note}</small></p></article>;
  })}</div>;
}
