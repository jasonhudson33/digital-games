import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { unoRoomStore } from "../../../../../lib/uno-room-store.js";

const handlers = createClientRoomRoute({
  store: unoRoomStore,
  label: "UNO",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
