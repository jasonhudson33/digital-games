import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { fiveCrownsRoomStore } from "../../../../../lib/five-crowns-room-store.js";

const handlers = createClientRoomRoute({ store: fiveCrownsRoomStore, label: "Five Crowns" });
export const GET = handlers.GET;
export const PUT = handlers.PUT;
