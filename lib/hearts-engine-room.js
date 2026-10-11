import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { heartsAdapter } from "./hearts-room-adapter.js";
import { heartsRoomStore } from "./hearts-room-store.js";

export const heartsRoom = createEngineRoom({ store: heartsRoomStore, adapter: heartsAdapter });
export const heartsRoutes = createEngineRoomRoutes(heartsRoom);
