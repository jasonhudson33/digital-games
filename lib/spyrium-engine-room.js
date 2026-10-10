import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { spyriumAdapter } from "./spyrium-room-adapter.js";
import { spyriumRoomStore } from "./spyrium-room-store.js";

export const spyriumRoom = createEngineRoom({ store: spyriumRoomStore, adapter: spyriumAdapter });
export const spyriumRoutes = createEngineRoomRoutes(spyriumRoom);
