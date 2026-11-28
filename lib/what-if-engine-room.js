import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { whatIfAdapter } from "./what-if-room-adapter.js";
import { whatIfRoomStore } from "./what-if-room-store.js";

export const whatIfRoom = createEngineRoom({ store: whatIfRoomStore, adapter: whatIfAdapter });
export const whatIfRoutes = createEngineRoomRoutes(whatIfRoom);
