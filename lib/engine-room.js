import { randomRoomCode, randomToken } from "./random.js";
import { adoptVersion } from "./supabase-server-room-store.js";
import { SEATS_KEY, addSeat, seatForToken } from "./room-seats.js";

/**
 * Rooms for games whose rules run on the server.
 *
 * The stored value is the engine's own game object plus two bookkeeping keys:
 * `engine` (marks the room as this format) and `__seats` (seat-token hashes,
 * see room-seats.js). Every move is a named action looked up in the game's
 * adapter; the acting seat comes from the token, never from the request body.
 * Responses are per-seat views built by the adapter, so one seat never
 * receives another's hand.
 *
 * Adapter shape:
 *   label            "UNO"
 *   createLobby      (host: {id, name, options?}, roomCode) => game
 *   acceptsOptions   true when createLobby and addPlayer read `options` (optional)
 *   addPlayer        (game, {id, name, options?}) => game  unchanged when not allowed
 *   actions          { [name]: { host?: boolean, run: (game, { playerId, args, rng }) => game } }
 *   computerStep     (game, rng) => game               unchanged when no computer is due
 *   view             (game, viewerId) => object        projection safe for that seat
 */

const ENGINE_MARK = 1;
const MAX_NAME = 24;

export class EngineRoomError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   */
  constructor(message, status = 400) {
    super(message);
    this.name = "EngineRoomError";
    this.status = status;
  }
}

/** Names an engine action may not use, whatever the adapter says. */
const RESERVED_ACTIONS = new Set(["join", "computerStep"]);

/**
 * @param {Object} options
 * @param {{ load: (code: string) => Promise<any>, save: (room: any) => Promise<void>, exists: (code: string) => Promise<boolean> }} options.store
 * @param {any} options.adapter
 * @param {() => number} [options.random]
 * @param {() => number} [options.now]
 */
export function createEngineRoom({ store, adapter, random = Math.random, now = () => Date.now() }) {
  for (const name of Object.keys(adapter.actions)) {
    if (RESERVED_ACTIONS.has(name)) throw new Error(`"${name}" is a reserved room action.`);
  }

  /** @param {unknown} code */
  const normalizeCode = (code) => String(code || "").trim().toUpperCase();

  /** @param {unknown} name */
  const cleanName = (name) => String(name || "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME) || "Player";

  /**
   * Adapter-defined create and join options (Monopoly's piece). Only an adapter
   * that sets `acceptsOptions` receives them, and only as a plain object, so a
   * request cannot slip data into another game's player records.
   * @param {any} options
   */
  function optionsFor(options) {
    const plain = options && typeof options === "object" && !Array.isArray(options);
    return adapter.acceptsOptions && plain ? { options } : {};
  }

  /** @param {string} code */
  async function loadRoom(code) {
    const room = await store.load(normalizeCode(code));
    if (!room) throw new EngineRoomError("Room not found.", 404);
    if (room.engine !== ENGINE_MARK) {
      throw new EngineRoomError(
        "This room was created before an update and cannot be resumed. Start a new room.",
        410,
      );
    }
    return room;
  }

  /** @param {any} room */
  function split(room) {
    const { engine: _engine, [SEATS_KEY]: seats, ...game } = room;
    return { game, seats };
  }

  /**
   * @param {any} previous the room as loaded, or null for a new room
   * @param {any} game
   * @param {Record<string, string>} seats
   */
  async function persist(previous, game, seats) {
    const updatedAt = Math.max(now(), Number(previous?.updatedAt || game.updatedAt || 0) + 1);
    const next = { ...game, engine: ENGINE_MARK, [SEATS_KEY]: seats, updatedAt };
    await store.save(previous ? adoptVersion(next, previous) : next);
    return { ...game, updatedAt };
  }

  /**
   * @param {any} game
   * @param {string} viewerId
   */
  function viewFor(game, viewerId) {
    return {
      ...adapter.view(game, viewerId),
      roomCode: game.roomCode,
      viewerId,
      updatedAt: game.updatedAt,
    };
  }

  /** @param {any} room @param {string | null | undefined} token */
  function requireSeat(room, token) {
    const playerId = seatForToken(room, token);
    if (!playerId) throw new EngineRoomError("You are not seated in this room.", 403);
    return playerId;
  }

  async function uniqueRoomCode() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const code = randomRoomCode(5);
      if (!(await store.exists(code))) return code;
    }
    throw new EngineRoomError("Could not create a unique room code. Try again.", 500);
  }

  return {
    normalizeCode,

    /** @param {{ name?: string, options?: any }} input */
    async create({ name, options }) {
      const roomCode = await uniqueRoomCode();
      const playerId = `player-${randomToken(12)}`;
      const lobby = adapter.createLobby({ id: playerId, name: cleanName(name), ...optionsFor(options) }, roomCode);
      const { seats, token } = addSeat({}, playerId);
      const game = await persist(null, lobby, seats);
      return { token, playerId, state: viewFor(game, playerId) };
    },

    /** @param {{ roomCode: string, name?: string, options?: any }} input */
    async join({ roomCode, name, options }) {
      const room = await loadRoom(roomCode);
      const { game, seats } = split(room);
      const playerId = `player-${randomToken(12)}`;
      const next = adapter.addPlayer(game, { id: playerId, name: cleanName(name), ...optionsFor(options) });
      if (next === game) throw new EngineRoomError("That room is full or has already started.");
      const added = addSeat(seats, playerId);
      const saved = await persist(room, next, added.seats);
      return { token: added.token, playerId, state: viewFor(saved, playerId) };
    },

    /** @param {{ roomCode: string, token?: string }} input */
    async get({ roomCode, token }) {
      const room = await loadRoom(roomCode);
      const playerId = requireSeat(room, token);
      const { game } = split(room);
      return { state: viewFor(game, playerId) };
    },

    /**
     * @param {{ roomCode: string, token?: string, action?: string, args?: any }} input
     */
    async act({ roomCode, token, action, args = {} }) {
      const room = await loadRoom(roomCode);
      const playerId = requireSeat(room, token);
      const { game, seats } = split(room);
      const name = typeof action === "string" ? action : "";
      if (!Object.hasOwn(adapter.actions, name)) throw new EngineRoomError("Unknown room action.");
      const entry = adapter.actions[name];
      if (entry.host && game.hostId !== playerId) throw new EngineRoomError("Only the host can do that.", 403);
      const next = entry.run(game, { playerId, args: args && typeof args === "object" ? args : {}, rng: random });
      if (!next || next === game) throw new EngineRoomError("That action is not available right now.");
      const saved = await persist(room, next, seats);
      return { state: viewFor(saved, playerId) };
    },

    /**
     * One computer move, host only. A call with no computer due changes nothing.
     * @param {{ roomCode: string, token?: string }} input
     */
    async computerStep({ roomCode, token }) {
      const room = await loadRoom(roomCode);
      const playerId = requireSeat(room, token);
      const { game, seats } = split(room);
      if (game.hostId !== playerId) throw new EngineRoomError("Only the host can do that.", 403);
      const next = adapter.computerStep(game, random);
      if (!next || next === game) return { state: viewFor(game, playerId) };
      const saved = await persist(room, next, seats);
      return { state: viewFor(saved, playerId) };
    },
  };
}
