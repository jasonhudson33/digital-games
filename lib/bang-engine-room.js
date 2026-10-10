import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { bangAdapter } from "./bang-room-adapter.js";
import { bangRoomStore } from "./bang-room-store.js";

export const bangRoom = createEngineRoom({ store: bangRoomStore, adapter: bangAdapter });
export const bangRoutes = createEngineRoomRoutes(bangRoom);
