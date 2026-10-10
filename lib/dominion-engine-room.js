import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { dominionAdapter } from "./dominion-room-adapter.js";
import { dominionRoomStore } from "./dominion-room-store.js";

export const dominionRoom = createEngineRoom({ store: dominionRoomStore, adapter: dominionAdapter });
export const dominionRoutes = createEngineRoomRoutes(dominionRoom);
