"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Makes a dialog behave like one.
 *
 * The app had 36 elements with role="dialog" and aria-modal, but nothing moved
 * focus into them on open, returned it on close, or stopped Tab walking out to
 * the page behind — so for a keyboard or screen-reader user the "modal" was a
 * suggestion. This adds the three behaviours that make the ARIA true:
 *
 *   1. focus moves to the first focusable element (or the panel itself)
 *   2. Tab and Shift+Tab wrap inside the panel
 *   3. focus returns to whatever opened it on close
 *
 * Escape-to-close is handled here too, and the rest of the page is marked
 * `inert` so assistive tech and pointer events skip it.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @returns {import("react").RefObject<HTMLElement>} ref for the dialog panel
 */
export function useDialog(open, onClose) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    restoreRef.current = document.activeElement;

    // Everything that is not an ancestor of the panel becomes inert, which is
    // one attribute instead of a manual aria-hidden sweep.
    const inerted = [];
    for (const node of document.body.children) {
      if (!node.contains(panel) && !node.hasAttribute("inert")) {
        node.setAttribute("inert", "");
        inerted.push(node);
      }
    }

    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus?.();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const targets = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
      if (targets.length === 0) return;

      const edge = event.shiftKey ? targets[0] : targets[targets.length - 1];
      if (document.activeElement === edge || !panel.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? targets[targets.length - 1] : targets[0]).focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      for (const node of inerted) node.removeAttribute("inert");
      const restore = restoreRef.current;
      if (restore instanceof HTMLElement && document.contains(restore)) restore.focus();
    };
  }, [open, onClose]);

  return panelRef;
}
