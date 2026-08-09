import { createClient } from "redis";

const TTL_SECONDS = 60 * 60 * 24;
const memoryRooms = globalThis.__handFootRooms || new Map();
globalThis.__handFootRooms = memoryRooms;
let redisClientPromise = null;

export async function saveHandFootRoom(room) {
  ensureRoomStorage();
  const payload = JSON.stringify(room);
  if (shouldUseRedis()) {
    await (await getRedisClient()).set(roomKey(room.roomCode), payload, { EX: TTL_SECONDS });
    return;
  }
  memoryRooms.set(roomKey(room.roomCode), payload);
}

export async function loadHandFootRoom(roomCode) {
  ensureRoomStorage();
  const payload = shouldUseRedis()
    ? await (await getRedisClient()).get(roomKey(roomCode))
    : memoryRooms.get(roomKey(roomCode));
  return payload ? JSON.parse(payload) : null;
}

export async function handFootRoomExists(roomCode) {
  return (await loadHandFootRoom(roomCode)) !== null;
}

function roomKey(roomCode) {
  return `hand-foot:room:${String(roomCode || "").toUpperCase()}`;
}

function shouldUseRedis() {
  return Boolean(process.env.REDIS_URL);
}

function ensureRoomStorage() {
  if (process.env.VERCEL && !process.env.REDIS_URL) {
    throw new Error("Set REDIS_URL in Vercel before using Hand and Foot rooms.");
  }
}

async function getRedisClient() {
  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => console.error("Redis error", error));
    redisClientPromise = client.connect().then(() => client);
  }
  return redisClientPromise;
}
