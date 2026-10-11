"use client";

import { useEffect, useRef } from "react";

/**
 * Arms one step. Plain function so the timing rule is testable without React.
 * @param {number} delayMs
 * @param {() => unknown} step
 * @param {{ setTimeout: typeof setTimeout, clearTimeout: typeof clearTimeout }} [timers]
 * @returns {() => void} cancels it
 */
export function armComputerStep(delayMs, step, timers = globalThis) {
  const timer = timers.setTimeout(() => void step(), delayMs);
  return () => timers.clearTimeout(timer);
}

/**
 * The one place a browser decides when a computer moves.
 *
 * Only the host's browser steps computers (so two clients never race the same
 * move). While the host is enabled and a computer is due, it waits the room's
 * delay and takes one step. `key` is the room's version: every new state starts
 * the wait again, and so does a change of speed (which saves the room), so the
 * delay is always read from the latest room when it is armed.
 *
 * @param {Object} options
 * @param {boolean} options.enabled   true in the host's browser only
 * @param {boolean} options.due       a computer is due to act
 * @param {number} options.delayMs    the room's computer speed
 * @param {() => unknown} options.step takes one computer move
 * @param {unknown} options.key       changes whenever the room does
 * @returns {{ waiting: boolean }}    a computer is due (for "thinking" labels, on any client)
 */
export function useComputerPacer({ enabled, due, delayMs, step, key }) {
  const stepRef = useRef(step);
  const delayRef = useRef(delayMs);
  stepRef.current = step;
  delayRef.current = delayMs;
  const active = Boolean(enabled && due);

  useEffect(() => {
    if (!active) return undefined;
    return armComputerStep(delayRef.current, () => stepRef.current());
  }, [active, key]);

  return { waiting: Boolean(due) };
}
