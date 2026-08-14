import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "killer-bunnies",
  memoryKey: "__killerBunniesRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using Killer Bunnies rooms.",
});

export const saveKillerBunniesRoom = (room) => store.save(room);
export const loadKillerBunniesRoom = (roomCode) => store.load(roomCode);
export const killerBunniesRoomExists = (roomCode) => store.exists(roomCode);
