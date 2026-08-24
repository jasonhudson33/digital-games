import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const strategoRoomStore = createSupabaseRoomStore({
  namespace: "stratego",
  memoryKey: "__strategoRooms",
  missingSupabaseMessage:
    "Stratego rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
