import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  discardCard,
  makePairFromDiscard,
  makePairFromHand,
  playChallengeCard,
  removeComputerPlayer,
  runComputerStep,
  startChallenge,
  startGame,
  startNextRound,
  yieldChallenge,
} from "./cover-your-assets.js";

/**
 * Cover Your Assets on the server: cover-your-assets.js unchanged behind the
 * engine-room adapter. Hidden from other seats: hands and the draw pile. Stacks,
 * the top of the discard pile and cards played into a challenge are public.
 */

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function coverYourAssetsView(game, viewerId) {
  return {
    ...game,
    deck: [],
    deckCount: (game.deck || []).length,
    discard: (game.discard || []).slice(-1),
    discardCount: (game.discard || []).length,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      hand: player.id === viewerId ? player.hand : [],
      handCount: player.hand.length,
    })),
  };
}

export const coverYourAssetsAdapter = {
  label: "Cover Your Assets",
  createLobby,
  addPlayer,
  view: coverYourAssetsView,
  computerStep: runComputerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => startNextRound(game, playerId, rng) },
    pairFromHand: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        makePairFromHand(game, playerId, Array.isArray(args.cardIds) ? args.cardIds.map(String) : []),
    },
    pairFromDiscard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => makePairFromDiscard(game, playerId, String(args.handCardId || "")) },
    discard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => discardCard(game, playerId, String(args.cardId || "")) },
    startChallenge: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => startChallenge(game, playerId, String(args.defenderId || ""), String(args.cardId || "")),
    },
    challengeCard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => playChallengeCard(game, playerId, String(args.cardId || "")) },
    yield: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => yieldChallenge(game, playerId) },
  },
};
