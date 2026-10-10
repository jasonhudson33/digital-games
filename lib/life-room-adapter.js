import {
  addLifeComputer,
  addLifePlayer,
  buyInvestment,
  chooseCareer,
  chooseLifePath,
  chooseRetirement,
  createLifeLobby,
  removeLifeComputer,
  runLifeComputerTurn,
  spinLife,
  startLifeGame,
} from "./life.js";

/**
 * Life on the server: life.js unchanged behind the engine-room adapter.
 *
 * The spin is chosen by the server. spinLife() will accept a number as its third
 * argument, which is how the browser used to pick its own result; the `spin`
 * action never passes one, so a request cannot influence it.
 *
 * Hidden: each seat's LIFE tile values (held face down) from the other seats,
 * the LIFE tile pool, the millionaire bonus, and career cards on offer to
 * another seat. When the game finishes the tiles and bonus are revealed so the
 * final net worth can be shown.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function lifeView(game, viewerId) {
  const finished = game.phase === "finished";
  const pending = game.pending;
  return {
    ...game,
    lifeTilePool: finished ? game.lifeTilePool : [],
    lifeTilePoolCount: (game.lifeTilePool || []).length,
    millionaireBonus: finished ? game.millionaireBonus : [],
    millionaireBonusCount: (game.millionaireBonus || []).length,
    pending: pending && pending.options && pending.playerId !== viewerId ? { ...pending, options: [] } : pending,
    players: game.players.map((/** @type {any} */ player) => {
      const own = player.id === viewerId;
      const { careerOptions, ...rest } = player;
      return {
        ...rest,
        ...(own && careerOptions ? { careerOptions } : {}),
        lifeTiles: own || finished ? player.lifeTiles : [],
        lifeTileCount: (player.lifeTiles || []).length,
      };
    }),
  };
}

export const lifeAdapter = {
  label: "Life",
  createLobby: createLifeLobby,
  addPlayer: addLifePlayer,
  view: lifeView,
  computerStep: runLifeComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addLifeComputer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeLifeComputer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game) => startLifeGame(game) },
    path: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseLifePath(game, playerId, String(args.path || "")) },
    career: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseCareer(game, playerId, String(args.careerId || "")) },
    retirement: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseRetirement(game, playerId, String(args.destination || "")) },
    invest: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => buyInvestment(game, playerId, Number(args.number)) },
    spin: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => spinLife(game, playerId) },
  },
};
