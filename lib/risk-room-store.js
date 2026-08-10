import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const riskRoomStore = createSupabaseRoomStore({
  namespace: "risk",
  memoryKey: "__riskRooms",
  missingSupabaseMessage:
    "Risk rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
