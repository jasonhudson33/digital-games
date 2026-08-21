import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { riskRoomStore } from "../../../../../lib/risk-room-store.js";

const handlers = createClientRoomRoute({
  store: riskRoomStore,
  label: "Risk",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
