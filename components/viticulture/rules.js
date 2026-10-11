import { ChevronRight, Leaf, ScrollText } from "lucide-react";

import { ChoiceModal } from "../ui/table-shell";
import { CARD_ART, GamePiece } from "./pieces.js";

function ProductionFlow() {
  return <div className="viti-production-flow" aria-label="How wine becomes victory points">
    <div><span className="viti-flow-card" style={{ backgroundImage: `url(${CARD_ART.vine})` }} /><p><strong>1. Plant</strong><small>Green vine card</small></p></div><ChevronRight aria-hidden="true" />
    <div><span className="viti-flow-field"><Leaf aria-hidden="true" /></span><p><strong>2. Harvest</strong><small>Field makes grapes</small></p></div><ChevronRight aria-hidden="true" />
    <div><GamePiece type="grape-token" /><p><strong>3. Make wine</strong><small>Glass grape token</small></p></div><ChevronRight aria-hidden="true" />
    <div><GamePiece type="wine-token" /><p><strong>4. Fill order</strong><small>Wine meets purple card</small></p></div><ChevronRight aria-hidden="true" />
    <div><GamePiece type="cork" color="#733a36" /><p><strong>Score VP</strong><small>Race to 20</small></p></div>
  </div>;
}

function ComponentLegend() {
  return <section className="viti-component-legend"><h3>What the pieces mean</h3><div>
    <article><GamePiece type="regular" color="#2f6f70" /><p><strong>Worker meeple</strong><small>Place one to take an action once this year.</small></p></article>
    <article><GamePiece type="grande" color="#2f6f70" /><p><strong>Grande meeple</strong><small>Larger worker that can use a full action.</small></p></article>
    <article><GamePiece type="rooster" color="#a84d3f" /><p><strong>Rooster</strong><small>Marks wake-up order and your spring bonus.</small></p></article>
    <article><GamePiece type="cork" color="#a84d3f" /><p><strong>Cork</strong><small>Your victory-point marker. Reach 20 VP.</small></p></article>
    <article><GamePiece type="bottle" color="#a84d3f" /><p><strong>Wine bottle</strong><small>Tracks income paid at every year end.</small></p></article>
    <article><GamePiece type="grape-token" /><p><strong>Glass token</strong><small>Grape on the crush pad or wine in the cellar.</small></p></article>
  </div><div className="viti-deck-legend">
    {[["vine", "Green", "Vine"], ["order", "Purple", "Order"], ["summer", "Yellow", "Summer visitor"], ["winter", "Blue", "Winter visitor"]].map(([art, colour, name]) => <span key={art} className={`legend-${art}`}><i style={{ backgroundImage: `url(${CARD_ART[art]})` }} /><b>{colour}</b><small>{name}</small></span>)}
  </div></section>;
}

export default function RulesDrawer({ onClose }) {
  return <ChoiceModal wide title="From vine to vintage" text="Pieces & game guide. Build the first estate to reach 20 victory points. Each year flows through four seasons." onClose={onClose}>
    <ComponentLegend />
    <p className="tbl-rule-heading">The production loop</p>
    <ProductionFlow />
    <p className="tbl-rule-heading">One year at a glance</p>
    <div className="tbl-rule-grid">
      <article><b>Spring</b><p>Place your rooster on an unoccupied wake-up row. Early rows act sooner; later rows grant better rewards.</p></article>
      <article><b>Summer</b><p>Place meeples to draw or plant green vines, give tours, build structures, sell grapes, or play yellow visitors. Pass when you want to save workers for winter.</p></article>
      <article><b>Autumn</b><p>Everyone chooses summer or winter and draws a visitor of that colour. With a Cottage you draw one of each and keep one.</p></article>
      <article><b>Winter</b><p>Harvest fields, make wine, fill purple orders, train workers, draw orders, or play blue visitors.</p></article>
    </div>
    <p className="tbl-rule-heading">Workers and spaces</p>
    <p className="tbl-modal-copy">Regular meeples need an open oval. Your larger grande meeple can always use a full action. The first worker on an action receives its printed bonus, shown as a sparkle on the space. Workers used in summer stay there, so keep some for winter.</p>
    <p className="tbl-rule-heading">Wine and victory</p>
    <p className="tbl-modal-copy">Harvesting creates glass grape tokens equal to each field&apos;s red and white vine totals. Make wine from those grapes; rosé needs a medium cellar and sparkling needs a large cellar. Fill orders with wine at or above each required value to move your cork toward 20 VP and move your bottle up the income track.</p>
    <p className="tbl-modal-copy">At year end, grapes and wine age, workers return, and residual income is paid. If anyone has at least 20 VP, the highest score wins; coins and total wine value break ties.</p>
    <a className="tbl-link" href="https://store.stonemaiergames.com/products/viticulture-essential-edition" target="_blank" rel="noreferrer"><ScrollText aria-hidden="true" /> Visit the official game page</a>
  </ChoiceModal>;
}
