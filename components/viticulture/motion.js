"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { planReplay, timeline } from "../../lib/viticulture-replay.js";
import { SEASONS, handCards } from "./pieces.js";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** What floats up beside a player for an event, or null if it only moves something. */
function floaterFor(event) {
  switch (event.type) {
    case "coins": return { text: `${event.delta > 0 ? "+" : "−"}${Math.abs(event.delta)} coin${Math.abs(event.delta) === 1 ? "" : "s"}`, tone: event.delta > 0 ? "coin" : "spend" };
    case "vp": return { text: `+${event.delta} VP`, tone: "vp" };
    case "cards-drawn": return { text: `+${event.count} ${{ vines: "vine", orders: "order", summer: "summer", winter: "winter" }[event.deck]}`, tone: "card" };
    case "wine-made": return { text: `${event.wine} wine ${event.value}`, tone: "wine" };
    case "grapes-harvested": return { text: `${event.red + event.white} grapes`, tone: "wine" };
    case "order-filled": return { text: event.name, tone: "vp" };
    case "structure-built": return { text: "Built", tone: "card" };
    case "field-planted": return { text: `Planted ${event.name}`, tone: "card" };
    case "card-played": return { text: event.name, tone: "card" };
    default: return null;
  }
}

function slotsFor(event) {
  return [...document.querySelectorAll(`[data-placed="${event.actionId}:${event.playerId}"]`)];
}

/**
 * Plays the room's new events as motion: a worker flies to its space, gains
 * float up beside whoever made them, a banner marks a new season.
 *
 * The board is already correct before any of this runs — the state has the
 * worker on its space and the coins in the purse — so motion is decoration over
 * the truth. That is why a hidden tab, a rejoin or reduced motion can skip it
 * (see planReplay) and lose nothing.
 */
export function useReplay(room) {
  const lastSeq = useRef(null);
  const roomCode = useRef(null);
  const timers = useRef([]);
  const idCounter = useRef(0);
  const [banner, setBanner] = useState(null);
  const [floaters, setFloaters] = useState([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  // Layout effect: a worker that is about to fly must be hidden before the
  // browser paints it sitting on its space.
  useLayoutEffect(() => {
    if (!room) return;
    // A different room is a fresh load: show it as it is. Checked here, in the
    // same effect that reads lastSeq, so the two can never run in the wrong order.
    if (roomCode.current !== room.roomCode) { roomCode.current = room.roomCode; lastSeq.current = null; }
    const { play, nextSeq } = planReplay({ lastSeq: lastSeq.current, events: room.events, hidden: document.hidden, reduced: reducedMotion() });
    lastSeq.current = nextSeq;
    if (!play.length) return;

    for (const { event } of timeline(play)) {
      if (event.type === "worker-placed") slotsFor(event).slice(-1).forEach((slot) => { slot.style.opacity = "0"; });
    }
    for (const { event, delay } of timeline(play)) {
      timers.current.push(window.setTimeout(() => show(event), delay));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.eventSeq]);

  function show(event) {
    if (event.type === "worker-placed") {
      const slot = slotsFor(event).slice(-1)[0];
      if (!slot) return;
      slot.style.opacity = "";
      const from = document.querySelector(`[data-player-chip="${event.playerId}"]`)?.getBoundingClientRect();
      const to = slot.getBoundingClientRect();
      if (from) {
        slot.animate([
          { transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(1.5)`, opacity: 0.2 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ], { duration: 560, easing: "cubic-bezier(.2,.8,.3,1)" });
      }
      return;
    }
    if (event.type === "season-changed") {
      setBanner({ id: ++idCounter.current, label: SEASONS[event.season].label, year: event.year });
      timers.current.push(window.setTimeout(() => setBanner(null), 1300));
      return;
    }
    const floater = floaterFor(event);
    const chip = floater && document.querySelector(`[data-player-chip="${event.playerId}"]`)?.getBoundingClientRect();
    if (!floater || !chip) return;
    const id = ++idCounter.current;
    setFloaters((current) => [...current, { id, ...floater, x: chip.left + chip.width / 2, y: chip.top + 8 }]);
    timers.current.push(window.setTimeout(() => setFloaters((current) => current.filter((item) => item.id !== id)), 1400));
  }

  return { banner, floaters };
}

/** Cards that have just arrived in your hand, for a moment, so a deal is noticed. */
export function useFreshCards(player) {
  const seen = useRef(null);
  const [fresh, setFresh] = useState(() => new Set());
  const cards = player ? handCards(player) : [];
  const key = cards.map(({ card }) => card.uid).join("|");

  useEffect(() => {
    const current = new Set(cards.map(({ card }) => card.uid));
    const added = seen.current ? [...current].filter((uid) => !seen.current.has(uid)) : [];
    seen.current = current;
    if (!added.length) return undefined;
    setFresh(new Set(added));
    const timer = window.setTimeout(() => setFresh(new Set()), 1400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return fresh;
}

export function MotionLayer({ banner, floaters }) {
  return <>
    {banner && <div className="viti-banner" key={banner.id} role="status"><small>Year {banner.year}</small><strong>{banner.label}</strong></div>}
    <div className="viti-floaters" aria-hidden="true">
      {floaters.map((floater) => <span key={floater.id} className={`viti-floater tone-${floater.tone}`} style={{ left: floater.x, top: floater.y }}>{floater.text}</span>)}
    </div>
  </>;
}
