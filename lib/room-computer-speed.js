import { computerDelayOf, normalizeComputerDelay } from "./computer-speed.js";

/*
 * Server side of the room computer speed (platform/computer-pacing) for the
 * rooms that are not on the shared engine room (Skull King, Pinochle, Scum,
 * Hand & Foot, Killer Bunnies, Secret Hitler). They keep the speed on the room
 * as `computerDelayMs` and report whether a computer is due in every view.
 */

/**
 * A listed speed, or an error naming the problem.
 * @param {unknown} ms
 * @returns {number}
 */
export function chooseComputerSpeed(ms) {
  const speed = normalizeComputerDelay(ms);
  if (speed === null) throw new Error("Choose one of the listed computer speeds.");
  return speed;
}

/**
 * The two fields every view carries: the room's speed, and whether a computer
 * is due to move. "Due" is simply "the game's one-move function would change
 * something", the same contract an engine adapter's computerStep has. A game
 * that cannot take a move right now is never due, and a throw is not "due".
 * @param {{ computerDelayMs?: unknown }} room
 * @param {any} game
 * @param {(game: any) => any} computerMove
 */
export function computerView(room, game, computerMove) {
  let due = false;
  if (game) {
    try {
      due = computerMove(game) !== game;
    } catch {
      due = false;
    }
  }
  return { computerDelayMs: computerDelayOf(room), computerDue: due };
}
