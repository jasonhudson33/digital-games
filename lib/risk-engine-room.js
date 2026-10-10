import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { riskAdapter } from "./risk-room-adapter.js";
import { riskRoomStore } from "./risk-room-store.js";

export const riskRoom = createEngineRoom({ store: riskRoomStore, adapter: riskAdapter });
export const riskRoutes = createEngineRoomRoutes(riskRoom);
