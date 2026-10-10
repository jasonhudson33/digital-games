import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { phase10Adapter } from "./phase-10-room-adapter.js";
import { phase10RoomStore } from "./phase-10-room-store.js";

export const phase10Room = createEngineRoom({ store: phase10RoomStore, adapter: phase10Adapter });
export const phase10Routes = createEngineRoomRoutes(phase10Room);
