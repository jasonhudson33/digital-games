import { createClient } from "redis";

const TTL_SECONDS = 60 * 60 * 24;
const memoryRooms = globalThis.__scumRooms || new Map();
globalThis.__scumRooms = memoryRooms;
let redisClientPromise = null;

export async function saveScumRoom(room) {
  ensureRoomStorage();
  const key = roomKey(room.roomCode);
  const payload = JSON.stringify(room);
  if (shouldUseRedis()) {
    await (await getRedisClient()).set(key, payload, { EX: TTL_SECONDS });
    return;
  }
  memoryRooms.set(key, payload);
}

export async function loadScumRoom(roomCode) {
  ensureRoomStorage();
  const payload = shouldUseRedis()
    ? await (await getRedisClient()).get(roomKey(roomCode))
    : memoryRooms.get(roomKey(roomCode));
  return payload ? JSON.parse(payload) : null;
}

export async function scumRoomExists(roomCode) {
  return (await loadScumRoom(roomCode)) !== null;
}

function roomKey(roomCode) {
  return `scum:room:${String(roomCode || "").toUpperCase()}`;
}

function shouldUseRedis() {
  return Boolean(process.env.REDIS_URL);
}

function ensureRoomStorage() {
  if (process.env.VERCEL && !process.env.REDIS_URL) {
    throw new Error("Set REDIS_URL in Vercel before using Scum rooms.");
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
