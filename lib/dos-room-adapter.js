import {
  addComputerPlayer,
  addPlayer,
  callDos,
  catchDos,
  createLobby,
  drawCard,
  endTurn,
  placeCenterCard,
  playMatch,
  removeComputerPlayer,
  runComputerStep,
  startGame,
  startNextRound,
} from "./dos.js";

/**
 * DOS on the server: dos.js unchanged behind the engine-room adapter. Hidden
 * from other seats: hands, the draw pile, and the discard pile (which is only
 * ever reshuffled, never shown). The center row is public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function dosView(game, viewerId) {
  return {
    ...game,
    deck: [],
    deckCount: game.deck.length,
    discard: [],
    discardCount: game.discard.length,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      cards: player.id === viewerId ? player.cards : [],
      cardCount: player.cards.length,
    })),
  };
}

export const dosAdapter = {
  label: "DOS",
  createLobby,
  addPlayer,
  view: dosView,
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => startNextRound(game, playerId, rng) },
    playMatch: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => playMatch(game, playerId, String(args.optionId || ""), rng) },
    draw: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => drawCard(game, playerId, rng) },
    endTurn: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => endTurn(game, playerId, rng) },
    placeCenterCard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => placeCenterCard(game, playerId, String(args.cardId || "")) },
    callDos: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => callDos(game, playerId) },
    catchDos: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => catchDos(game, playerId, rng) },
  },
};
