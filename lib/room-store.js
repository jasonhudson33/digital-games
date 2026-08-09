import { createRedisRoomStore } from "./redis-room-store.js";

const store = createRedisRoomStore({
  namespace: "sevenup",
  memoryKey: "__sevenUpRooms",
  missingRedisMessage:
    "Set REDIS_URL in Vercel before using room mode. Local memory storage is only for development.",
});

export const saveRoom = (room) => store.save(room);
export const loadRoom = (roomCode) => store.load(roomCode);
export const roomExists = (roomCode) => store.exists(roomCode);
