import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { unoAdapter } from "./uno-room-adapter.js";
import { unoRoomStore } from "./uno-room-store.js";

export const unoRoom = createEngineRoom({ store: unoRoomStore, adapter: unoAdapter });
export const unoRoutes = createEngineRoomRoutes(unoRoom);
