import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { ticketToRideAdapter } from "./ticket-to-ride-room-adapter.js";
import { ticketToRideRoomStore } from "./ticket-to-ride-room-store.js";

export const ticketToRideRoom = createEngineRoom({ store: ticketToRideRoomStore, adapter: ticketToRideAdapter });
export const ticketToRideRoutes = createEngineRoomRoutes(ticketToRideRoom);
