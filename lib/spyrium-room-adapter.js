import {
  activateMarketCard,
  addComputerPlayer,
  addPlayer,
  beginActivation,
  chooseBonus,
  createLobby,
  gainMoney,
  pass,
  placeWorker,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
  useBuilding,
  useEvent,
} from "./spyrium.js";

/**
 * Spyrium on the server: spyrium.js unchanged behind the engine-room adapter.
 * Hidden from everyone: the three period decks and every event beyond the next
 * one. The market, workers, tableaux, the current event and the next event are
 * public.
 */

/**
 * @param {any} game
 */
export function spyriumView(game) {
  const decks = game.decks || { A: [], B: [], C: [] };
  return {
    ...game,
    decks: { A: [], B: [], C: [] },
    deckCounts: { A: (decks.A || []).length, B: (decks.B || []).length, C: (decks.C || []).length },
    events: [],
    eventsRemaining: (game.events || []).length,
  };
}

/** The choices an activation or event may carry; anything else is dropped. */
const OPTION_KEYS = [
  "actionIndex", "buildingId", "replacementId", "residenceChoice", "resource",
  "slotId", "spend", "tokenValue", "useLobbying", "useTaylorism",
];

/** @param {any} options */
function cleanOptions(options) {
  const source = options && typeof options === "object" ? options : {};
  return Object.fromEntries(OPTION_KEYS.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

export const spyriumAdapter = {
  label: "Spyrium",
  createLobby,
  addPlayer,
  view: spyriumView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    place: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => placeWorker(game, playerId, String(args.slotId || "")) },
    beginActivation: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => beginActivation(game, playerId) },
    activate: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        activateMarketCard(game, playerId, String(args.workerId || ""), Number(args.cardIndex), cleanOptions(args.options)),
    },
    gainMoney: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => gainMoney(game, playerId, String(args.workerId || ""), Number(args.cardIndex)) },
    useBuilding: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        useBuilding(game, playerId, String(args.buildingId || ""), Number(args.actionIndex || 0), cleanOptions(args.options)),
    },
    useEvent: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => useEvent(game, playerId, cleanOptions(args.options)) },
    bonus: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseBonus(game, playerId, String(args.choice || "")) },
    pass: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => pass(game, playerId) },
  },
};
