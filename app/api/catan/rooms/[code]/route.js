import { createLocalRoomHandlers } from "../../../../../lib/local-room-route.js";

const handlers = createLocalRoomHandlers("__catanRooms");

export const GET = handlers.GET;
export const PUT = handlers.PUT;
