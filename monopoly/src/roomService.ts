import { getConfiguredSupabaseClient, isSupabaseConfigured, subscribeToRoomState } from '../../lib/supabase-room-sync';
import { migrateMonopolyRoomState } from './stateMigrations';
import { GameState } from './types';

type Handler = (state: GameState) => void;
type Updater = (state: GameState) => GameState;

const channelName = 'monopoly-room-updates';

export const isOnlineSyncEnabled = isSupabaseConfigured();

export const RoomService = {
  async save(state: GameState) {
    const supabase = await getConfiguredSupabaseClient();
    if (!supabase) {
      await saveLocalRoom(state);
      cacheRoom(state);
      return;
    }

    const { error } = await supabase.from('monopoly_rooms').upsert({
      code: state.roomCode,
      state,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    cacheRoom(state);
  },

  async update(roomCode: string, updater: Updater): Promise<GameState | null> {
    const code = roomCode.trim().toUpperCase();
    const supabase = await getConfiguredSupabaseClient();
    if (!supabase) {
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
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data: loaded, error: loadError } = await supabase
        .from('monopoly_rooms')
        .select('state')
        .eq('code', code)
        .maybeSingle();
      if (loadError) throw loadError;
      if (!loaded?.state) return null;

      const current = migrateMonopolyRoomState(loaded.state as GameState);
      const next = updater(current);
      if (next === current) {
        cacheRoom(current);
        return current;
      }

      const { data: saved, error: saveError } = await supabase
        .from('monopoly_rooms')
        .update({ state: next, updated_at: new Date().toISOString() })
        .eq('code', code)
        .eq('state->>updatedAt', String(current.updatedAt))
        .select('state')
        .maybeSingle();
      if (saveError) throw saveError;
      if (saved?.state) {
        const normalized = migrateMonopolyRoomState(saved.state as GameState);
        cacheRoom(normalized);
        return normalized;
      }
    }

    throw new Error('The room changed while this action was being saved. Please try again.');
  },

  async load(roomCode: string): Promise<GameState | null> {
    const code = roomCode.trim().toUpperCase();
    const supabase = await getConfiguredSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('monopoly_rooms').select('state').eq('code', code).maybeSingle();
      if (error) throw error;
      return data?.state ? migrateMonopolyRoomState(data.state as GameState) : null;
    }

    const localRoom = await loadLocalRoom(code);
    if (localRoom) return localRoom;

    return loadCachedRoom(code);
  },

  subscribe(roomCode: string, handler: Handler) {
    return subscribeToRoomState({
      roomCode,
      table: 'monopoly_rooms',
      channelPrefix: 'monopoly',
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
