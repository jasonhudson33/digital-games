import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { lifeAdapter } from "./life-room-adapter.js";
import { lifeRoomStore } from "./life-room-store.js";

export const lifeRoom = createEngineRoom({ store: lifeRoomStore, adapter: lifeAdapter });
export const lifeRoutes = createEngineRoomRoutes(lifeRoom);
