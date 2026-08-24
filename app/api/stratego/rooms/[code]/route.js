import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { strategoRoomStore } from "../../../../../lib/stratego-room-store.js";

const handlers = createClientRoomRoute({
  store: strategoRoomStore,
  label: "Stratego",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
