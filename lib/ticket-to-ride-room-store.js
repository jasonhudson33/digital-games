import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

export const ticketToRideRoomStore = createSupabaseRoomStore({
  namespace: "ticket-to-ride",
  memoryKey: "__ticketToRideRooms",
  missingSupabaseMessage:
    "Ticket to Ride rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
});
