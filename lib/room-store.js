import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "sevenup",
  memoryKey: "__sevenUpRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using Seven Up rooms.",
});

export const saveRoom = (room) => store.save(room);
export const loadRoom = (roomCode) => store.load(roomCode);
export const roomExists = (roomCode) => store.exists(roomCode);
