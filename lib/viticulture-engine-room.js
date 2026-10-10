import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { viticultureAdapter } from "./viticulture-room-adapter.js";
import { viticultureRoomStore } from "./viticulture-room-store.js";

export const viticultureRoom = createEngineRoom({ store: viticultureRoomStore, adapter: viticultureAdapter });
export const viticultureRoutes = createEngineRoomRoutes(viticultureRoom);
