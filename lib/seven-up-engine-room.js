import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { sevenUpAdapter } from "./seven-up-room-adapter.js";
import { sevenUpRoomStore } from "./seven-up-room-store.js";

export const sevenUpRoom = createEngineRoom({ store: sevenUpRoomStore, adapter: sevenUpAdapter });
export const sevenUpRoutes = createEngineRoomRoutes(sevenUpRoom);
