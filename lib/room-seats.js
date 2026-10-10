import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Seat tokens for engine-backed rooms (see engine-room.js).
 *
 * The room's stored state carries a `__seats` map of playerId -> SHA-256 of that
 * seat's secret token. Only the hash is stored, the browser keeps the token and
 * sends it as the X-Seat-Token header, and the map never appears in a response.
 */
export const SEATS_KEY = "__seats";
export const SEAT_TOKEN_HEADER = "x-seat-token";

/** @param {string} token */
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const newSeatToken = () => randomBytes(24).toString("base64url");

/**
 * The player id a token belongs to in this room, or null.
 * @param {any} state
 * @param {string | null | undefined} token
 */
export function seatForToken(state, token) {
  const seats = state?.[SEATS_KEY];
  if (!token || !seats || typeof seats !== "object") return null;
  const candidate = Buffer.from(hashToken(token), "hex");
  for (const [playerId, hash] of Object.entries(seats)) {
    const stored = Buffer.from(String(hash), "hex");
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) return playerId;
  }
  return null;
}

/**
 * Add a seat and return the new map with that seat's one-time token.
 * @param {any} seats
 * @param {string} playerId
 * @returns {{ seats: Record<string, string>, token: string }}
 */
export function addSeat(seats, playerId) {
  const token = newSeatToken();
  return { seats: { ...(seats || {}), [playerId]: hashToken(token) }, token };
}
