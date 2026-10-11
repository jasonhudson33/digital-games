import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const camelUpRoomStore = createSupabaseRoomStore({
  namespace: "camel-up",
  memoryKey: "__camelUpRooms",
  missingSupabaseMessage: "Camel Up rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
