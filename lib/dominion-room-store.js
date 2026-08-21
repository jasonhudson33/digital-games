import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const dominionRoomStore = createSupabaseRoomStore({
  namespace: "dominion",
  memoryKey: "__dominionRooms",
  missingSupabaseMessage: "Dominion rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
