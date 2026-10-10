import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  discardCard,
  drawCard,
  hitCard,
  layPhase,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
  startNextRound,
  takeDiscard,
} from "./phase-10.js";

/**
 * Phase 10 on the server: phase-10.js unchanged behind the engine-room
 * adapter. Hidden from other seats: hands, the draw pile, and every discard
 * but the top one. Laid phases are public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function phase10View(game, viewerId) {
  return {
    ...game,
    deck: [],
    deckCount: game.deck.length,
    discard: game.discard.slice(-1),
    discardCount: game.discard.length,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      hand: player.id === viewerId ? player.hand : [],
      handCount: player.hand.length,
    })),
  };
}

export const phase10Adapter = {
  label: "Phase 10",
  createLobby,
  addPlayer,
  view: phase10View,
  // A computer's whole turn (draw, lay, hit, discard) is one step.
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => startNextRound(game, playerId, rng) },
    draw: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => drawCard(game, playerId, rng) },
    takeDiscard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => takeDiscard(game, playerId) },
    layPhase: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        layPhase(game, playerId, Array.isArray(args.cardIds) ? args.cardIds.map(String) : []),
    },
    hitCard: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        hitCard(
          game,
          playerId,
          String(args.cardId || ""),
          String(args.targetPlayerId || ""),
          Number(args.groupIndex),
          args.side === "start" || args.side === "end" ? args.side : null,
        ),
    },
    discard: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        discardCard(game, playerId, String(args.cardId || ""), args.skipPlayerId ? String(args.skipPlayerId) : null),
    },
  },
};
