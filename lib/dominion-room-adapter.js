import {
  addComputerPlayer,
  addPlayer,
  advanceToBuy,
  allPlayerCards,
  buyCard,
  createLobby,
  endTurn,
  playAction,
  removeComputerPlayer,
  resolveChoice,
  runComputerTurn,
  startGame,
} from "./dominion.js";

/**
 * Dominion on the server: dominion.js unchanged behind the engine-room adapter.
 * Hidden from every seat: draw piles, including the viewer's own (nobody may
 * know the order or contents of their own deck). Hidden from other seats:
 * hands. Discard piles, cards in play, the supply and the trash are public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function dominionView(game, viewerId) {
  return {
    ...game,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      deck: [],
      deckCount: player.deck.length,
      hand: player.id === viewerId ? player.hand : [],
      handCount: player.hand.length,
      // The browser shows every player's total, which used to be computed from their whole deck.
      cardTotal: allPlayerCards(player).length,
    })),
  };
}

/** @param {any} payload */
function cleanChoice(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    ...(Array.isArray(source.indices) ? { indices: source.indices.map(Number) } : {}),
    ...(source.index !== undefined ? { index: Number(source.index) } : {}),
    ...(source.cardId !== undefined ? { cardId: String(source.cardId) } : {}),
    ...(source.cancel ? { cancel: true } : {}),
  };
}

export const dominionAdapter = {
  label: "Dominion",
  createLobby,
  addPlayer,
  view: dominionView,
  // A whole computer turn, including any choice it owes, in one step.
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    play: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => playAction(game, playerId, Number(args.handIndex), rng) },
    resolve: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => resolveChoice(game, playerId, cleanChoice(args), rng) },
    toBuy: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => advanceToBuy(game, playerId) },
    buy: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => buyCard(game, playerId, String(args.cardId || "")) },
    endTurn: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => endTurn(game, playerId, rng) },
  },
};
