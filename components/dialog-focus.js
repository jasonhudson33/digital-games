"use client";

import { useEffect } from "react";

/*
 * Makes the app's 37 existing dialogs behave like dialogs.
 *
 * Every one of them already sets role="dialog" and aria-modal="true" — the
 * markup was never the problem. What was missing is the behaviour that makes
 * those attributes true: nothing moved focus into a dialog when it opened,
 * nothing returned focus when it closed, and Tab walked straight out into the
 * page behind. For a keyboard or screen-reader user, "modal" was a suggestion.
 *
 * Why a single observer rather than 37 edits:
 *
 * The dialogs live in seventeen game clients with no shared modal component,
 * and many are inline JSX inside large render functions rather than components
 * that could take a hook. Threading a ref and an onClose through all of them
 * touches a lot of working game code for a behavioural fix, which is the most
 * likely place to introduce a real bug. This does the same job in one file,
 * cannot affect game logic — it only moves focus and sets `inert` — and covers
 * dialogs added later for free.
 *
 * It is a bridge, not a destination. As dialogs move onto the shared shell (or
 * onto the native <dialog> element, which does all of this natively), they can
 * opt out by setting data-focus-managed and this shrinks to nothing.
 *
 * Escape-to-close deliberately stays with each component: only the component
 * knows what closing means. Most already handle it.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const SELECTOR = '[role="dialog"][aria-modal="true"]:not([data-focus-managed])';

function visibleTargets(panel) {
  return [...panel.querySelectorAll(FOCUSABLE)].filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  );
}

export default function DialogFocusManager() {
  useEffect(() => {
    /** @type {Map<Element, {restore: Element|null, inerted: Element[]}>} */
    const active = new Map();

    function activate(panel) {
      if (active.has(panel)) return;

      const restore = document.activeElement;
      const inerted = [];
      for (const node of document.body.children) {
        if (!node.contains(panel) && !node.hasAttribute("inert")) {
          node.setAttribute("inert", "");
          inerted.push(node);
        }
      }

      active.set(panel, { restore, inerted });

      // The panel itself needs to be focusable for the fallback case where it
      // holds no interactive elements (a results readout, say).
      if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
      const first = panel.querySelector(FOCUSABLE);
      (first || panel).focus?.({ preventScroll: true });
    }

    function deactivate(panel) {
      const entry = active.get(panel);
      if (!entry) return;
      active.delete(panel);
      for (const node of entry.inerted) node.removeAttribute("inert");
      const { restore } = entry;
      if (restore instanceof HTMLElement && document.contains(restore)) {
        restore.focus({ preventScroll: true });
      }
    }

    function sync() {
      const open = new Set(document.querySelectorAll(SELECTOR));
      for (const panel of active.keys()) {
        if (!open.has(panel) || !document.contains(panel)) deactivate(panel);
      }
      // Only the topmost dialog traps focus; a nested one supersedes its parent.
      const last = [...open].at(-1);
      if (last) activate(last);
    }

    function onKeyDown(event) {
      if (event.key !== "Tab" || active.size === 0) return;
      const panel = [...active.keys()].at(-1);
      if (!panel) return;

      const targets = visibleTargets(panel);
      if (targets.length === 0) return;

      const inside = panel.contains(document.activeElement);
      const edge = event.shiftKey ? targets[0] : targets.at(-1);

      if (!inside || document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? targets.at(-1) : targets[0]).focus();
      }
    }

    // The observer watches a whole game board, which mutates constantly during
    // play. Coalesce to one sync per frame so a busy turn cannot turn this into
    // a querySelectorAll storm.
    let queued = 0;
    function scheduleSync() {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        sync();
      });
    }

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["role", "aria-modal", "data-focus-managed"] });
    document.addEventListener("keydown", onKeyDown, true);
    sync();

    return () => {
      if (queued) cancelAnimationFrame(queued);
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
      for (const panel of [...active.keys()]) deactivate(panel);
    };
  }, []);

  return null;
}
