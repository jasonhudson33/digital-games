import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { catanRoomStore } from "../../../../../lib/catan-room-store.js";

const handlers = createClientRoomRoute({
  store: catanRoomStore,
  label: "Catan",
  // Uses its own browser-side Supabase tables; seat tokens are not wired in yet.
  seatAccess: false,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
