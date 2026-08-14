import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const coverYourAssetsRoomStore = createSupabaseRoomStore({
  namespace: "cover-your-assets",
  memoryKey: "__coverYourAssetsRooms",
  missingSupabaseMessage:
    "Cover Your Assets rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
