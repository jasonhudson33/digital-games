import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  exchangeDeadCard,
  playCard,
  removeComputerPlayer,
  runComputerTurn,
  setTeamCount,
  startGame,
} from "./sequence.js";

/**
 * Sequence on the server: sequence.js unchanged behind the engine-room adapter.
 * Hidden from other seats: hands and the draw pile. The board with every chip,
 * completed sequences and the top discard are public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function sequenceView(game, viewerId) {
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

export const sequenceAdapter = {
  label: "Sequence",
  createLobby,
  addPlayer,
  view: sequenceView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    setTeamCount: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => setTeamCount(game, Number(args.teamCount)) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    play: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) =>
        playCard(game, playerId, String(args.cardId || ""), Number(args.row), Number(args.column), rng),
    },
    exchange: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => exchangeDeadCard(game, playerId, String(args.cardId || ""), rng) },
  },
};
