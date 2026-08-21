import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const viticultureRoomStore = createSupabaseRoomStore({
  namespace: "viticulture",
  memoryKey: "__viticultureRooms",
  missingSupabaseMessage: "Viticulture rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});

