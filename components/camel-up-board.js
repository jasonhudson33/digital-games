"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { PYRAMID_DICE, RACING_CAMELS, TRACK_SPACES } from "../lib/camel-up.js";
import { diffCamelPositions } from "../lib/camel-up-motion.js";

export const CAMEL_LABELS = { blue: "Blue", green: "Green", purple: "Purple", red: "Red", yellow: "Yellow", black: "Black", white: "White" };
const CRAZY = ["black", "white"];
const MOVE_MS = 380;

/** Direction a camel leaves each space, used for the path arrows on the ring. */
const flowOf = (space) => (space <= 4 ? "right" : space <= 8 ? "down" : space <= 12 ? "left" : "up");

/**
 * A camel in side view. `size` is "sm" (inline), "md" (default), "fill" (fills its
 * track slot) or "hero". Crazy camels face the other way: they run backward.
 */
export function Camel({ camelId, size = "md" }) {
  const label = `${CAMEL_LABELS[camelId]} camel`;
  return <span className={`camel camel-${camelId} camel-${size} ${CRAZY.includes(camelId) ? "crazy" : ""}`} role="img" aria-label={label} title={label}>
    <svg className="camel-svg" viewBox="0 0 64 48" focusable="false" aria-hidden="true">
      <g className="camel-legs">
        <rect x="16" y="31" width="5" height="15" rx="2" />
        <rect x="25" y="32" width="5" height="14" rx="2" />
        <rect x="38" y="32" width="5" height="14" rx="2" />
        <rect x="47" y="31" width="5" height="15" rx="2" />
      </g>
      <path className="camel-tail" d="M11 24 C5 26 4 32 7 38" />
      <ellipse className="camel-body" cx="32" cy="27" rx="22" ry="11" />
      <ellipse className="camel-body" cx="31" cy="17" rx="9" ry="8" />
      <path className="camel-body" d="M45 25 C52 21 52 13 53 7 L60 9 C60 16 58 23 54 31 Z" />
      <ellipse className="camel-body" cx="58.5" cy="9" rx="5.5" ry="3.8" />
      <rect className="camel-saddle" x="24" y="19" width="13" height="9" rx="2.5" />
      <circle className="camel-eye" cx="60" cy="8" r="1.1" />
    </svg>
  </span>;
}

/**
 * Animate camels from their old spot to their new one (first-last-invert-play).
 * Purely cosmetic: it compares what this browser rendered before and after, so a
 * poll that skips several moves just slides camels from where they last were.
 * Returns the ref for the track element and the camels that moved last.
 */
export function useCamelMotion(stacks) {
  const rootRef = useRef(null);
  const previousStacks = useRef(null);
  const previousRects = useRef({ map: {}, width: 0 });
  const [movedIds, setMovedIds] = useState(() => new Set());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const diff = diffCamelPositions(previousStacks.current, stacks);
    previousStacks.current = stacks;
    const slots = [...root.querySelectorAll("[data-camel]")];
    for (const slot of slots) slot.getAnimations?.().forEach((animation) => animation.cancel());
    const base = root.getBoundingClientRect();
    const map = {};
    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      map[slot.dataset.camel] = { x: rect.left - base.left, y: rect.top - base.top };
    }
    const before = previousRects.current;
    previousRects.current = { map, width: base.width };
    if (!diff.moved.length) return;
    setMovedIds(new Set(diff.moved));
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || Math.abs(before.width - base.width) > 1) return;
    for (const slot of slots) {
      const from = before.map[slot.dataset.camel];
      const to = map[slot.dataset.camel];
      if (!from || !slot.animate) continue;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;
      slot.style.zIndex = "40";
      const animation = slot.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: MOVE_MS, easing: "cubic-bezier(.2,.8,.25,1)" },
      );
      animation.finished.then(() => { slot.style.zIndex = ""; }, () => { slot.style.zIndex = ""; });
    }
  }, [stacks]);

  return { rootRef, movedIds };
}

/** Camels in the unit a roll moved when no state change was seen (first render, refresh). */
function unitFromRoll(room) {
  const roll = room.legRolls?.at(-1) ?? room.legRecap?.rolls?.at(-1);
  if (!roll) return new Set();
  for (const stack of Object.values(room.stacks || {})) {
    const at = stack.indexOf(roll.camelId);
    if (at >= 0) return new Set(stack.slice(at));
  }
  return new Set();
}

