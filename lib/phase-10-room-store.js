import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const phase10RoomStore = createSupabaseRoomStore({
  namespace: "phase-10",
  memoryKey: "__phase10Rooms",
  missingSupabaseMessage: "Phase 10 rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
