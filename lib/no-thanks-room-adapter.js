import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  passCard,
  removeComputerPlayer,
  runComputerStep,
  startGame,
  takeCard,
} from "./no-thanks.js";

/**
 * No Thanks! on the server: no-thanks.js unchanged behind the engine-room
 * adapter. The draw pile is the only thing hidden; the active card, the chips on
 * it, and every seat's taken cards and chips are shown at the table.
 */

/**
 * @param {any} game
 */
export function noThanksView(game) {
  return { ...game, deck: [], deckCount: (game.deck || []).length };
}

export const noThanksAdapter = {
  label: "No Thanks!",
  createLobby,
  addPlayer,
  view: noThanksView,
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    take: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => takeCard(game, playerId) },
    pass: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => passCard(game, playerId) },
  },
};
