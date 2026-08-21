import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { sequenceRoomStore } from "../../../../../lib/sequence-room-store.js";

const handlers = createClientRoomRoute({
  store: sequenceRoomStore,
  label: "Sequence",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
