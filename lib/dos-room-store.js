import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const dosRoomStore = createSupabaseRoomStore({
  namespace: "dos",
  memoryKey: "__dosRooms",
  missingSupabaseMessage: "DOS rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
