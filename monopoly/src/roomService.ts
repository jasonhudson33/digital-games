import { createEngineRoomService } from '../../components/engine-room-service.js';

/**
 * Monopoly runs on the server: the browser sends named actions and receives the
 * game back. It holds no database client and never replaces the whole game.
 */
export const RoomService = createEngineRoomService('monopoly', 'Monopoly');
