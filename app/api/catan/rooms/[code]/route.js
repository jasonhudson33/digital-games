import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { catanRoomStore } from "../../../../../lib/catan-room-store.js";

const handlers = createClientRoomRoute({
  store: catanRoomStore,
  label: "Catan",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
