import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { phase10RoomStore } from "../../../../../lib/phase-10-room-store.js";

const handlers = createClientRoomRoute({
  store: phase10RoomStore,
  label: "Phase 10",
  validate: (state) => state.game === "phase-10",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
