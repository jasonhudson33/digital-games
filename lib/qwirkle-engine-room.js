import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { qwirkleAdapter } from "./qwirkle-room-adapter.js";
import { qwirkleRoomStore } from "./qwirkle-room-store.js";

export const qwirkleRoom = createEngineRoom({ store: qwirkleRoomStore, adapter: qwirkleAdapter });
export const qwirkleRoutes = createEngineRoomRoutes(qwirkleRoom);
