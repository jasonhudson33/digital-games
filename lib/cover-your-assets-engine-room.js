import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { coverYourAssetsAdapter } from "./cover-your-assets-room-adapter.js";
import { coverYourAssetsRoomStore } from "./cover-your-assets-room-store.js";

export const coverYourAssetsRoom = createEngineRoom({ store: coverYourAssetsRoomStore, adapter: coverYourAssetsAdapter });
export const coverYourAssetsRoutes = createEngineRoomRoutes(coverYourAssetsRoom);
