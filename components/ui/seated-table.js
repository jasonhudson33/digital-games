"use client";

import { backFan, seatLayout, tableShapes } from "../../lib/table-seats";

/*
 * A card table with people sitting at it.
 *
 * Every card game here answered "who played that card?" differently and none of
 * them answered it well: a list of players down one side, a rail of opponents
 * across the top, and the cards on the table captioned with names in 12px type.
 * Position answers it better than a caption can, and it is the question these
 * games ask most often.
 *
 * lib/table-seats.js decides where everything goes; this puts it on screen. A
 * game supplies the content of a seat and what sits in the middle of the felt —
 * it never does arithmetic.
 *
 * Positions are emitted twice, as percentages of two design boxes, and the
 * stylesheet picks the pair matching the furniture it is drawing. A phone
 * renders a smaller plate on a portrait felt, so it needs its own solution
 * rather than a scaled copy of the desktop one; solving both here rather than
 * from a measured viewport keeps the server and client markup identical, which
 * a resize listener would not.
 */

const percent = (key, prefix, spot, shape) => ({
  [`--${prefix}-x${key}`]: `${((spot.x / shape.box.width) * 100).toFixed(2)}%`,
  [`--${prefix}-y${key}`]: `${((spot.y / shape.box.height) * 100).toFixed(2)}%`,
});

const join = (...names) => names.filter(Boolean).join(" ");

/**
 * @param {number}  count        how many are at the table
 * @param {number}  viewerIndex  which of them is looking at it
 * @param {object}  table        { wide, phone } size overrides for a game whose
 *                               cards are not the usual size
 * @param {node}    middle       what sits in the middle of the felt — one small
 *                               mark, because the ring of cards closes in on it
 * @param {node}    foot         a line along the bottom of the felt, which is
 *                               the one patch of cloth nothing else wants
 * @param {function} children    called with { layout, crowded, seatStyle,
 *                               cardStyle } to render the seats and the cards
 */
export function SeatedTable({ count, viewerIndex, table, middle, foot, className, children }) {
  const solved = tableShapes(count, table)
    .map((entry) => ({ ...entry, layout: seatLayout(count, viewerIndex, entry.shape) }));
  const { tier } = solved[0];

  /* Both shapes' positions for one seat, as one style object. */
  const styles = (prefix, pick) => Object.assign(
    {},
    ...solved.map(({ key, shape, layout }) => percent(key, prefix, pick(layout, shape), shape)),
  );

  return (
    <div className={join("tbl-felt-table", tier, className)}>
      <div className="tbl-felt" aria-hidden="true" />
      {middle}
      {children({
        layout: solved[0].layout,
        tier,
        seatStyle: (index) => styles("seat", (layout) => layout[index].seat),
        /* `restingOn` gathers a whole trick onto whoever took it, which says
           where it went better than a line of text that only lasts one phase. */
        cardStyle: (index, restingOn = null) => ({
          ...styles("card", (layout) => layout[restingOn ?? index].played),
          /* A small lean per seat, so a trick looks laid down rather than
             pasted on. Derived from the seat so it never re-rolls on a render. */
          "--tilt": `${(((index * 7) % 9) - 4)}deg`,
        }),
      })}
      {foot}
    </div>
  );
}

/**
 * One seat: a name plate, the hand they are holding, and room for whatever the
 * game wants to hang off it.
 *
 * @param {object} spot     one entry from the layout
 * @param {string} name     shown on the plate; long ones ellipsis rather than
 *                          disappearing under a mark
 * @param {node}   avatar   what goes in the disc — usually an initial or a bot
 * @param {string} note     the second line, dropped when the table is crowded
 * @param {array}  marks    [{ key, label, title, tone }] — badges on the plate's
 *                          corner. Two is the most that fits; a third covered
 *                          the name.
 * @param {number} hand     how many cards they are holding, drawn as a fan of
 *                          backs so a seat reads as a person rather than a row
 * @param {string} tone     extra classes: "turn", "self", "mate"
 * @param {node}   children pills — a bid, a score, a total — placed by the
 *                          stylesheet on the side of the plate away from the
 *                          middle, because the middle is where the cards are
 */
export function Seat({ spot, name, avatar, note, marks = [], hand = 0, tone, style, children }) {
  return (
    <div
      className={join("tbl-chair", spot.side, spot.half, spot.isViewer && "self", tone)}
      style={style}
    >
      {!spot.isViewer && hand > 0 && (
        <span className="tbl-chair-fan" aria-hidden="true">
          {backFan(hand).map((back, index) => (
            <i key={index} style={{ "--a": `${back.angle}deg`, "--o": `${back.offset}px` }} />
          ))}
        </span>
      )}

      <div className="tbl-chair-plate">
        <span className="tbl-chair-avatar">{avatar}</span>
        <div className="tbl-chair-who">
          <strong title={name}>{name}{spot.isViewer ? <span> (you)</span> : null}</strong>
          {note ? <small>{note}</small> : null}
        </div>
        {marks.length > 0 && (
          <span className="tbl-chair-marks">
            {marks.slice(0, 2).map((mark) => (
              <em className={join("tbl-mark", mark.tone)} key={mark.key} title={mark.title}>{mark.label}</em>
            ))}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

/** A card lying on the felt in front of the seat that played it. */
export function PlayedCard({ style, gathered, won, children }) {
  return (
    <div
      className={join("tbl-played", won && "won", gathered && "gathered")}
      style={{ ...style, zIndex: won ? 3 : 2 }}
    >
      {children}
    </div>
  );
}
