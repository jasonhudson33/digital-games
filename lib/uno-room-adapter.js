import {
  addComputerPlayer,
  addPlayer,
  catchUno,
  chooseOpeningColor,
  createLobby,
  drawCard,
  passAfterDraw,
  playCard,
  removeComputerPlayer,
  resolveDrawFour,
  runComputerStep,
  setRuleset,
  startGame,
  startNextRound,
} from "./uno.js";

/**
 * UNO on the server: the engine in uno.js unchanged, behind the engine-room
 * adapter (see engine-room.js). Hidden from other seats: hands, the draw pile,
 * whether a pending Wild Draw penalty was played legally, and in UNO Flip the
 * face of every card that is not showing.
 */

/** A placeholder for a card face that must not be revealed. */
const HIDDEN_FACE = Object.freeze({ type: "hidden" });

/**
 * @param {any} card
 * @param {string | null} side
 */
function maskInactiveFace(card, side) {
  if (!card?.light || !card?.dark) return card;
  const showing = side === "dark" ? "dark" : "light";
  const other = showing === "dark" ? "light" : "dark";
  return { ...card, [other]: HIDDEN_FACE };
}

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function unoView(game, viewerId) {
  const flip = game.ruleset === "flip";
  const mask = (/** @type {any} */ card) => (flip ? maskInactiveFace(card, game.side) : card);
  const pending = game.pendingDrawFour;
  const { wasLegal: _wasLegal, ...publicPending } = pending || {};
  return {
    ...game,
    deck: [],
    deckCount: game.deck.length,
    discard: game.discard.map(mask),
    pendingDrawFour: pending ? publicPending : null,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      cards: player.id === viewerId ? player.cards.map(mask) : [],
      cardCount: player.cards.length,
    })),
  };
}

export const unoAdapter = {
  label: "UNO",
  createLobby,
  addPlayer,
  view: unoView,
  computerStep: runComputerStep,
  actions: {
    setRuleset: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => setRuleset(game, args.ruleset) },
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => startGame(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => startNextRound(game, playerId, rng) },
    play: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        playCard(game, playerId, String(args.cardId || ""), { color: args.color, calledUno: Boolean(args.calledUno) }),
    },
    draw: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => drawCard(game, playerId, rng) },
    pass: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => passAfterDraw(game, playerId) },
    chooseOpeningColor: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => chooseOpeningColor(game, playerId, args.color) },
    resolveDrawFour: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args, rng }) => resolveDrawFour(game, playerId, Boolean(args.challenge), rng),
    },
    catchUno: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => catchUno(game, playerId, rng) },
  },
};
