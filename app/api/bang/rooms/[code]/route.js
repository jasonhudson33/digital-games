import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { bangRoomStore } from "../../../../../lib/bang-room-store.js";

const handlers = createClientRoomRoute({
  store: bangRoomStore,
  label: "BANG!",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
