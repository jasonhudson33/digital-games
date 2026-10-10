import {
  addComputerPlayer,
  addPlayer,
  chooseActionTarget,
  createLobby,
  flipCard,
  removeComputerPlayer,
  riskPercent,
  runComputerStep,
  startGame,
  startNextRound,
  stay,
} from "./flip-7.js";

/**
 * Flip 7 on the server: flip-7.js unchanged behind the engine-room adapter.
 * Cards on every table are public, so what is hidden is the draw pile (order
 * and contents) and the discard pile. The bust-risk meter used to read the
 * real draw pile in the browser; the server computes it and sends each seat
 * only its own percentage.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function flip7View(game, viewerId) {
  const viewer = game.players.find((/** @type {any} */ player) => player.id === viewerId);
  return {
    ...game,
    deck: [],
    deckCount: game.deck.length,
    discard: [],
    discardCount: game.discard.length,
    riskPercent: viewer && game.phase === "playing" ? riskPercent(game, viewer) : 0,
  };
}

export const flip7Adapter = {
  label: "Flip 7",
  createLobby,
  addPlayer,
  view: flip7View,
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => startNextRound(game, playerId, rng) },
    flip: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => flipCard(game, playerId, rng) },
    stay: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => stay(game, playerId) },
    chooseTarget: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => chooseActionTarget(game, playerId, String(args.targetId || ""), rng) },
  },
};
