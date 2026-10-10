import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { splendorAdapter } from "./splendor-room-adapter.js";
import { splendorRoomStore } from "./splendor-room-store.js";

export const splendorRoom = createEngineRoom({ store: splendorRoomStore, adapter: splendorAdapter });
export const splendorRoutes = createEngineRoomRoutes(splendorRoom);
