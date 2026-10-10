import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  exchangeTiles,
  playTiles,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
} from "./qwirkle.js";

/**
 * Qwirkle on the server: qwirkle.js unchanged behind the engine-room adapter.
 * Hidden from other seats: racks and the tile bag. The board, scores and the
 * last move are public. The server validates and scores every move.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function qwirkleView(game, viewerId) {
  return {
    ...game,
    bag: [],
    bagCount: (game.bag || []).length,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      hand: player.id === viewerId ? player.hand : [],
      handCount: player.hand.length,
    })),
  };
}

/** @param {unknown} value */
function cleanPlacements(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({ x: Number(entry?.x), y: Number(entry?.y), tileId: String(entry?.tileId || "") }));
}

export const qwirkleAdapter = {
  label: "Qwirkle",
  createLobby,
  addPlayer,
  view: qwirkleView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    play: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => playTiles(game, playerId, cleanPlacements(args.placements)) },
    exchange: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) =>
        exchangeTiles(game, playerId, Array.isArray(args.tileIds) ? args.tileIds.map(String) : [], rng),
    },
  },
};
