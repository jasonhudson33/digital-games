import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { flip7Adapter } from "./flip-7-room-adapter.js";
import { flip7RoomStore } from "./flip-7-room-store.js";

export const flip7Room = createEngineRoom({ store: flip7RoomStore, adapter: flip7Adapter });
export const flip7Routes = createEngineRoomRoutes(flip7Room);