export function Board({ room, ranking, placing, legalSet, onPickSpace }) {
  const { rootRef, movedIds } = useCamelMotion(room.stacks);
  const marked = movedIds.size ? movedIds : unitFromRoll(room);
  const owners = Object.fromEntries(room.players.filter((player) => player.spectator).map((player) => [player.spectator.space, player]));
  return <div className={`camel-track ${placing ? "is-placing" : ""}`} ref={rootRef} aria-label="Sixteen-space camel racetrack">
    {Array.from({ length: TRACK_SPACES }, (_, index) => index + 1).map((space) => <TrackSpace
      key={space}
      space={space}
      stack={room.stacks[String(space)] || []}
      owner={owners[space]}
      marked={marked}
      placing={placing}
      legal={Boolean(placing) && legalSet.has(space)}
      onPick={onPickSpace}
    />)}
    <div className="camel-center">
      <Pyramid remaining={room.remainingDice} ticketsTaken={room.pyramidTicketsTaken} />
      <OrderList ranking={ranking} />
    </div>
  </div>;
}

function TrackSpace({ space, stack, owner, marked, placing, legal, onPick }) {
  const selected = placing?.space === space;
  const lift = stack.length <= 3 ? 18 : stack.length <= 5 ? 14 : 11;
  const side = placing?.side === "boo" ? "booing" : "cheering";
  const named = stack.length ? stack.map((id) => CAMEL_LABELS[id]).join(", ") : "empty";
  return <div
    className={`camel-space space-${space} ${legal ? "is-legal" : ""} ${placing && !legal ? "is-dim" : ""} ${selected ? "is-selected" : ""}`}
    data-flow={flowOf(space)}
    role="group"
    aria-label={`Space ${space}: ${named}`}
  >
    <span className="camel-space-no">{space}</span>
    {space === 1 && <span className="camel-space-tag">Start</span>}
    {space === TRACK_SPACES && <span className="camel-space-tag finish">Finish</span>}
    <div className="camel-stack" style={{ "--lift-k": lift, "--n": stack.length }}>
      {stack.map((camelId, index) => <span className={`camel-slot ${marked.has(camelId) ? "moved" : ""}`} data-camel={camelId} key={camelId} style={{ "--i": index }}>
        <Camel camelId={camelId} size="fill" />
      </span>)}
    </div>
    {owner && <span className={`camel-tile ${owner.spectator.side}`} title={`${owner.name}'s ${owner.spectator.side === "cheer" ? "cheering" : "booing"} tile`}>
      <b>{owner.spectator.side === "cheer" ? "+1" : "−1"}</b><small>{owner.name.slice(0, 1).toUpperCase()}</small>
    </span>}
    {selected && !owner && <span className={`camel-tile ghost ${placing.side}`}><b>{placing.side === "cheer" ? "+1" : "−1"}</b></span>}
    {legal && <button
      type="button"
      className="camel-pick"
      aria-pressed={selected}
      aria-label={`Choose space ${space} for your ${side} tile`}
      onClick={() => onPick(space)}
    />}
  </div>;
}

export function Pyramid({ remaining, ticketsTaken }) {
  const left = 5 - ticketsTaken;
  return <div className="camel-pyramid">
    <div className="camel-pyramid-body" aria-hidden="true"><Dices /></div>
    <p className="camel-pyramid-count"><strong>{remaining.length}</strong> dice inside · {left} ticket{left === 1 ? "" : "s"} left</p>
    <ul className="camel-pyramid-dice" aria-label="Dice still in the pyramid">
      {PYRAMID_DICE.map((id) => {
        const inside = remaining.includes(id);
        const name = id === "grey" ? "Grey die (crazy camels)" : `${CAMEL_LABELS[id]} die`;
        return <li key={id} className={`camel-chip die-${id} ${inside ? "in" : "out"}`} aria-label={`${name}: ${inside ? "inside" : "rolled"}`} title={`${name}: ${inside ? "inside" : "rolled"}`}><span /></li>;
      })}
    </ul>
  </div>;
}

export function OrderList({ ranking, strip = false }) {
  return <ol className={strip ? "camel-order camel-order-strip" : "camel-order"} aria-label="Current racing order">
    {ranking.map((camelId, index) => <li key={camelId}><b>{index + 1}</b><Camel camelId={camelId} size="sm" /><span>{CAMEL_LABELS[camelId]}</span></li>)}
  </ol>;
}

export { RACING_CAMELS };
