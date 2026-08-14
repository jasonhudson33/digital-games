import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const sequenceRoomStore = createSupabaseRoomStore({
  namespace: "sequence",
  memoryKey: "__sequenceRooms",
  missingSupabaseMessage:
    "Sequence rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
