import {
  addComputerPlayer,
  addPlayer,
  chooseGeneralStoreCard,
  createLobby,
  declineResponse,
  discardFromHand,
  endTurn,
  playCard,
  removeComputerPlayer,
  respondWithCard,
  runComputerStep,
  startGame,
  useSidKetchum,
} from "./bang.js";

/**
 * BANG! on the server: bang.js unchanged behind the engine-room adapter.
 * Hidden from other seats: hands, the draw pile, and roles. A role is shown
 * for the Sheriff, for the viewer's own seat, for an eliminated player and
 * once the game is over. Equipment and characters are public.
 *
 * Other seats' hands come back as face-down placeholders rather than an empty
 * list: the browser's legalTargets() reads `hand.length` to decide whether
 * Panic and Cat Balou have a target.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function bangView(game, viewerId) {
  return {
    ...game,
    deck: [],
    // The lobby has no deck yet.
    deckCount: (game.deck || []).length,
    players: game.players.map((/** @type {any} */ player) => {
      const own = player.id === viewerId;
      const roleVisible = own || player.role === "sheriff" || !player.alive || game.phase === "finished";
      return {
        ...player,
        role: roleVisible ? player.role : null,
        hand: own ? player.hand : player.hand.map((/** @type {any} */ _card, /** @type {number} */ index) => ({ id: `hidden-${player.id}-${index}`, hidden: true })),
        handCount: player.hand.length,
      };
    }),
  };
}

export const bangAdapter = {
  label: "BANG!",
  createLobby,
  addPlayer,
  view: bangView,
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    play: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) =>
        playCard(
          game,
          playerId,
          String(args.cardId || ""),
          {
            ...(args.targetId ? { targetId: String(args.targetId) } : {}),
            ...(args.targetCardId ? { targetCardId: String(args.targetCardId) } : {}),
          },
          rng,
        ),
    },
    respond: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => respondWithCard(game, playerId, String(args.cardId || ""), rng) },
    decline: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => declineResponse(game, playerId, rng) },
    generalStore: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseGeneralStoreCard(game, playerId, String(args.cardId || "")) },
    sid: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) =>
        useSidKetchum(game, playerId, Array.isArray(args.cardIds) ? args.cardIds.map(String) : [], rng),
    },
    discard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => discardFromHand(game, playerId, String(args.cardId || ""), rng) },
    endTurn: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => endTurn(game, playerId, rng) },
  },
};
