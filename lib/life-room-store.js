import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const lifeRoomStore = createSupabaseRoomStore({
  namespace: "life",
  memoryKey: "__lifeRooms",
  missingSupabaseMessage: "Life rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
