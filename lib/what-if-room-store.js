import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const whatIfRoomStore = createSupabaseRoomStore({
  namespace: "what-if",
  memoryKey: "__whatIfRooms",
  missingSupabaseMessage: "What If rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
