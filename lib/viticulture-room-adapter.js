import {
  addComputerPlayer,
  addPlayer,
  chooseWakeUp,
  createLobby,
  passSeason,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
  takeAction,
} from "./viticulture.js";

/**
 * Viticulture on the server: viticulture.js unchanged behind the engine-room
 * adapter. Hidden from other seats: vine, order and summer and winter visitor
 * cards. Hidden from everyone: the four decks and their discard piles. Fields,
 * structures, grapes, wine, workers and board placements are public.
 */

const KINDS = ["vines", "orders", "summer", "winter"];

/**
 * @param {Record<string, any[]> | undefined} piles
 */
function countsOf(piles) {
  return Object.fromEntries(KINDS.map((kind) => [kind, (piles?.[kind] || []).length]));
}

/** @returns {Record<string, any[]>} */
function emptyPiles() {
  return Object.fromEntries(KINDS.map((kind) => [kind, []]));
}

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function viticultureView(game, viewerId) {
  return {
    ...game,
    decks: emptyPiles(),
    deckCounts: countsOf(game.decks),
    discard: emptyPiles(),
    discardCounts: countsOf(game.discard),
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      cards: player.id === viewerId ? player.cards : emptyPiles(),
      cardCounts: countsOf(player.cards),
    })),
  };
}

/** @param {any} payload */
function cleanPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const out = /** @type {Record<string, string>} */ ({});
  for (const key of ["buildingId", "cardId", "fieldId", "grapeType", "optionId", "orderId"]) {
    if (source[key] !== undefined) out[key] = String(source[key]);
  }
  return out;
}

export const viticultureAdapter = {
  label: "Viticulture",
  createLobby,
  addPlayer,
  view: viticultureView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    wakeUp: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseWakeUp(game, playerId, Number(args.row)) },
    action: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        takeAction(game, playerId, String(args.actionId || ""), cleanPayload(args.payload), args.workerType === "grande" ? "grande" : "regular"),
    },
    pass: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => passSeason(game, playerId) },
  },
};
