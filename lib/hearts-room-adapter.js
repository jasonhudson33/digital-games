import {
  chooseBotHeartCard,
  collectHeartTrick,
  completeHeartsPassSelections,
  createHeartsTable,
  heartsPlayerCountAllowed,
  playHeartCard,
  startNextHeartsRound,
} from "./hearts.js";

/**
 * Hearts on the server: the rules in hearts.js behind the engine-room adapter
 * (see engine-room.js). The host builds the table in the lobby, picking Classic
 * or Killer and adding computers; once dealt, every seat sees only its own hand.
 *
 * Hidden from other seats: hands, the kitty until a trick takes it, the cards
 * each seat has chosen to pass, and the captured piles (their point totals stay
 * public). The engine numbers seats 0..n-1, so each engine player also carries
 * the `playerId` the room knows it by.
 */

const MAX_SEATS = 8;
const COMPUTER_NAMES = ["Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash", "Sage"];
const VARIANTS = ["classic", "killer"];

/** The number of seats each variant can start with, for messages. */
export const HEARTS_SEAT_RANGE = { classic: [3, 4], killer: [5, 8] };

/**
 * @param {{ id: string, name: string }} host
 * @param {string} roomCode
 */
export function createHeartsLobby(host, roomCode) {
  return {
    game: "hearts",
    roomCode,
    hostId: host.id,
    phase: "lobby",
    variant: "classic",
    targetScore: 100,
    players: [{ id: host.id, name: host.name, isComputer: false }],
    message: "Add players, then start.",
  };
}

/**
 * @param {any} game
 * @param {{ id: string, name: string }} player
 */
export function addHeartsPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_SEATS) return game;
  return { ...game, players: [...game.players, { id: player.id, name: player.name, isComputer: false }] };
}

/** @param {any} game */
function addComputer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_SEATS) return game;
  const used = new Set(game.players.map((/** @type {any} */ player) => player.name));
  const name = COMPUTER_NAMES.find((candidate) => !used.has(candidate)) ?? `Computer ${game.players.length}`;
  return {
    ...game,
    players: [...game.players, { id: `computer-${game.players.length}-${name}`, name, isComputer: true }],
  };
}

/** @param {any} game @param {string} playerId */
function removeComputer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const target = game.players.find((/** @type {any} */ player) => player.id === playerId);
  if (!target?.isComputer) return game;
  return { ...game, players: game.players.filter((/** @type {any} */ player) => player.id !== playerId) };
}

/** @param {any} game @param {string} variant */
function setVariant(game, variant) {
  if (game.phase !== "lobby" || !VARIANTS.includes(variant) || game.variant === variant) return game;
  return { ...game, variant };
}

/** @param {any} game @param {() => number} rng */
function start(game, rng) {
  if (game.phase !== "lobby") return game;
  if (!heartsPlayerCountAllowed(game.variant, game.players.length)) return game;
  const dealt = createHeartsTable({
    variant: game.variant,
    targetScore: game.targetScore,
    random: rng,
    seats: game.players.map((/** @type {any} */ player) => ({
      name: player.name,
      playerId: player.id,
      isComputer: player.isComputer,
    })),
  });
  const { game: _game, ...rest } = game;
  return { ...rest, ...dealt, game: "hearts", passSelections: {} };
}

/** @param {any} game @param {string} playerId */
const seatOf = (game, playerId) => game.players.findIndex((/** @type {any} */ player) => player.playerId === playerId);

/**
 * @param {any} game
 * @param {string} playerId
 * @param {unknown} cardIds
 */
function passCards(game, playerId, cardIds) {
  if (game.phase !== "passing") return game;
  const seat = seatOf(game, playerId);
  const ids = Array.isArray(cardIds) ? [...new Set(cardIds.map(String))] : [];
  if (seat < 0 || ids.length !== 3 || game.passSelections?.[seat]) return game;
  const hand = game.players[seat].hand;
  if (!ids.every((id) => hand.some((/** @type {any} */ card) => card.id === id))) return game;

  const passSelections = { ...game.passSelections, [seat]: ids };
  const waiting = game.players.some(
    (/** @type {any} */ player, /** @type {number} */ index) => !player.isComputer && !passSelections[index],
  );
  if (waiting) return { ...game, passSelections, message: "Waiting for the other players to pass." };

  const exchanged = completeHeartsPassSelections(
    game,
    game.players.map((/** @type {any} */ _player, /** @type {number} */ index) => passSelections[index] ?? null),
  );
  return exchanged === game ? game : { ...exchanged, passSelections: {} };
}

/** @param {any} game @param {string} playerId @param {unknown} cardId */
function playCard(game, playerId, cardId) {
  const seat = seatOf(game, playerId);
  if (seat < 0) return game;
  return playHeartCard(game, seat, String(cardId || ""));
}

/** @param {any} game @param {() => number} rng */
function nextRound(game, rng) {
  const next = startNextHeartsRound(game, rng);
  return next === game ? game : { ...next, passSelections: {} };
}

/**
 * One server step for the host's browser: gather a finished trick, or play for
 * the computer whose turn it is.
 * @param {any} game
 */
function computerStep(game) {
  if (game.phase === "collecting") return collectHeartTrick(game);
  if (game.phase !== "playing") return game;
  const seat = game.currentPlayerIndex;
  if (!game.players[seat]?.isComputer) return game;
  const card = chooseBotHeartCard(game, seat);
  return card ? playHeartCard(game, seat, card.id) : game;
}

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function heartsView(game, viewerId) {
  if (game.phase === "lobby") return game;
  const viewer = seatOf(game, viewerId);
  return {
    ...game,
    kitty: [],
    kittyCount: game.kitty.length,
    selectedPass: [],
    passSelections: undefined,
    viewerIndex: viewer,
    myPass: game.passSelections?.[viewer] ?? null,
    players: game.players.map((/** @type {any} */ player, /** @type {number} */ index) => ({
      ...player,
      hand: index === viewer ? player.hand : [],
      handCount: player.hand.length,
      captured: [],
      capturedCount: player.captured.length,
      passReady: player.isComputer || Boolean(game.passSelections?.[index]),
    })),
  };
}

export const heartsAdapter = {
  label: "Hearts",
  createLobby: createHeartsLobby,
  addPlayer: addHeartsPlayer,
  view: heartsView,
  computerStep,
  actions: {
    setVariant: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => setVariant(game, String(args.variant || "")) },
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => start(game, rng) },
    nextRound: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => nextRound(game, rng) },
    passCards: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => passCards(game, playerId, args.cardIds) },
    playCard: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => playCard(game, playerId, args.cardId) },
  },
};
