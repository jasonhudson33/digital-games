import { createRedisRoomStore } from "./redis-room-store.js";

const store = createRedisRoomStore({
  namespace: "hand-foot",
  memoryKey: "__handFootRooms",
  missingRedisMessage: "Set REDIS_URL in Vercel before using Hand and Foot rooms.",
});

export const saveHandFootRoom = (room) => store.save(room);
export const loadHandFootRoom = (roomCode) => store.load(roomCode);
export const handFootRoomExists = (roomCode) => store.exists(roomCode);
