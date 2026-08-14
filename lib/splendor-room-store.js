import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const splendorRoomStore = createSupabaseRoomStore({
  namespace: "splendor",
  memoryKey: "__splendorRooms",
  missingSupabaseMessage: "Splendor rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
