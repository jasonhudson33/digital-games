import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { sequenceAdapter } from "./sequence-room-adapter.js";
import { sequenceRoomStore } from "./sequence-room-store.js";

export const sequenceRoom = createEngineRoom({ store: sequenceRoomStore, adapter: sequenceAdapter });
export const sequenceRoutes = createEngineRoomRoutes(sequenceRoom);
