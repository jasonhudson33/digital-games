import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { fiveCrownsAdapter } from "./five-crowns-room-adapter.js";
import { fiveCrownsRoomStore } from "./five-crowns-room-store.js";

export const fiveCrownsRoom = createEngineRoom({ store: fiveCrownsRoomStore, adapter: fiveCrownsAdapter });
export const fiveCrownsRoutes = createEngineRoomRoutes(fiveCrownsRoom);
