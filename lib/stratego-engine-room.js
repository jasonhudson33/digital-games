import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { strategoAdapter } from "./stratego-room-adapter.js";
import { strategoRoomStore } from "./stratego-room-store.js";

export const strategoRoom = createEngineRoom({ store: strategoRoomStore, adapter: strategoAdapter });
export const strategoRoutes = createEngineRoomRoutes(strategoRoom);
