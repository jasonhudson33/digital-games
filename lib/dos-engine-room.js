import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { dosAdapter } from "./dos-room-adapter.js";
import { dosRoomStore } from "./dos-room-store.js";

export const dosRoom = createEngineRoom({ store: dosRoomStore, adapter: dosAdapter });
export const dosRoutes = createEngineRoomRoutes(dosRoom);
