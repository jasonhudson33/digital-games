import { SevenUpGame, chooseComputerMove } from "./game.js";

/**
 * 7-Up on the server: the rules in game.js behind the engine-room adapter (see
 * engine-room.js). The host takes the first seat, people join by code, and the
 * host adds computers in the lobby until the table has three to seven seats.
 *
 * The rules class keys everything by player name, so seat names are made unique
 * when a seat is added. The stored `game` is the class's own snapshot; a seat's
 * view replaces every other hand with a count, so a hand is only ever sent to
 * the seat that holds it.
 */

const MAX_SEATS = SevenUpGame.MAX_PLAYERS;
const MIN_SEATS = SevenUpGame.MIN_PLAYERS;
const LOG_LIMIT = 12;
const COMPUTER_NAMES = ["Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova"];

/** @param {any[]} players @param {string} wanted */
function uniqueName(players, wanted) {
  const taken = new Set(players.map((player) => player.name));
  if (!taken.has(wanted)) return wanted;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${wanted} ${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${wanted} ${players.length + 1}`;
}

/**
 * @param {{ id: string, name: string }} host
 * @param {string} roomCode
 */
export function createSevenUpLobby(host, roomCode) {
  return {
    roomCode,
    hostId: host.id,
    phase: "lobby",
    dealerIndex: 0,
    players: [{ id: host.id, name: host.name, isComputer: false }],
    game: null,
    log: [],
  };
}

/**
 * @param {any} game
 * @param {{ id: string, name: string }} player
 */
export function addSevenUpPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_SEATS) return game;
  return {
    ...game,
    players: [...game.players, { id: player.id, name: uniqueName(game.players, player.name), isComputer: false }],
  };
}

/** @param {any} game */
function addComputer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_SEATS) return game;
  const name = uniqueName(game.players, COMPUTER_NAMES.find((candidate) => !game.players.some((/** @type {any} */ p) => p.name === candidate)) ?? "Computer");
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

/**
 * @param {any} game
 * @param {number} dealerIndex
 * @param {() => number} rng
 */
function deal(game, dealerIndex, rng) {
  const names = game.players.map((/** @type {any} */ player) => player.name);
  const dealt = new SevenUpGame(names, dealerIndex, rng());
  return {
    ...game,
    phase: "playing",
    dealerIndex,
    game: dealt.snapshot(),
    log: [`${dealt.currentPlayer} leads.`],
  };
}

/** @param {any} game @param {() => number} rng */
function start(game, rng) {
  if (game.phase !== "lobby" || game.players.length < MIN_SEATS || game.players.length > MAX_SEATS) return game;
  return deal(game, Math.floor(rng() * game.players.length), rng);
}

/** @param {any} game @param {() => number} rng */
function dealAgain(game, rng) {
  if (game.phase !== "finished") return game;
  return deal(game, (game.dealerIndex + 1) % game.players.length, rng);
}

/**
 * Apply one turn for the named seat, or return the room unchanged when the rules
 * refuse it. A pass is `card === null` and is only legal with no legal card.
 * @param {any} room
 * @param {string} name
 * @param {{ suit: string, rank: number } | null} card
 */
function takeTurn(room, name, card) {
  if (room.phase !== "playing") return room;
  const rules = SevenUpGame.fromSnapshot(room.game);
  if (rules.currentPlayer !== name) return room;
  let message;
  try {
    message = rules.playTurn(card);
  } catch {
    return room;
  }
  return {
    ...room,
    phase: rules.winner ? "finished" : "playing",
    game: rules.snapshot(),
    log: [message, ...room.log].slice(0, LOG_LIMIT),
  };
}

/**
 * @param {any} game
 * @param {string} playerId
 * @param {any} args
 */
function playCard(game, playerId, args) {
  const seat = game.players.find((/** @type {any} */ player) => player.id === playerId);
  const card = args?.card;
  if (!seat || !card || !Number.isInteger(card.rank) || typeof card.suit !== "string") return game;
  return takeTurn(game, seat.name, { suit: card.suit, rank: card.rank });
}

/** @param {any} game @param {string} playerId */
function pass(game, playerId) {
  const seat = game.players.find((/** @type {any} */ player) => player.id === playerId);
  return seat ? takeTurn(game, seat.name, null) : game;
}

/** One computer turn: its best legal card, or a pass when it has none. @param {any} room */
function computerStep(room) {
  if (room.phase !== "playing") return room;
  const rules = SevenUpGame.fromSnapshot(room.game);
  const seat = room.players.find((/** @type {any} */ player) => player.name === rules.currentPlayer);
  if (!seat?.isComputer) return room;
  const legal = rules.legalMoves();
  const hand = rules.handFor(rules.currentPlayer);
  return takeTurn(room, seat.name, legal.length ? chooseComputerMove(legal, hand) : null);
}

/**
 * @param {any} room
 * @param {string} viewerId
 */
export function sevenUpView(room, viewerId) {
  if (room.phase === "lobby") return room;
  const snapshot = room.game;
  const viewer = room.players.find((/** @type {any} */ player) => player.id === viewerId);
  const rules = SevenUpGame.fromSnapshot(snapshot);
  const legalMoves = viewer && rules.currentPlayer === viewer.name && !rules.winner ? rules.legalMoves(viewer.name) : [];
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    phase: room.phase,
    dealerIndex: room.dealerIndex,
    log: room.log,
    tableau: snapshot.tableau,
    turnCount: snapshot.turnsTaken,
    currentPlayerIndex: snapshot.currentPlayerIndex,
    winnerName: snapshot.winner,
    viewerIndex: viewer ? room.players.indexOf(viewer) : -1,
    hand: viewer ? snapshot.hands[viewer.name] : [],
    legalMoves,
    players: room.players.map((/** @type {any} */ player) => ({
      ...player,
      handCount: snapshot.hands[player.name].length,
    })),
  };
}

export const sevenUpAdapter = {
  label: "7-Up",
  createLobby: createSevenUpLobby,
  addPlayer: addSevenUpPlayer,
  view: sevenUpView,
  computerStep,
  actions: {
    addComputer: { host: true, run: (/** @type {any} */ game) => addComputer(game) },
    removeComputer: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { args }) => removeComputer(game, String(args.playerId || "")) },
    start: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => start(game, rng) },
    dealAgain: { host: true, run: (/** @type {any} */ game, /** @type {any} */ { rng }) => dealAgain(game, rng) },
    play: { run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => playCard(game, playerId, args) },
    pass: { run: (/** @type {any} */ game, /** @type {any} */ { playerId }) => pass(game, playerId) },
  },
};
