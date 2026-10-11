/**
 * The page structure every game must provide (openspec: platform/game-layout).
 *
 * The shared components in components/ui stamp `data-layout="<part>"` on what
 * they render, and scripts/mobile-audit.mjs records which parts a game showed.
 * This module decides whether that is enough.
 *
 * UNMIGRATED lists games that still build their own landing, lobby, game bar or
 * dialog. It only ever shrinks: a game that shows every part while listed here
 * fails the audit until it is removed, so the list cannot go stale.
 */

/** Parts every game must show, in the order the audit meets them. */
export const LAYOUT_PARTS = ["entry", "lobby", "game-bar", "dialog"];


/** Games not yet moved onto the shared components. */
export const UNMIGRATED = [];

/**
 * Parts the audit cannot reach for a migrated game, with the reason. Mafia keeps
 * its rooms in Supabase through the browser, so without that project's keys the
 * audit stops at the landing; its lobby and game bar are covered by
 * tests/mafia-layout.test.mjs instead.
 */
export const UNREACHABLE = {
  mafia: ["lobby", "game-bar"],
};

/**
 * @param {string} slug
 * @param {Iterable<string>} seen  parts the game showed
 * @returns {{ missing: string[], stale: boolean }}
 *   missing: required parts the game did not show
 *   stale:   the game is allowlisted but already complete
 */
export function checkLayout(slug, seen, unmigrated = UNMIGRATED, unreachable = UNREACHABLE) {
  const shown = new Set([...seen, ...(unreachable[slug] ?? [])]);
  const required = LAYOUT_PARTS;
  const missing = required.filter((part) => !shown.has(part));
  const allowlisted = unmigrated.includes(slug);
  return {
    missing: allowlisted ? [] : missing,
    stale: allowlisted && missing.length === 0,
  };
}
