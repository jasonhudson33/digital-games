import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const sevenUpRoomStore = createSupabaseRoomStore({
  namespace: "seven-up",
  memoryKey: "__sevenUpEngineRooms",
  missingSupabaseMessage: "7-Up rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
