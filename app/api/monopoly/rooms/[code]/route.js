import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { monopolyRoomStore } from "../../../../../lib/monopoly-room-store.js";

const handlers = createClientRoomRoute({
  store: monopolyRoomStore,
  label: "Monopoly",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
