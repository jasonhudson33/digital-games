import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const flip7RoomStore = createSupabaseRoomStore({
  namespace: "flip-7",
  memoryKey: "__flip7Rooms",
  missingSupabaseMessage: "Flip 7 rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
