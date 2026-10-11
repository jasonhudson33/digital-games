import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { catanAdapter } from "./catan-room-adapter.js";
import { catanRoomStore } from "./catan-room-store.js";

export const catanRoom = createEngineRoom({ store: catanRoomStore, adapter: catanAdapter });
export const catanRoutes = createEngineRoomRoutes(catanRoom);
