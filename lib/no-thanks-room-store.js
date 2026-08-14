import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const noThanksRoomStore = createSupabaseRoomStore({
  namespace: "no-thanks",
  memoryKey: "__noThanksRooms",
  missingSupabaseMessage: "No Thanks! rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
