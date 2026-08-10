import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "scum",
  memoryKey: "__scumRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using Scum rooms.",
});

export const saveScumRoom = (room) => store.save(room);
export const loadScumRoom = (roomCode) => store.load(roomCode);
export const scumRoomExists = (roomCode) => store.exists(roomCode);
