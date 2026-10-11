import {
  addComputerPlayer,
  addPlayer,
  bonusOpen,
  chooseWakeUp,
  createLobby,
  decide,
  ACTION_SPACES,
  passSeason,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
  takeAction,
} from "./viticulture.js";

/**
 * Viticulture on the server: the rules in viticulture.js behind the engine-room
 * adapter. Hidden from other seats: vine, order and summer and winter visitor
 * cards, and the visitor a Cottage owner holds aside in autumn. Events carry only
 * counts, never a card. Hidden from everyone: the four decks and their discard piles. Fields,
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
  const pending = game.pending
    ? { ...game.pending, stash: Object.fromEntries(Object.entries(game.pending.stash || {}).filter(([id]) => id === viewerId)) }
    : null;
  return {
    ...game,
    decks: emptyPiles(),
    deckCounts: countsOf(game.decks),
    discard: emptyPiles(),
    discardCounts: countsOf(game.discard),
    pending,
    // The server's answer to "does a worker placed here now earn the bonus?", so
    // the client shows it rather than working it out again.
    bonusOpen: Object.fromEntries(ACTION_SPACES.filter((space) => space.season === game.season).map((space) => [space.id, bonusOpen(game, space.id)])),
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
    decide: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => decide(game, playerId, String(args.choice || "")) },
  },
};
