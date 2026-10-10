import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { monopolyRoomStore } from "../../../../../lib/monopoly-room-store.js";

const handlers = createClientRoomRoute({
  store: monopolyRoomStore,
  label: "Monopoly",
  // Uses its own browser-side Supabase tables; seat tokens are not wired in yet.
  seatAccess: false,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
