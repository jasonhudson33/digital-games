import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "pinochle",
  memoryKey: "__pinochleRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before using Pinochle rooms.",
});

export const savePinochleRoom = (room) => store.save(room);
export const loadPinochleRoom = (roomCode) => store.load(roomCode);
export const pinochleRoomExists = (roomCode) => store.exists(roomCode);
