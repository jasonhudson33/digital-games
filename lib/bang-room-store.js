import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const bangRoomStore = createSupabaseRoomStore({
  namespace: "bang",
  memoryKey: "__bangRooms",
  missingSupabaseMessage: "BANG! rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
