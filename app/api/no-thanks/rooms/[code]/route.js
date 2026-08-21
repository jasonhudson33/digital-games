import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { noThanksRoomStore } from "../../../../../lib/no-thanks-room-store.js";

const handlers = createClientRoomRoute({
  store: noThanksRoomStore,
  label: "No Thanks!",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
