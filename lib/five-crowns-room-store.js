import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const fiveCrownsRoomStore = createSupabaseRoomStore({
  namespace: "five-crowns",
  memoryKey: "__fiveCrownsRooms",
  missingSupabaseMessage: "Five Crowns rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
