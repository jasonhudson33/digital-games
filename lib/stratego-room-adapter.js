import {
  addStrategoComputer,
  addStrategoPlayer,
  autoPlaceStrategoArmy,
  clearStrategoDeployment,
  createStrategoLobby,
  moveStrategoPiece,
  placeStrategoPiece,
  runStrategoComputerTurn,
  setStrategoReady,
} from "./stratego.js";

/**
 * Stratego on the server: stratego.js unchanged behind the engine-room adapter.
 *
 * A piece's id names its kind ("blue-marshal-1"), so hiding the rank fields is
 * not enough: an opponent's live piece is sent under an opaque id derived from
 * its square, with no kind, rank, label or icon. A piece is shown in full once a
 * rule reveals it (captured, or the game is over); the two pieces in
 * `lastBattle` are already public there. During setup the opponent's placement
 * is withheld entirely and only their `ready` flag is shown.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function strategoView(game, viewerId) {
  const finished = game.phase === "finished";
  const captured = new Set(game.captured || []);
  /** @type {Record<string, any>} */
  const pieces = {};
  /** @type {Record<string, string>} */
  const board = {};

  for (const [id, piece] of Object.entries(game.pieces || {})) {
    if (finished || captured.has(id) || piece.ownerId === viewerId) pieces[id] = piece;
  }
  for (const [square, pieceId] of Object.entries(game.board || {})) {
    const piece = game.pieces[pieceId];
    if (!piece) continue;
    if (finished || piece.ownerId === viewerId) {
      board[square] = pieceId;
    } else if (game.phase !== "setup" && game.phase !== "lobby") {
      const alias = `hidden-${square.replace(":", "-")}`;
      pieces[alias] = { id: alias, ownerId: piece.ownerId, color: piece.color, hidden: true };
      board[square] = alias;
    }
  }

  return {
    ...game,
    pieces,
    board,
    // The two-square rule only reads a player's own recent moves.
    moveHistory: (game.moveHistory || []).filter((/** @type {any} */ move) => move.playerId === viewerId),
  };
}

export const strategoAdapter = {
  label: "Stratego",
  createLobby: createStrategoLobby,
  addPlayer: addStrategoPlayer,
  view: strategoView,
  computerStep: runStrategoComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => addStrategoComputer(game, { rng }) },
    place: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        placeStrategoPiece(game, playerId, String(args.pieceId || ""), Number(args.row), Number(args.column)),
    },
    clear: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => clearStrategoDeployment(game, playerId) },
    autoPlace: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => autoPlaceStrategoArmy(game, playerId, rng) },
    ready: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => setStrategoReady(game, playerId, args.ready !== false) },
    move: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        moveStrategoPiece(game, playerId, String(args.pieceId || ""), Number(args.row), Number(args.column)),
    },
  },
};
