/**
 * Unguessable identifiers for rooms and seats.
 *
 * Every room module used to carry its own copy of
 *
 *   Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)])
 *
 * — seven of them, byte-identical. `Math.random()` is not a CSPRNG: V8 runs
 * xorshift128+, whose internal state is recoverable from a modest run of
 * outputs, and the same generator produced both the room code and the seat
 * token. A seat token is the only thing standing between a player and someone
 * else's hand, so it has to come from `crypto`.
 *
 * Sampling uses rejection rather than `% alphabet.length`, which would bias
 * toward the front of the alphabet whenever 256 is not a multiple of its
 * length (it never is, for the alphabets here).
 */

/** Ambiguity-free: no O/0, no I/1/l. Safe to read aloud or copy off a screen. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** @param {number} count */
function randomBytes(count) {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Uniformly random string of `length` characters drawn from `alphabet`.
 *
 * @param {number} length
 * @param {string} [alphabet]
 * @returns {string}
 */
export function randomString(length, alphabet = TOKEN_ALPHABET) {
  if (!Number.isInteger(length) || length < 1) throw new Error("length must be a positive integer.");
  if (alphabet.length < 2 || alphabet.length > 256) throw new Error("alphabet must hold 2–256 characters.");

  // Largest multiple of alphabet.length that fits in a byte; anything at or
  // above it is redrawn so every character stays equally likely.
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length - out.length)) {
      if (byte >= limit) continue;
      out += alphabet[byte % alphabet.length];
    }
  }
  return out;
}

/**
 * Seat and host tokens. 28 characters of the 62-character alphabet ≈ 166 bits.
 *
 * @param {number} [length]
 */
export function randomToken(length = 28) {
  return randomString(length, TOKEN_ALPHABET);
}

/**
 * Shareable room code. Short by necessity — it gets typed in by hand.
 *
 * @param {number} [length]
 */
export function randomRoomCode(length = 6) {
  return randomString(length, ROOM_CODE_ALPHABET);
}
