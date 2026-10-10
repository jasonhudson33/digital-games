import { subscribeToRoomState } from '../../lib/room-sync.js';
import { migrateMonopolyRoomState } from './stateMigrations';
import { GameState } from './types';

type Handler = (state: GameState) => void;
type Updater = (state: GameState) => GameState;

const channelName = 'monopoly-room-updates';

/**
 * Monopoly rooms are read and written only through /api/monopoly/rooms/<code>.
 * The browser holds no database client, and other players' changes arrive by
 * polling that route (see lib/room-sync.js).
 */
export const RoomService = {
  async save(state: GameState) {
    await saveLocalRoom(state);
    cacheRoom(state);
  },

  async update(roomCode: string, updater: Updater): Promise<GameState | null> {
    const code = roomCode.trim().toUpperCase();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = await loadLocalRoom(code) ?? loadCachedRoom(code);
      if (!current) return null;
      const updated = updater(current);
      if (updated === current) return current;
      const next = migrateMonopolyRoomState({
        ...updated,
        updatedAt: Math.max(Date.now(), current.updatedAt + 1)
      });
      if (await saveLocalRoom(next, current.updatedAt)) {
        cacheRoom(next);
        return next;
      }
    }

    throw new Error('The room changed while this action was being saved. Please try again.');
  },

  async load(roomCode: string): Promise<GameState | null> {
    const code = roomCode.trim().toUpperCase();
    const localRoom = await loadLocalRoom(code);
    if (localRoom) return localRoom;

    return loadCachedRoom(code);
  },

  subscribe(roomCode: string, handler: Handler) {
    return subscribeToRoomState<GameState>({
      roomCode,
      broadcastName: channelName,
      load: (code) => RoomService.load(code),
      migrate: migrateMonopolyRoomState,
      handler
    });
  }
};

const loadCachedRoom = (roomCode: string): GameState | null => {
  const cached = localStorage.getItem(`monopoly:${roomCode}`);
  return cached ? migrateMonopolyRoomState(JSON.parse(cached) as GameState) : null;
};

const cacheRoom = (state: GameState) => {
  localStorage.setItem(`monopoly:${state.roomCode}`, JSON.stringify(state));
  broadcast(state);
};

const saveLocalRoom = async (state: GameState, expectedUpdatedAt?: number): Promise<boolean> => {
  const response = await fetch(`/api/monopoly/rooms/${state.roomCode}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, expectedUpdatedAt })
  });
  if (response.status === 409) return false;
  if (!response.ok) throw new Error('Could not save the Monopoly room.');
  return true;
};

const loadLocalRoom = async (roomCode: string): Promise<GameState | null> => {
  try {
    const response = await fetch(`/api/monopoly/rooms/${roomCode}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: GameState | null };
    return data.state ? migrateMonopolyRoomState(data.state) : null;
  } catch {
    return null;
  }
};

const broadcast = (state: GameState) => {
  if (!('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(state);
  channel.close();
};
