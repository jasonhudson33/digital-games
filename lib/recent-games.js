"use client";

/**
 * The two or three games a household actually replays, remembered locally.
 *
 * Deliberately not server state: it is per-device, worthless if lost, and
 * nobody should need an account for it.
 */
const KEY = "dg-recent-games";
const LIMIT = 3;

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((entry) => entry && typeof entry.slug === "string") : [];
  } catch {
    // Private mode, disabled storage, or something else wrote garbage here.
    return [];
  }
}

export function recentGames() {
  if (typeof window === "undefined") return [];
  return read().slice(0, LIMIT);
}

/**
 * @param {string} slug
 * @param {number} [players]
 */
export function rememberGame(slug, players) {
  if (typeof window === "undefined") return;
  try {
    const next = [
      { slug, players: players ?? null, at: Date.now() },
      ...read().filter((entry) => entry.slug !== slug),
    ].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the feature is a convenience, not a requirement */
  }
}

/** @param {number} timestamp */
export function describeWhen(timestamp) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "Played today";
  if (days === 1) return "Played yesterday";
  if (days < 7) return `Played ${days} days ago`;
  if (days < 14) return "Played last week";
  return `Played ${Math.floor(days / 7)} weeks ago`;
}
