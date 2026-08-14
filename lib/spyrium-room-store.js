import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const spyriumRoomStore = createSupabaseRoomStore({
  namespace: "spyrium",
  memoryKey: "__spyriumRooms",
  missingSupabaseMessage: "Spyrium rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
