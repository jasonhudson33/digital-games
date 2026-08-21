import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { ticketToRideRoomStore } from "../../../../../lib/ticket-to-ride-room-store.js";

const handlers = createClientRoomRoute({
  store: ticketToRideRoomStore,
  label: "Ticket to Ride",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
