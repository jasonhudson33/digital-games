import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { camelUpAdapter } from "./camel-up-room-adapter.js";
import { camelUpRoomStore } from "./camel-up-room-store.js";

export const camelUpRoom = createEngineRoom({ store: camelUpRoomStore, adapter: camelUpAdapter });
export const camelUpRoutes = createEngineRoomRoutes(camelUpRoom);
