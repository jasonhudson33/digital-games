import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Seat tokens for client-authoritative rooms.
 *
 * The room's stored state carries a `__seats` map of playerId -> SHA-256 of that
 * seat's secret token. Only the hash is stored, the map is stripped from every
 * response, and the browser never sends it: the server re-attaches it on each
 * write. A room with no `__seats` map is a legacy room created before tokens
 * existed and keeps its old behavior until it expires.
 */
export const SEATS_KEY = "__seats";
export const SEAT_TOKEN_HEADER = "x-seat-token";

/** @param {string} token */
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export const newSeatToken = () => randomBytes(24).toString("base64url");

/** @param {any} state */
export const isLegacyRoom = (state) => !state || typeof state[SEATS_KEY] !== "object" || state[SEATS_KEY] === null;

/** @param {any} state */
export function stripSeats(state) {
  if (!state || typeof state !== "object" || !(SEATS_KEY in state)) return state;
  const { [SEATS_KEY]: _seats, ...rest } = state;
  return rest;
}

/**
 * The player id a token belongs to in this room, or null.
 * @param {any} state
 * @param {string | null | undefined} token
 */
export function seatForToken(state, token) {
  if (!token || isLegacyRoom(state)) return null;
  const candidate = Buffer.from(hashToken(token), "hex");
  for (const [playerId, hash] of Object.entries(state[SEATS_KEY])) {
    const stored = Buffer.from(String(hash), "hex");
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) return playerId;
  }
  return null;
}

/**
 * @param {any} seats
 * @param {string} playerId
 * @returns {{ seats: Record<string, string>, token: string }}
 */
export function addSeat(seats, playerId) {
  const token = newSeatToken();
  return { seats: { ...(seats || {}), [playerId]: hashToken(token) }, token };
}

/**
 * @param {any} state
 * @returns {any[]}
 */
const playersOf = (state) => (Array.isArray(state?.players) ? state.players : []);

/**
 * Does `next` add exactly one new player to a lobby and change none of the
 * others' identities? That is the only write a tokenless visitor may make.
 * @param {any} current
 * @param {any} next
 * @returns {string | null} the joining player's id
 */
export function joiningPlayerId(current, next) {
  if (current?.phase !== "lobby" || next?.phase !== "lobby") return null;
  const before = playersOf(current).map((player) => String(player.id));
  const after = playersOf(next).map((player) => String(player.id));
  if (after.length !== before.length + 1) return null;
  if (!before.every((id, index) => after[index] === id)) return null;
  const joiner = after[after.length - 1];
  const entry = playersOf(next)[after.length - 1];
  if (entry?.isComputer || entry?.isBot) return null;
  return joiner;
}

/**
 * A seated player may leave or remove computers, but may not remove another
 * human from the roster.
 * @param {any} current
 * @param {any} next
 * @param {string} actingPlayerId
 */
export function keepsOtherHumans(current, next, actingPlayerId) {
  const remaining = new Set(playersOf(next).map((player) => String(player.id)));
  return playersOf(current).every((player) =>
    player.isComputer || player.isBot || String(player.id) === actingPlayerId || remaining.has(String(player.id)),
  );
}
