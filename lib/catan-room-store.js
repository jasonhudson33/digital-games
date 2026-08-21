import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

/*
 * Catan rooms used to live in a bare `globalThis` Map (lib/local-room-route.js)
 * with no expiry and no persistence. On Vercel that meant two things: the Map
 * grew without bound inside a warm instance, and a room existed only on
 * whichever instance happened to serve the write — so players saw rooms appear
 * and vanish depending on which one answered. Every other game already used
 * this store, which expires rooms after 24 hours and cleans up opportunistically.
 */
export const catanRoomStore = createSupabaseRoomStore({
  namespace: "catan",
  memoryKey: "__catanRooms",
  missingSupabaseMessage:
    "Catan rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
