"use client";

/**
 * The local mirror of a room, and the one error every room service has to be
 * able to tell apart from "no such room".
 *
 * Twenty room services carried their own copy of
 *
 *   const cached = localStorage.getItem(key);
 *   return cached ? JSON.parse(cached) : null;
 *
 * with no guard at all, on the fallback path of every load and every poll. One
 * truncated entry — an interrupted write, a quota eviction, a state shape from
 * an older deploy — threw on every subsequent attempt, and nothing ever cleared
 * it, so that room stayed unopenable in that browser for good. Writing was
 * equally unguarded, so a QuotaExceededError surfaced as a failed move even
 * though the server had already accepted it, and Safari's private mode threw on
 * both. lib/recent-games.js had the right pattern all along.
 */

/** Thrown when the room server could not be reached at all. */
export class RoomOfflineError extends Error {
  constructor(message = "Could not reach the room server. Check your connection.") {
    super(message);
    this.name = "RoomOfflineError";
  }
}

/** @param {unknown} error */
export const isOffline = (error) => error instanceof RoomOfflineError;

/**
 * A failed `fetch` rejects with TypeError. Services used to map that to `null`,
 * which is also how "this room does not exist" is spelled — so a player whose
 * wifi dropped was told their room was gone, and `createCode()` treated every
 * candidate as free because every existence check came back empty.
 *
 * @param {unknown} error
 * @param {string} [fallbackMessage]
 * @returns {Error}
 */
export const asRoomError = (error, fallbackMessage) => {
  if (error instanceof TypeError) return new RoomOfflineError();
  if (error instanceof Error) return error;
  return new Error(fallbackMessage ?? "Could not reach the room server.");
};

/**
 * @param {string} key
 * @param {(state: any) => any} [migrate]
 */
export function readCachedRoom(key, migrate = (state) => state) {
  try {
    const cached = globalThis.localStorage?.getItem(key);
    return cached ? migrate(JSON.parse(cached)) : null;
  } catch {
    // Unreadable or unparseable: drop it so one bad write cannot wedge the room
    // forever, and fall through to the server copy.
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* storage is unavailable entirely — nothing to clean up */
    }
    return null;
  }
}

/**
 * @param {string} key
 * @param {unknown} state
 */
export function writeCachedRoom(key, state) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(state));
  } catch {
    /* the cache is an optimisation; the server already has the move */
  }
}

/** @param {string} key */
export function clearCachedRoom(key) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* nothing to do */
  }
}
