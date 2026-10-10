import { createEngineRoom } from "./engine-room.js";
import { createEngineRoomRoutes } from "./engine-room-route.js";
import { noThanksAdapter } from "./no-thanks-room-adapter.js";
import { noThanksRoomStore } from "./no-thanks-room-store.js";

export const noThanksRoom = createEngineRoom({ store: noThanksRoomStore, adapter: noThanksAdapter });
export const noThanksRoutes = createEngineRoomRoutes(noThanksRoom);
