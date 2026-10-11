/*
 * A player's hand of cards (platform/card-hands). The layout lives in
 * app/table.css (.tbl-fan); this only supplies the two elements it needs:
 * an outer box that is the width reference, and the fan inside it.
 *
 *   count      number of cards, so the CSS can work out the overlap
 *   className  the game's own hand class (padding, min-height, --card-w)
 *   ...rest    anything else for the fan, e.g. aria-label
 *
 * The game's card element goes in as the child and fills one slot.
 */
export default function CardFan({ count, className = "", style, children, ...rest }) {
  return (
    <div className="tbl-fan-box">
      <div className={`tbl-fan ${className}`.trim()} style={{ "--n": count, ...style }} {...rest}>
        {children}
      </div>
    </div>
  );
}
