import {
  addComputerPlayer,
  addPlayer,
  chooseDrawnDestinations,
  chooseOpeningDestinations,
  claimRoute,
  createLobby,
  drawDestinations,
  drawTrainCard,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
} from "./ticket-to-ride.js";

/**
 * Ticket to Ride on the server: ticket-to-ride.js unchanged behind the
 * engine-room adapter. Hidden from other seats: train cards, destination
 * tickets and any ticket choice in progress. Hidden from everyone: the train
 * deck, the discard pile and the destination deck. The face-up cards, the map
 * and claimed routes are public. Tickets are revealed to every seat once the
 * game is finished, together with the final scores that settle them.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function ticketToRideView(game, viewerId) {
  const finished = game.phase === "finished";
  const pending = game.pendingDestinationChoice;
  return {
    ...game,
    trainDeck: [],
    trainDeckCount: (game.trainDeck || []).length,
    trainDiscard: [],
    trainDiscardCount: (game.trainDiscard || []).length,
    destinationDeck: [],
    destinationDeckCount: (game.destinationDeck || []).length,
    pendingDestinationChoice: pending
      ? pending.playerId === viewerId
        ? pending
        : { playerId: pending.playerId, choices: [], choiceCount: pending.choices.length }
      : null,
    players: game.players.map((/** @type {any} */ player) => {
      const own = player.id === viewerId;
      return {
        ...player,
        cards: own ? player.cards : [],
        cardCount: (player.cards || []).length,
        destinations: own || finished ? player.destinations : [],
        destinationCount: (player.destinations || []).length,
        pendingDestinations: own ? player.pendingDestinations : [],
        pendingDestinationCount: (player.pendingDestinations || []).length,
      };
    }),
  };
}

/** @param {any} value */
const ids = (value) => (Array.isArray(value) ? value.map(String) : []);

export const ticketToRideAdapter = {
  label: "Ticket to Ride",
  createLobby,
  addPlayer,
  view: ticketToRideView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    chooseOpening: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseOpeningDestinations(game, playerId, ids(args.destinationIds)) },
    drawTrain: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) =>
        drawTrainCard(game, playerId, args.source === "deck" ? "deck" : Number(args.source), rng),
    },
    claim: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => claimRoute(game, playerId, String(args.routeId || ""), String(args.paymentColor || "")) },
    drawDestinations: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => drawDestinations(game, playerId, rng) },
    chooseDrawn: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseDrawnDestinations(game, playerId, ids(args.destinationIds)) },
  },
};
