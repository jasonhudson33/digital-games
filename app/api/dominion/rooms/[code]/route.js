import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { dominionRoomStore } from "../../../../../lib/dominion-room-store.js";

const handlers = createClientRoomRoute({
  store: dominionRoomStore,
  label: "Dominion",
  validate: (state) => state.game === "dominion",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
