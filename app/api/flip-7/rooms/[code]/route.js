import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { flip7RoomStore } from "../../../../../lib/flip-7-room-store.js";

const handlers = createClientRoomRoute({
  store: flip7RoomStore,
  label: "Flip 7",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
