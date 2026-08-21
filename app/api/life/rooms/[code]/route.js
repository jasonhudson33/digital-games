import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { lifeRoomStore } from "../../../../../lib/life-room-store.js";

const handlers = createClientRoomRoute({
  store: lifeRoomStore,
  label: "Life",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
