import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "skull-king",
  memoryKey: "__skullKingRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using Skull King rooms.",
});

export const saveSkullKingRoom = (room) => store.save(room);
export const loadSkullKingRoom = (roomCode) => store.load(roomCode);
export const skullKingRoomExists = (roomCode) => store.exists(roomCode);
