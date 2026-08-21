import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { splendorRoomStore } from "../../../../../lib/splendor-room-store.js";

const handlers = createClientRoomRoute({
  store: splendorRoomStore,
  label: "Splendor",
  validate: (state) => state.game === "splendor",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
