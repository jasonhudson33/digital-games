import { createClient } from "redis";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;
const redisClientState = globalThis.__digitalGamesRedisClientState || { promise: null };
globalThis.__digitalGamesRedisClientState = redisClientState;

export function createRedisRoomStore({
  namespace,
  memoryKey,
  missingRedisMessage,
  ttlSeconds = DEFAULT_TTL_SECONDS,
}) {
  const rooms = globalThis[memoryKey] || new Map();
  globalThis[memoryKey] = rooms;
  const roomKey = (roomCode) => `${namespace}:room:${String(roomCode || "").toUpperCase()}`;

  return {
    async save(room) {
      ensureStorageAvailable(missingRedisMessage);
      const key = roomKey(room.roomCode);
      const payload = JSON.stringify(room);
      if (process.env.REDIS_URL) {
        await (await getRedisClient()).set(key, payload, { EX: ttlSeconds });
        return;
      }
      rooms.set(key, payload);
    },

    async load(roomCode) {
      ensureStorageAvailable(missingRedisMessage);
      const key = roomKey(roomCode);
      const payload = process.env.REDIS_URL
        ? await (await getRedisClient()).get(key)
        : rooms.get(key);
      return payload ? JSON.parse(payload) : null;
    },

    async exists(roomCode) {
      return (await this.load(roomCode)) !== null;
    },
  };
}

function ensureStorageAvailable(message) {
  if (process.env.VERCEL && !process.env.REDIS_URL) throw new Error(message);
}

async function getRedisClient() {
  if (!redisClientState.promise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => console.error("Redis error", error));
    redisClientState.promise = client.connect().then(() => client);
  }
  return redisClientState.promise;
}
