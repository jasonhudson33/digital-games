import {
  addComputerPlayer,
  addPlayer,
  continueNow,
  createLobby,
  nextPair,
  playAgain,
  removeComputerPlayer,
  runComputerStep,
  startGame,
  submitText,
} from "./what-if.js";

/**
 * What If on the server (games/what-if). What people write is the hidden
 * information:
 *   ifs     a seat sees its own IF and who has written one
 *   thens   a seat sees only the IF it drew (not who wrote it), its own THEN,
 *           and who has written a THEN
 *   reveal  the pairs up to the current one, nothing beyond
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function whatIfView(game, viewerId) {
  const { ifs = {}, draws = {}, thens = {}, pairs = [], ...rest } = game;
  const view = {
    ...rest,
    submitted: [],
    writers: [],
    myText: null,
    myDraw: null,
    pairCount: pairs.length,
    pairs: [],
  };
  if (game.phase === "ifs") {
    view.writers = game.players.map((player) => player.id);
    view.submitted = Object.keys(ifs);
    view.myText = ifs[viewerId] ?? null;
  }
  if (game.phase === "thens") {
    view.writers = Object.keys(draws);
    view.submitted = Object.keys(thens);
    view.myText = thens[viewerId] ?? null;
    view.myDraw = draws[viewerId] ? { ifText: ifs[draws[viewerId]] } : null;
  }
  if (game.phase === "reveal") view.pairs = pairs.slice(0, game.revealIndex + 1);
  if (game.phase === "done") view.pairs = pairs;
  return view;
}

export const whatIfAdapter = {
  label: "What If",
  createLobby,
  addPlayer,
  view: whatIfView,
  // A computer writes from the bank of lines, one per step, paced by the host.
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game) => startGame(game) },
    submit: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => submitText(game, playerId, args.text, rng),
    },
    continueNow: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => continueNow(game, rng) },
    next: { host: true, run: (/** @type {any} */ game) => nextPair(game) },
    playAgain: { host: true, run: (/** @type {any} */ game) => playAgain(game) },
  },
};
