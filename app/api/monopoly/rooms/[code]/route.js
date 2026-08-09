import { createLocalRoomHandlers } from "../../../../../lib/local-room-route.js";

const handlers = createLocalRoomHandlers("__monopolyRooms");

export const GET = handlers.GET;
export const PUT = handlers.PUT;
