import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { qwirkleRoomStore } from "../../../../../lib/qwirkle-room-store.js";

const handlers = createClientRoomRoute({
  store: qwirkleRoomStore,
  label: "Qwirkle",
  validate: (state) => state.game === "qwirkle",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
