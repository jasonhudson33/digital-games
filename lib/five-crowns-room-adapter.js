import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  discardCard,
  drawCard,
  goOut,
  layDownMeld,
  removeComputerPlayer,
  runComputerStep,
  startGame,
  startNextRound,
  takeDiscard,
} from "./five-crowns.js";

/**
 * Five Crowns on the server: five-crowns.js unchanged behind the engine-room
 * adapter. Hidden from other seats: hands, the draw pile and every discard but
 * the top one. Melds laid down at the end of a hand are public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function fiveCrownsView(game, viewerId) {
  return {
    ...game,
    deck: [],
    deckCount: (game.deck || []).length,
    discard: (game.discard || []).slice(-1),
    discardCount: (game.discard || []).length,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      hand: player.id === viewerId ? player.hand : [],
      handCount: player.hand.length,
    })),
  };
}

export const fiveCrownsAdapter = {
  label: "Five Crowns",
  createLobby,
  addPlayer,
  view: fiveCrownsView,
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => startNextRound(game, playerId, rng) },
    draw: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => drawCard(game, playerId, rng) },
    takeDiscard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => takeDiscard(game, playerId) },
    layDown: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        layDownMeld(game, playerId, Array.isArray(args.cardIds) ? args.cardIds.map(String) : []),
    },
    discard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => discardCard(game, playerId, String(args.cardId || "")) },
    goOut: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => goOut(game, playerId) },
  },
};
