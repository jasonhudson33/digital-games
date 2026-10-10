import {
  addComputerPlayer,
  addPlayer,
  chooseNoble,
  createLobby,
  passTurn,
  purchaseCard,
  removeComputerPlayer,
  reserveCard,
  returnTokens,
  runComputerTurn,
  startGame,
  takeDifferentTokens,
  takePairTokens,
} from "./splendor.js";

/**
 * Splendor on the server: splendor.js unchanged behind the engine-room adapter.
 * Hidden from other seats: reserved developments. A card reserved from the
 * market is public in the physical game, but the engine does not record where a
 * reservation came from, so all of another seat's reservations are hidden.
 * Hidden from everyone: the three face-down development decks. The markets,
 * bank, nobles and tableaux are public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function splendorView(game, viewerId) {
  const decks = game.decks || { 1: [], 2: [], 3: [] };
  return {
    ...game,
    decks: { 1: [], 2: [], 3: [] },
    deckCounts: { 1: (decks[1] || []).length, 2: (decks[2] || []).length, 3: (decks[3] || []).length },
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      reserved: player.id === viewerId ? player.reserved : [],
      reservedCount: player.reserved.length,
    })),
  };
}

/** @param {any} source */
function cleanSource(source) {
  const value = source && typeof source === "object" ? source : {};
  return {
    kind: value.kind === "deck" || value.kind === "reserved" ? value.kind : "market",
    level: Number(value.level),
    index: Number(value.index),
  };
}

export const splendorAdapter = {
  label: "Splendor",
  createLobby,
  addPlayer,
  view: splendorView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    takeDifferent: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        takeDifferentTokens(game, playerId, Array.isArray(args.colors) ? args.colors.map(String) : []),
    },
    takePair: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => takePairTokens(game, playerId, String(args.color || "")) },
    reserve: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => reserveCard(game, playerId, cleanSource(args.source)) },
    purchase: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => purchaseCard(game, playerId, cleanSource(args.source)) },
    pass: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => passTurn(game, playerId) },
    returnTokens: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => returnTokens(game, playerId, args.returned && typeof args.returned === "object" ? args.returned : {}) },
    chooseNoble: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseNoble(game, playerId, String(args.nobleId || "")) },
  },
};
