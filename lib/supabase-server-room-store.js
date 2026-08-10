import { createClient } from "@supabase/supabase-js";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;
const ROOM_TABLE = "server_game_rooms";
const cleanupState = globalThis.__digitalGamesSupabaseRoomCleanup || { lastRunAt: 0 };
globalThis.__digitalGamesSupabaseRoomCleanup = cleanupState;

export function createSupabaseRoomStore({
  namespace,
  memoryKey,
  missingSupabaseMessage,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  supabaseClientFactory = createClient,
  environment = process.env,
  now = () => Date.now(),
}) {
  const rooms = globalThis[memoryKey] || new Map();
  globalThis[memoryKey] = rooms;
  let client;

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
    client = supabaseClientFactory(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    return client;
  };

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
      return cloneJson(entry.state);
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from(ROOM_TABLE)
      .select("state, expires_at")
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

    return cloneJson(data.state);
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
    async save(room) {
      const storage = getStorageMode();
      const code = normalizeCode(room.roomCode);
      const state = cloneJson(room);
      const expiresAt = new Date(now() + ttlSeconds * 1000);

      if (storage === "memory") {
        rooms.set(code, { state, expiresAt: expiresAt.getTime() });
        return;
      }

      const supabase = getClient();
      const { error } = await supabase.from(ROOM_TABLE).upsert(
        {
          game: namespace,
          code,
          state,
          updated_at: new Date(now()).toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "game,code" },
      );
      if (error) throw roomStorageError(error);
      await cleanExpiredRoomsOccasionally(supabase, now());
    },

    load,

    async exists(roomCode) {
      return (await load(roomCode)) !== null;
    },
  };
}

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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function roomStorageError(error) {
  const detail = error?.message ? ` ${error.message}` : "";
  return new Error(`Could not access Supabase room storage.${detail}`);
}
