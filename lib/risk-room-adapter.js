import {
  PLAYER_STYLES,
  advancePhase,
  attackTerritory,
  createRiskGameFromLobby,
  fortifyTerritory,
  placeReinforcement,
  resolveConquestMove,
  runComputerTurn,
  tradeCards,
} from "./risk.js";

/**
 * Risk on the server.
 *
 * risk.js has no lobby (the browser used to build and edit it) and most of its
 * functions act on the current player without being told who is asking, so this
 * adapter supplies the lobby and refuses any in-game action from a seat that
 * does not hold the turn. Dice come from the server: only `attackDice` is read
 * from a request, never an rng. Hidden from other seats: territory cards.
 * Hidden from everyone: the card deck and discard pile. The map is public.
 */

export const RISK_MIN_COMMANDERS = 2;
export const RISK_MAX_COMMANDERS = 6;

/** @param {unknown} name */
const cleanName = (name) => String(name || "").trim().replace(/\s+/g, " ").slice(0, 24) || "Commander";

/** @param {any[]} players */
function freeStyle(players) {
  const used = new Set(players.map((player) => player.color));
  return PLAYER_STYLES.find((style) => !used.has(style.color)) ?? PLAYER_STYLES[0];
}

/**
 * @param {{ id: string, name?: string }} entrant
 * @param {any} style
 * @param {boolean} [isBot]
 */
function commander(entrant, style, isBot = false) {
  return { id: entrant.id, name: cleanName(entrant.name), color: style.color, colorName: style.name, isBot, cards: [] };
}

/**
 * @param {{ id: string, name?: string }} host
 * @param {string} roomCode
 */
export function createLobby(host, roomCode) {
  const first = commander(host, PLAYER_STYLES[0]);
  const now = Date.now();
  return {
    roomCode,
    hostId: first.id,
    phase: "lobby",
    cardTradeMode: "progressive",
    players: [first],
    log: [`${first.name} created room ${roomCode}.`],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * @param {any} game
 * @param {{ id: string, name?: string }} player
 */
export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= RISK_MAX_COMMANDERS || game.players.some((/** @type {any} */ item) => item.id === player.id)) return game;
  const next = commander(player, freeStyle(game.players));
  return { ...game, players: [...game.players, next], log: [`${next.name} joined the room.`, ...game.log].slice(0, 40) };
}

/**
 * @param {any} game
 * @param {string} viewerId
 */
export function riskView(game, viewerId) {
  return {
    ...game,
    deck: [],
    deckCount: (game.deck || []).length,
    discard: [],
    discardCount: (game.discard || []).length,
    players: game.players.map((/** @type {any} */ player) => ({
      ...player,
      cards: player.id === viewerId ? player.cards || [] : [],
      cardCount: (player.cards || []).length,
    })),
  };
}

/**
 * Run `act` only when the acting seat holds the turn of a started game.
 * @param {(game: any, context: any) => any} act
 */
const onTurn = (act) => (/** @type {any} */ game, /** @type {any} */ context) =>
  game.phase !== "lobby" && game.players[game.currentPlayerIndex]?.id === context.playerId ? act(game, context) : game;

/** @param {unknown} value */
const territory = (value) => String(value || "");

export const riskAdapter = {
  label: "Risk",
  createLobby,
  addPlayer,
  view: riskView,
  // A computer takes its whole turn in one step, as it did in the browser.
  computerStep: runComputerTurn,
  actions: {
    addComputer: {
      host: true,
      run: (/** @type {any} */ game) => {
        if (game.phase !== "lobby" || game.players.length >= RISK_MAX_COMMANDERS) return game;
        const number = game.players.filter((/** @type {any} */ player) => player.isBot).length + 1;
        const computer = commander({ id: `computer-${Date.now()}-${number}`, name: `Computer ${number}` }, freeStyle(game.players), true);
        return { ...game, players: [...game.players, computer], log: [`${computer.name} joined the room.`, ...game.log].slice(0, 40) };
      },
    },
    removeComputer: {
      host: true,
      run: (/** @type {any} */ game, /** @type {any} */ { args }) => {
        const target = game.players.find((/** @type {any} */ player) => player.id === String(args.playerId || "") && player.isBot);
        if (game.phase !== "lobby" || !target) return game;
        return { ...game, players: game.players.filter((/** @type {any} */ player) => player.id !== target.id) };
      },
    },
    color: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const style = PLAYER_STYLES.find((candidate) => candidate.color === String(args.color || ""));
        if (game.phase !== "lobby" || !style || game.players.some((/** @type {any} */ player) => player.id !== playerId && player.color === style.color)) return game;
        return { ...game, players: game.players.map((/** @type {any} */ player) => (player.id === playerId ? { ...player, color: style.color, colorName: style.name } : player)) };
      },
    },
    tradeMode: {
      host: true,
      run: (/** @type {any} */ game, /** @type {any} */ { args }) =>
        game.phase === "lobby" && ["normal", "progressive"].includes(String(args.mode)) ? { ...game, cardTradeMode: String(args.mode) } : game,
    },
    start: {
      host: true,
      run: (/** @type {any} */ game, /** @type {any} */ { rng }) => (game.phase === "lobby" ? createRiskGameFromLobby(game, rng) : game),
    },
    restart: {
      host: true,
      run: (/** @type {any} */ game) => {
        if (game.phase === "lobby") return game;
        const host = game.players.find((/** @type {any} */ player) => player.id === game.hostId);
        const lobby = createLobby({ id: game.hostId, name: host?.name }, game.roomCode);
        return {
          ...lobby,
          createdAt: game.createdAt ?? lobby.createdAt,
          cardTradeMode: game.cardTradeMode ?? "progressive",
          players: game.players.map((/** @type {any} */ player) => ({ ...player, cards: [] })),
          log: ["The room is ready for another campaign."],
        };
      },
    },
    reinforce: { run: onTurn((game, { args }) => placeReinforcement(game, territory(args.territoryId), Number(args.count))) },
    trade: { run: onTurn((game, { playerId }) => tradeCards(game, playerId)) },
    attack: {
      run: onTurn((game, { args, rng }) =>
        attackTerritory(game, territory(args.from), territory(args.to), {
          rng,
          ...(args.attackDice === undefined ? {} : { attackDice: Number(args.attackDice) }),
        })),
    },
    conquestMove: { run: onTurn((game, { args }) => resolveConquestMove(game, Number(args.count))) },
    advance: { run: onTurn((game) => advancePhase(game)) },
    fortify: { run: onTurn((game, { args }) => fortifyTerritory(game, territory(args.from), territory(args.to), Number(args.count))) },
  },
};
