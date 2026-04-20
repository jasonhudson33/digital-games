import { createClient } from "redis";

const TTL_SECONDS = 60 * 60 * 24;

const memoryRooms = globalThis.__sevenUpRooms || new Map();
globalThis.__sevenUpRooms = memoryRooms;
let redisClientPromise = null;

export async function saveRoom(room) {
  ensureRoomStorage();
  const key = roomKey(room.roomCode);
  const payload = JSON.stringify(room);
  if (shouldUseRedis()) {
    const client = await getRedisClient();
    await client.set(key, payload, { EX: TTL_SECONDS });
    return;
  }
  memoryRooms.set(key, payload);
}

export async function loadRoom(roomCode) {
  ensureRoomStorage();
  const key = roomKey(roomCode);
  const payload = shouldUseRedis()
    ? await (await getRedisClient()).get(key)
    : memoryRooms.get(key);
  return payload ? JSON.parse(payload) : null;
}

export async function roomExists(roomCode) {
  return (await loadRoom(roomCode)) !== null;
}

function roomKey(roomCode) {
  return `sevenup:room:${roomCode.toUpperCase()}`;
}

function shouldUseRedis() {
  return Boolean(process.env.REDIS_URL);
}

function ensureRoomStorage() {
  if (process.env.VERCEL && !process.env.REDIS_URL) {
    throw new Error(
      "Set REDIS_URL in Vercel before using room mode. Local memory storage is only for development."
    );
  }
}

async function getRedisClient() {
  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => {
      console.error("Redis error", error);
    });
    redisClientPromise = client.connect().then(() => client);
  }
  return redisClientPromise;
}
