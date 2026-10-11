/*
 * How fast the computers move in a room (platform/computer-pacing).
 *
 * One speed per room, chosen from a short list, shared by every player in it.
 * The server and the browser both import this, so the list cannot drift.
 */

export const COMPUTER_SPEEDS = Object.freeze([
  { ms: 300, label: "Fast" },
  { ms: 600, label: "Normal" },
  { ms: 1000, label: "Slow" },
  { ms: 1500, label: "Very slow" },
]);

export const DEFAULT_COMPUTER_DELAY_MS = 600;

/**
 * A listed speed, or null for anything else. Accepts the number or its string
 * form, because a value that has been through JSON or a form arrives as either.
 * @param {unknown} value
 * @returns {number | null}
 */
export function normalizeComputerDelay(value) {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return COMPUTER_SPEEDS.some((speed) => speed.ms === number) ? /** @type {number} */ (number) : null;
}

/**
 * The room's speed. Rooms saved before the setting existed have no value and
 * read as Normal.
 * @param {{ computerDelayMs?: unknown } | null | undefined} room
 */
export function computerDelayOf(room) {
  return normalizeComputerDelay(room?.computerDelayMs) ?? DEFAULT_COMPUTER_DELAY_MS;
}

/** @param {number} ms */
export function computerSpeedLabel(ms) {
  return COMPUTER_SPEEDS.find((speed) => speed.ms === ms)?.label ?? "Normal";
}

/**
 * The props the speed control takes, or null when the room has no computer
 * players (the control is then not shown at all).
 * @param {{ players?: ReadonlyArray<{ isComputer?: boolean, isBot?: boolean }> | null | undefined, delayMs?: unknown, onChange: (ms: number) => unknown }} input
 */
export function computerSpeedProp({ players, delayMs, onChange }) {
  if (!players?.some((player) => player?.isComputer || player?.isBot)) return null;
  return { value: computerDelayOf({ computerDelayMs: delayMs }), onChange };
}
