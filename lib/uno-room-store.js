import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const unoRoomStore = createSupabaseRoomStore({
  namespace: "uno",
  memoryKey: "__unoRooms",
  missingSupabaseMessage: "UNO rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
