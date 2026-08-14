import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const qwirkleRoomStore = createSupabaseRoomStore({
  namespace: "qwirkle",
  memoryKey: "__qwirkleRooms",
  missingSupabaseMessage: "Qwirkle rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
