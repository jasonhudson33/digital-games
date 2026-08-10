import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "hand-foot",
  memoryKey: "__handFootRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using Hand and Foot rooms.",
});

export const saveHandFootRoom = (room) => store.save(room);
export const loadHandFootRoom = (roomCode) => store.load(roomCode);
export const handFootRoomExists = (roomCode) => store.exists(roomCode);
