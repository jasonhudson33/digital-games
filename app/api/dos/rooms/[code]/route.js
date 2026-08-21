import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { dosRoomStore } from "../../../../../lib/dos-room-store.js";

const handlers = createClientRoomRoute({
  store: dosRoomStore,
  label: "DOS",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
