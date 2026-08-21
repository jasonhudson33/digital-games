import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { spyriumRoomStore } from "../../../../../lib/spyrium-room-store.js";

const handlers = createClientRoomRoute({
  store: spyriumRoomStore,
  label: "Spyrium",
  validate: (state) => state.game === "spyrium",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
