import { createClient } from "@supabase/supabase-js";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;
const ROOM_TABLE = "server_game_rooms";

/**
 * Optimistic concurrency for the server-authoritative rooms.
 *
 * Every action used to load the room, mutate it, and save unconditionally, so
 * two requests that overlapped both wrote a full room built from the same
 * starting state and the second silently erased the first. Two players claiming
 * the last free seat both passed the `if (seat.token)` check; a play and a pass
 * landing together lost one of them. The client-authoritative routes have sent
 * `expectedUpdatedAt` and answered 409 all along — the token-based games, which
 * are the ones holding private hands, had no equivalent.
 *
 * The expected version rides on the room object itself under a non-enumerable
 * key, so it survives the load → mutate → save round trip without appearing in
 * JSON, in a spread, or in any response body — and none of the ~80 action
 * functions across the seven room modules needed a new parameter.
 */
const VERSION_KEY = "__roomVersion";

export class RoomConflictError extends Error {
  constructor() {
    super("The room changed while this move was being saved.");
    this.name = "RoomConflictError";
  }
}

/** @param {unknown} error */
export const isRoomConflict = (error) => error instanceof RoomConflictError;

/**
 * @template {object} T
 * @param {T} state
 * @param {number} version
 * @returns {T}
 */
function stampVersion(state, version) {
  Object.defineProperty(state, VERSION_KEY, {
    value: version,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return state;
}

/**
 * Carry the version from the room as loaded onto the replacement about to be
 * written. The client-authoritative routes accept a whole new state object over
 * the wire, so it has no version of its own; without this the store would read
 * it as a brand-new room and try to insert.
 */
/**
 * @template {object} T
 * @param {T} next
 * @param {any} current
 * @returns {T}
 */
export function adoptVersion(next, current) {
  const version = versionOf(current);
  return version === null ? next : stampVersion(next, version);
}

/** The version a room was loaded at, or null for one that has never been saved. */
/**
 * @param {any} room
 * @returns {number | null}
 */
export function versionOf(room) {
  const version = room?.[VERSION_KEY];
  return typeof version === "number" ? version : null;
}
/** @type {{ lastRunAt: number }} */
const cleanupState = /** @type {any} */ (globalThis).__digitalGamesSupabaseRoomCleanup || { lastRunAt: 0 };
/** @type {any} */ (globalThis).__digitalGamesSupabaseRoomCleanup = cleanupState;

/**
 * @param {Object} options
 * @param {string} options.namespace
 * @param {string} options.memoryKey
 * @param {string} [options.missingSupabaseMessage]
 * @param {number} [options.ttlSeconds]
 * @param {Function} [options.supabaseClientFactory]
 * @param {Record<string, string | undefined>} [options.environment]
 * @param {() => number} [options.now]
 */
export function createSupabaseRoomStore({
  namespace,
  memoryKey,
  missingSupabaseMessage,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  supabaseClientFactory = createClient,
  environment = process.env,
  now = () => Date.now(),
}) {
  const globals = /** @type {Record<string, any>} */ (/** @type {any} */ (globalThis));
  /** @type {Map<string, { state: any, version: number, expiresAt: number }>} */
  const rooms = globals[memoryKey] || new Map();
  globals[memoryKey] = rooms;
  /** @type {any} */
  let client;

  /** @param {unknown} roomCode */
  const normalizeCode = (roomCode) => String(roomCode || "").toUpperCase();
  const getConfiguration = () => ({
    url:
      environment.SUPABASE_URL ||
      environment.NEXT_PUBLIC_SUPABASE_URL ||
      environment.NEXT_PUBLIC_VITE_SUPABASE_URL,
    serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
  });

  const getClient = () => {
    if (client) return client;
    const { url, serviceRoleKey } = getConfiguration();
    client = supabaseClientFactory(String(url), String(serviceRoleKey), {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    return client;
  };

  /** @param {string} roomCode */
  const load = async (roomCode) => {
    const storage = getStorageMode();
    const code = normalizeCode(roomCode);
    const currentTime = now();

    if (storage === "memory") {
      const entry = rooms.get(code);
      if (!entry) return null;
      if (entry.expiresAt <= currentTime) {
        rooms.delete(code);
        return null;
      }
      return stampVersion(cloneJson(entry.state), entry.version ?? 0);
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from(ROOM_TABLE)
      .select("state, expires_at, version")
      .eq("game", namespace)
      .eq("code", code)
      .maybeSingle();
    if (error) throw roomStorageError(error);
    if (!data) return null;

    if (new Date(data.expires_at).getTime() <= currentTime) {
      const { error: deleteError } = await supabase
        .from(ROOM_TABLE)
        .delete()
        .eq("game", namespace)
        .eq("code", code);
      if (deleteError) console.error("Could not remove an expired game room", deleteError);
      return null;
    }

    return stampVersion(cloneJson(data.state), Number(data.version ?? 0));
  };

  function getStorageMode() {
    const { url, serviceRoleKey } = getConfiguration();
    if (url && serviceRoleKey) return "supabase";
    if (environment.VERCEL) {
      throw new Error(
        missingSupabaseMessage ||
          "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using room mode.",
      );
    }
    return "memory";
  }

  return {
    /**
     * Persist a room, refusing the write if someone else has changed it since
     * it was loaded. Throws RoomConflictError, which lib/api.js retries.
     */
    /** @param {any} room */
    async save(room) {
      const storage = getStorageMode();
      const code = normalizeCode(room.roomCode);
      const state = cloneJson(room);
      const expected = versionOf(room);
      const expiresAt = new Date(now() + ttlSeconds * 1000);

      if (storage === "memory") {
        const current = rooms.get(code);
        const live = current && current.expiresAt > now() ? current : null;
        if ((live?.version ?? null) !== expected) throw new RoomConflictError();
        const version = (expected ?? -1) + 1;
        rooms.set(code, { state, version, expiresAt: expiresAt.getTime() });
        stampVersion(room, version);
        return;
      }

      const supabase = getClient();
      const row = {
        state,
        updated_at: new Date(now()).toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      if (expected === null) {
        // A room nobody has stored yet. The primary key turns a simultaneous
        // create on the same code into a conflict rather than a silent clobber.
        const { error } = await supabase
          .from(ROOM_TABLE)
          .insert({ game: namespace, code, version: 0, ...row });
        if (error) {
          if (error.code === "23505") throw new RoomConflictError();
          throw roomStorageError(error);
        }
        stampVersion(room, 0);
      } else {
        const { data, error } = await supabase
          .from(ROOM_TABLE)
          .update({ version: expected + 1, ...row })
          .eq("game", namespace)
          .eq("code", code)
          .eq("version", expected)
          .select("version");
        if (error) throw roomStorageError(error);
        // No row matched: another writer moved the version on first.
        if (!data || data.length === 0) throw new RoomConflictError();
        stampVersion(room, expected + 1);
      }

      await cleanExpiredRoomsOccasionally(supabase, now());
    },

    load,

    /** @param {string} roomCode */
    async exists(roomCode) {
      return (await load(roomCode)) !== null;
    },
  };
}

/**
 * @param {any} supabase
 * @param {number} currentTime
 */
async function cleanExpiredRoomsOccasionally(supabase, currentTime) {
  const hour = 60 * 60 * 1000;
  if (currentTime - cleanupState.lastRunAt < hour) return;
  cleanupState.lastRunAt = currentTime;

  const { error } = await supabase
    .from(ROOM_TABLE)
    .delete()
    .lt("expires_at", new Date(currentTime).toISOString());
  if (error) {
    cleanupState.lastRunAt = 0;
    console.error("Could not clean up expired game rooms", error);
  }
}

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/** @param {any} error */
function roomStorageError(error) {
  const detail = error?.message ? ` ${error.message}` : "";
  return new Error(`Could not access Supabase room storage.${detail}`);
}
