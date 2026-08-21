import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { viticultureRoomStore } from "../../../../../lib/viticulture-room-store.js";

const handlers = createClientRoomRoute({
  store: viticultureRoomStore,
  label: "Viticulture",
  validate: (state) => state.game === "viticulture",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
