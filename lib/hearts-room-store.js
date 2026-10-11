import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const heartsRoomStore = createSupabaseRoomStore({
  namespace: "hearts",
  memoryKey: "__heartsRooms",
  missingSupabaseMessage: "Hearts rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
