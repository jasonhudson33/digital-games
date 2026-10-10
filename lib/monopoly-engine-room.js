import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { monopolyAdapter } from "../monopoly/src/roomAdapter";
import { monopolyRoomStore } from "./monopoly-room-store.js";

export const monopolyRoom = createEngineRoom({ store: monopolyRoomStore, adapter: monopolyAdapter });
export const monopolyRoutes = createEngineRoomRoutes(monopolyRoom);
