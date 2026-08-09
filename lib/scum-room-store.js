import { createRedisRoomStore } from "./redis-room-store.js";

const store = createRedisRoomStore({
  namespace: "scum",
  memoryKey: "__scumRooms",
  missingRedisMessage: "Set REDIS_URL in Vercel before using Scum rooms.",
});

export const saveScumRoom = (room) => store.save(room);
export const loadScumRoom = (roomCode) => store.load(roomCode);
export const scumRoomExists = (roomCode) => store.exists(roomCode);
