"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Library, Search } from "lucide-react";
import {
  KILLER_BUNNIES_CARD_CATALOG,
  KILLER_BUNNIES_CATALOG_COUNT,
  KILLER_BUNNIES_DECK_CATALOG,
} from "../lib/killer-bunnies-card-catalog";

const PAGE_SIZE = 120;

export default function KillerBunniesCardCatalog() {
  const [query, setQuery] = useState("");
  const [deckId, setDeckId] = useState("all");
  const [kind, setKind] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copiedNumber, setCopiedNumber] = useState("");

  const kinds = useMemo(() => [...new Set(KILLER_BUNNIES_CARD_CATALOG.map((card) => card.kind))].sort(), []);
  const filteredCards = useMemo(() => {
    const search = query.trim().toLowerCase();
    return KILLER_BUNNIES_CARD_CATALOG.filter((card) => {
      if (deckId !== "all" && card.deckId !== deckId) return false;
      if (kind !== "all" && card.kind !== kind) return false;
      if (!search) return true;
      return card.catalogNumber.includes(search)
        || card.name.toLowerCase().includes(search)
        || card.deckName.toLowerCase().includes(search);
    });
  }, [deckId, kind, query]);

  function updateFilter(setter, value) {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function copyChangeRequest(card) {
    const request = `Killer Bunnies card #${card.catalogNumber} — ${card.name}\nCurrent digital behavior: ${card.detail}\nRequested change: `;
    void navigator.clipboard.writeText(request);
    setCopiedNumber(card.catalogNumber);
    window.setTimeout(() => setCopiedNumber(""), 1600);
  }

  return (
    <main className="kb-app kb-catalog-shell">
      <header className="kb-catalog-hero">
        <a href="/killer-bunnies"><ArrowLeft /> Back to the game</a>
        <span className="kb-kicker"><Library /> Official-number catalog</span>
        <h1>Every card and its <em>current digital behavior.</em></h1>
        <p>Use this page to audit the generated card set and request corrections one card at a time. Names and Card Identification Numbers come from the publisher’s large-card deck checklists; the behavior shown is what the current prototype understands from each name. Unnumbered Cabbage, Water, Defense, pawn, chip, and other component cards are intentionally outside this sequence.</p>
        <div className="kb-catalog-totals">
          <span><strong>{KILLER_BUNNIES_CATALOG_COUNT.toLocaleString()}</strong> unique numbers</span>
          <span><strong>{KILLER_BUNNIES_DECK_CATALOG.length}</strong> decks</span>
          <span><CheckCircle2 /><strong>0</strong> duplicates or gaps</span>
        </div>
      </header>

      <section className="kb-catalog-browser" aria-labelledby="kb-catalog-results">
        <div className="kb-catalog-filters">
          <label className="kb-catalog-search"><Search /><span>Search cards</span><input value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} placeholder="Name or number, such as 0287" /></label>
          <label><span>Deck</span><select value={deckId} onChange={(event) => updateFilter(setDeckId, event.target.value)}><option value="all">All 24 decks</option>{[...new Set(KILLER_BUNNIES_DECK_CATALOG.map((deck) => deck.series))].map((series) => <optgroup key={series} label={series}>{KILLER_BUNNIES_DECK_CATALOG.filter((deck) => deck.series === series).map((deck) => <option key={deck.id} value={deck.id}>{deck.name} · {deck.cardCount}</option>)}</optgroup>)}</select></label>
          <label><span>Generated category</span><select value={kind} onChange={(event) => updateFilter(setKind, event.target.value)}><option value="all">All categories</option>{kinds.map((entry) => <option key={entry} value={entry}>{categoryLabel(entry)}</option>)}</select></label>
        </div>

        <div className="kb-catalog-heading"><div><span>NUMBERED CARD RECORDS</span><h2 id="kb-catalog-results">{filteredCards.length.toLocaleString()} cards found</h2></div><p>The publisher’s Caramel Swirl page prints 1120 twice. The second occurrence is normalized to 1122 to preserve the official continuous sequence.</p></div>

        <div className="kb-catalog-grid">
          {filteredCards.slice(0, visibleCount).map((card) => <CatalogCard key={card.id} card={card} copied={copiedNumber === card.catalogNumber} onCopyChange={() => copyChangeRequest(card)} />)}
        </div>
        {!filteredCards.length && <p className="kb-catalog-empty">No cards match those filters.</p>}
        {visibleCount < filteredCards.length && <button className="kb-catalog-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, filteredCards.length - visibleCount)} more cards</button>}
      </section>
    </main>
  );
}

function CatalogCard({ card, copied, onCopyChange }) {
  const metadata = [];
  if (card.power) metadata.push(`Weapon ${card.power}`);
  if (card.weaponLevel && !card.power) metadata.push(`Weapon ${card.weaponLevel}`);
  if (card.carrotCount) metadata.push(`${card.carrotCount} carrot${card.carrotCount === 1 ? "" : "s"}`);
  if (card.value) metadata.push(`${card.value} Dolla`);
  for (const [resource, amount] of Object.entries(card.costs || {})) metadata.push(`${amount} ${resource}`);
  if (card.color) metadata.push(card.color);

  return <article className={`kb-catalog-card confidence-${card.confidence}`} style={{ "--deck-color": card.deckColor }}>
    <header><b>#{card.catalogNumber}</b><span>{categoryLabel(card.kind)}</span></header>
    <h3>{card.name}</h3>
    <strong className="kb-catalog-behavior-label">CURRENT DIGITAL BEHAVIOR</strong>
    <p>{card.detail}</p>
    {!!metadata.length && <div>{metadata.map((entry) => <i key={entry}>{entry}</i>)}</div>}
    <footer><span>{card.deckName}</span><small>{card.confidence === "unverified" ? "Effect needs card-text verification" : `${card.type} · ${card.confidence}`}</small><button type="button" onClick={onCopyChange}>{copied ? "Copied request" : "Copy change request"}</button></footer>
  </article>;
}

function categoryLabel(value) {
  return ({ chooseCarrot: "Choose a Carrot", money: "Currency", misfortune: "Misfortune", modifier: "Bunny Modifier" })[value]
    || value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
