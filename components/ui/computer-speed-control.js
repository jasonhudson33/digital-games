"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";

import { COMPUTER_SPEEDS, computerSpeedLabel } from "../../lib/computer-speed.js";

/*
 * The room's computer speed (platform/computer-pacing), as the shared game bar
 * and lobby show it. Any seated player can change it; the value is the room's,
 * so everyone sees the same one.
 *
 *   variant "menu"    a button in the game bar that opens the four speeds
 *   variant "inline"  the four speeds laid out in the lobby
 *
 * The menu is not a dialog: it takes no focus trap, closes on a choice, on
 * Escape (returning focus to its button) and on a press outside it.
 */

/** @param {{ value: number, onChange: (ms: number) => unknown, variant?: "menu" | "inline" }} props */
export default function ComputerSpeedControl({ value, onChange, variant = "menu" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const buttonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  // Wherever the bar wraps its buttons, keep the panel inside the viewport.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    panel.style.transform = "";
    const { left, right } = panel.getBoundingClientRect();
    const margin = 8;
    const shift = left < margin ? margin - left : right > window.innerWidth - margin ? window.innerWidth - margin - right : 0;
    if (shift) panel.style.transform = `translateX(${shift}px)`;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    /** @param {PointerEvent} event */
    const outside = (event) => {
      if (!rootRef.current?.contains(/** @type {Node} */ (event.target))) setOpen(false);
    };
    /** @param {KeyboardEvent} event */
    const escape = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  /** @param {number} ms */
  function choose(ms) {
    setOpen(false);
    if (ms !== value) {
      setNote(`Computer speed ${computerSpeedLabel(ms)}`);
      void onChange(ms);
    }
    buttonRef.current?.focus();
  }

  const options = (
    <div className="tbl-speed-options" role="radiogroup" aria-label="Computer speed">
      {COMPUTER_SPEEDS.map((speed) => (
        <button
          key={speed.ms}
          type="button"
          role="radio"
          aria-checked={speed.ms === value}
          className={speed.ms === value ? "is-selected" : ""}
          onClick={() => choose(speed.ms)}
        >
          <strong>{speed.label}</strong>
          <small>{speed.ms / 1000}s</small>
        </button>
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="tbl-speed tbl-speed-inline" ref={rootRef} data-layout="computer-speed">
        <span className="tbl-speed-title"><Gauge aria-hidden="true" /> Computer speed</span>
        {options}
        <span className="visually-hidden" role="status">{note}</span>
      </div>
    );
  }

  return (
    <div className="tbl-speed" ref={rootRef} data-layout="computer-speed">
      <button
        ref={buttonRef}
        type="button"
        className="tbl-header-action tbl-speed-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Computer speed: ${computerSpeedLabel(value)}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Gauge aria-hidden="true" />
        <span className="tbl-header-action-label">{computerSpeedLabel(value)}</span>
      </button>
      {open && <div className="tbl-speed-panel" ref={panelRef}>{options}</div>}
      <span className="visually-hidden" role="status">{note}</span>
    </div>
  );
}
