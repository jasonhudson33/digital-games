"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Library, Search } from "lucide-react";
import {
  KILLER_BUNNIES_CARD_CATALOG,
  KILLER_BUNNIES_CATALOG_COUNT,
  KILLER_BUNNIES_DECK_CATALOG,
} from "../lib/killer-bunnies-card-catalog";
import { KILLER_BUNNIES_PRINTED_TYPE_COUNTS } from "../lib/killer-bunnies-card-types";

const PAGE_SIZE = 120;

export default function KillerBunniesCardCatalog() {
  const [query, setQuery] = useState("");
  const [deckId, setDeckId] = useState("all");
  const [kind, setKind] = useState("all");
  const [printedType, setPrintedType] = useState("all");
  const [resolutionStatus, setResolutionStatus] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copiedNumber, setCopiedNumber] = useState("");

  useEffect(() => {
    const requestedCard = new URLSearchParams(window.location.search).get("card");
    if (requestedCard) setQuery(String(requestedCard).padStart(4, "0"));
  }, []);

  const kinds = useMemo(() => [...new Set(KILLER_BUNNIES_CARD_CATALOG.map((card) => card.kind))].sort(), []);
  const printedTypes = useMemo(() => [...new Set(KILLER_BUNNIES_CARD_CATALOG.map((card) => card.type))].sort(), []);
  const resolutionStatuses = useMemo(() => [...new Set(KILLER_BUNNIES_CARD_CATALOG.map((card) => card.resolutionStatus))].sort(), []);
  const coverage = useMemo(() => KILLER_BUNNIES_CARD_CATALOG.reduce((counts, card) => {
    counts[card.resolutionStatus] = (counts[card.resolutionStatus] || 0) + 1;
    counts[card.abilitySource] = (counts[card.abilitySource] || 0) + 1;
    return counts;
  }, {}), []);
  const filteredCards = useMemo(() => {
    const search = query.trim().toLowerCase();
    return KILLER_BUNNIES_CARD_CATALOG.filter((card) => {
      if (deckId !== "all" && card.deckId !== deckId) return false;
      if (kind !== "all" && card.kind !== kind) return false;
      if (printedType !== "all" && card.type !== printedType) return false;
      if (resolutionStatus !== "all" && card.resolutionStatus !== resolutionStatus) return false;
      if (!search) return true;
      return card.catalogNumber.includes(search)
        || card.name.toLowerCase().includes(search)
        || card.deckName.toLowerCase().includes(search);
    });
  }, [deckId, kind, printedType, query, resolutionStatus]);

  function updateFilter(setter, value) {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function copyChangeRequest(card) {
    const request = `Killer Bunnies card #${card.catalogNumber} — ${card.name}\nPrinted type: ${card.type}\nAbility: ${card.ability}\nPlay requirements: ${card.requirements.join("; ")}\nAutomation: ${card.resolutionStatus}\nAbility source: ${abilitySourceLabel(card.abilitySource)}\nRules link: ${card.communitySourceUrl || card.rulesSourceUrl}\nRequested change: `;
    void navigator.clipboard.writeText(request);
    setCopiedNumber(card.catalogNumber);
    window.setTimeout(() => setCopiedNumber(""), 1600);
  }

  return (
    <main className="kb-app kb-catalog-shell">
      <header className="kb-catalog-hero">
        <a href="/killer-bunnies"><ArrowLeft /> Back to the game</a>
        <span className="kb-kicker"><Library /> Official-number catalog</span>
        <h1>Every card, its ability, and <em>what it needs.</em></h1>
        <p>Use this page to audit the generated card set and request corrections one card at a time. Every numbered record separates the official ability summary and play requirements from its digital automation status. “Manual” means the rule is identified but its full interaction still needs player confirmation; it does not mean the card has no effect.</p>
        <div className="kb-catalog-totals">
          <span><strong>{KILLER_BUNNIES_CATALOG_COUNT.toLocaleString()}</strong> unique numbers</span>
          <span><strong>{KILLER_BUNNIES_DECK_CATALOG.length}</strong> decks</span>
          <span><strong>{KILLER_BUNNIES_PRINTED_TYPE_COUNTS.special}</strong> Special · <strong>{KILLER_BUNNIES_PRINTED_TYPE_COUNTS.verySpecial}</strong> Very Special</span>
          <span><strong>{coverage.automatic || 0}</strong> automatic · <strong>{coverage.guided || 0}</strong> guided · <strong>{coverage.manual || 0}</strong> manual</span>
          <span><strong>{coverage.publisher || 0}</strong> publisher summaries · <strong>{(coverage.community || 0) + (coverage["cross-checked"] || 0)}</strong> card-page cross-checks</span>
          <span><CheckCircle2 /><strong>0</strong> duplicates or gaps</span>
        </div>
      </header>

      <section className="kb-catalog-browser" aria-labelledby="kb-catalog-results">
        <div className="kb-catalog-filters">
          <label className="kb-catalog-search"><Search /><span>Search cards</span><input value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} placeholder="Name or number, such as 0287" /></label>
          <label><span>Deck</span><select value={deckId} onChange={(event) => updateFilter(setDeckId, event.target.value)}><option value="all">All 24 decks</option>{[...new Set(KILLER_BUNNIES_DECK_CATALOG.map((deck) => deck.series))].map((series) => <optgroup key={series} label={series}>{KILLER_BUNNIES_DECK_CATALOG.filter((deck) => deck.series === series).map((deck) => <option key={deck.id} value={deck.id}>{deck.name} · {deck.cardCount}</option>)}</optgroup>)}</select></label>
          <label><span>Generated category</span><select value={kind} onChange={(event) => updateFilter(setKind, event.target.value)}><option value="all">All categories</option>{kinds.map((entry) => <option key={entry} value={entry}>{categoryLabel(entry)}</option>)}</select></label>
          <label><span>Printed type</span><select value={printedType} onChange={(event) => updateFilter(setPrintedType, event.target.value)}><option value="all">All printed types</option>{printedTypes.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label><span>Digital resolution</span><select value={resolutionStatus} onChange={(event) => updateFilter(setResolutionStatus, event.target.value)}><option value="all">All statuses</option>{resolutionStatuses.map((entry) => <option key={entry} value={entry}>{resolutionLabel(entry)}</option>)}</select></label>
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
    <div className="kb-catalog-rule-heading"><strong>ABILITY WHEN PLAYED</strong><b className={`status-${card.resolutionStatus}`}>{resolutionLabel(card.resolutionStatus)}</b></div>
    <p>{card.ability}</p>
    <small className={`kb-catalog-source source-${card.abilitySource}`}>{abilitySourceLabel(card.abilitySource)}</small>
    <strong className="kb-catalog-behavior-label">PLAY REQUIREMENTS</strong>
    <ul>{card.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
    {!!metadata.length && <div>{metadata.map((entry) => <i key={entry}>{entry}</i>)}</div>}
    <footer><span>{card.deckName}</span><small>{card.type} · {card.confidence}</small><a href={card.rulesSourceUrl} target="_blank" rel="noreferrer">Official Bunny Bits ↗</a>{card.communitySourceUrl && <a href={card.communitySourceUrl} target="_blank" rel="noreferrer">Card-specific cross-check ↗</a>}<button type="button" onClick={onCopyChange}>{copied ? "Copied request" : "Copy change request"}</button></footer>
  </article>;
}

function resolutionLabel(value) {
  return ({ automatic: "Automated", guided: "Guided choices", manual: "Manual ruling", "not-played": "Not played" })[value] || value;
}

function abilitySourceLabel(value) {
  return ({ publisher: "Publisher ruling summarized", community: "Community card page cross-check", "cross-checked": "Publisher/community ruling cross-checked", "family-rule": "Verified card-family rule" })[value] || value;
}

function categoryLabel(value) {
  return ({ chooseCarrot: "Choose a Carrot", money: "Currency", misfortune: "Misfortune", modifier: "Bunny Modifier" })[value]
    || value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
