import { addPlayer, createLobby, mixNow, nextPair, playAgain, startGame, submitEntry } from "./what-if.js";

/**
 * What If on the server (games/what-if). What people write is the hidden
 * information: during writing a seat sees only its own entry and who has
 * submitted; during the reveal it sees the pairs up to the current one and
 * nothing beyond.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function whatIfView(game, viewerId) {
  const { entries = {}, pairs = [], ...rest } = game;
  const view = {
    ...rest,
    submitted: Object.keys(entries),
    // Only while writing: after the mix your own words belong to pairs that
    // may not have been revealed yet.
    myEntry: game.phase === "writing" ? entries[viewerId] ?? null : null,
    pairCount: pairs.length,
    pairs: [],
  };
  if (game.phase === "reveal") view.pairs = pairs.slice(0, game.revealIndex + 1);
  if (game.phase === "done") view.pairs = pairs;
  return view;
}

export const whatIfAdapter = {
  label: "What If",
  createLobby,
  addPlayer,
  view: whatIfView,
  // No computer players: nobody but a person can write a What If.
  computerStep: (/** @type {any} */ game) => game,
  actions: {
    start: { host: true, run: (/** @type {any} */ game) => startGame(game) },
    submit: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) =>
        submitEntry(game, playerId, { ifText: args.if, thenText: args.then }, rng),
    },
    mixNow: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => mixNow(game, rng) },
    next: { host: true, run: (/** @type {any} */ game) => nextPair(game) },
    playAgain: { host: true, run: (/** @type {any} */ game) => playAgain(game) },
  },
};
