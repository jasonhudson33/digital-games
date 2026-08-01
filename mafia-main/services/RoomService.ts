import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getMafiaIdentity, supabase } from '../supabase';
import type {
  DayIntent,
  DetectiveResult,
  GameState,
  JoinRequest,
  LeaveRequest,
  NightIntent,
  PresenceMap,
  ReadyIntent,
  Role,
  RoleMap,
  RoomMeta
} from '../types';

type Unsubscribe = () => void;
type IntentType = 'ready' | 'night' | 'day';

let subscriptionId = 0;

const client = (): SupabaseClient => {
  if (!supabase) throw new Error('Supabase is not configured for Mafia.');
  return supabase;
};

const identity = () => {
  const current = getMafiaIdentity();
  if (!current) throw new Error('Mafia device identity is unavailable.');
  return current;
};

const code = (roomCode: string) => roomCode.trim().toUpperCase();

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const pollingSubscription = <T>(load: () => Promise<T>, cb: (value: T) => void, interval = 1000): Unsubscribe => {
  let stopped = false;
  let lastValue = '';
  const refresh = async () => {
    try {
      const value = await load();
      const serialized = JSON.stringify(value);
      if (stopped || serialized === lastValue) return;
      lastValue = serialized;
      cb(value);
    } catch (error) {
      if (!stopped) console.error('Failed to refresh Mafia room data', error);
    }
  };
  void refresh();
  const pollId = window.setInterval(() => void refresh(), interval);
  return () => {
    stopped = true;
    window.clearInterval(pollId);
  };
};

const roomSubscription = <T>(roomCode: string, load: () => Promise<T>, cb: (value: T) => void): Unsubscribe => {
  const stopPolling = pollingSubscription(load, cb, 1500);
  const room = code(roomCode);
  const channel: RealtimeChannel = client()
    .channel(`mafia:rooms:${room}:${subscriptionId++}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mafia_rooms', filter: `code=eq.${room}` }, () => {
      void load().then(cb).catch((error) => console.error('Failed to receive Mafia room update', error));
    })
    .subscribe();
  return () => {
    stopPolling();
    void client().removeChannel(channel);
  };
};

const rpc = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await client().rpc(name, args);
  throwIfError(error);
  return data as T;
};

const credentials = (roomCode: string) => {
  const current = identity();
  return { room_code: code(roomCode), player_id: current.playerId, player_token: current.token };
};

const getRequests = async <T>(roomCode: string, requestType: 'join' | 'leave'): Promise<Record<string, T>> => {
  const rows = await rpc<Array<{ request_player_id: string; payload: T }>>('mafia_get_requests', {
    ...credentials(roomCode), requested_type: requestType
  });
  return Object.fromEntries((rows ?? []).map((row) => [row.request_player_id, row.payload]));
};

const getIntents = async <T>(roomCode: string, round: number, intentType: IntentType): Promise<Record<string, T>> => {
  const rows = await rpc<Array<{ intent_player_id: string; payload: T }>>('mafia_get_intents', {
    ...credentials(roomCode), intent_round: round, requested_type: intentType
  });
  return Object.fromEntries((rows ?? []).map((row) => [row.intent_player_id, row.payload]));
};

const saveIntent = async (roomCode: string, round: number, intentType: IntentType, payload: unknown) => {
  await rpc('mafia_submit_intent', {
    ...credentials(roomCode), intent_round: round, intent_type: intentType, payload
  });
};

const getPresence = async (roomCode: string): Promise<PresenceMap> => {
  const rows = await rpc<Array<{ presence_player_id: string; last_seen_ms: number }>>(
    'mafia_get_presence',
    credentials(roomCode)
  );
  return Object.fromEntries((rows ?? []).map((row) => [row.presence_player_id, Number(row.last_seen_ms)]));
};

export const RoomService = {
  async createRoom(roomCode: string, state: GameState, meta: RoomMeta) {
    const current = identity();
    await rpc('mafia_create_room', {
      room_code: code(roomCode),
      room_state: state,
      room_meta: meta,
      player_id: current.playerId,
      player_token: current.token
    });
  },

  async saveState(roomCode: string, state: GameState): Promise<void> {
    const next = { ...state, lastUpdated: Math.max(Date.now(), state.lastUpdated + 1) };
    await rpc('mafia_save_state', { ...credentials(roomCode), room_state: next });
  },

  async getState(roomCode: string): Promise<GameState | null> {
    const { data, error } = await client().from('mafia_rooms').select('state').eq('code', code(roomCode)).maybeSingle();
    throwIfError(error);
    return data?.state && Object.keys(data.state).length ? data.state as GameState : null;
  },

  subscribeToState(roomCode: string, cb: (state: GameState) => void) {
    return roomSubscription(roomCode, () => this.getState(roomCode), (state) => {
      if (state) cb(state);
    });
  },

  async setMeta(roomCode: string, meta: RoomMeta) {
    await rpc('mafia_set_meta', { ...credentials(roomCode), room_meta: meta });
  },

  async getMeta(roomCode: string): Promise<RoomMeta | null> {
    const { data, error } = await client().from('mafia_rooms').select('meta').eq('code', code(roomCode)).maybeSingle();
    throwIfError(error);
    return data?.meta && Object.keys(data.meta).length ? data.meta as RoomMeta : null;
  },

  subscribeToMeta(roomCode: string, cb: (meta: RoomMeta | null) => void) {
    return roomSubscription(roomCode, () => this.getMeta(roomCode), cb);
  },

  async heartbeat(roomCode: string) {
    await rpc('mafia_heartbeat', credentials(roomCode));
  },

  subscribeToPresence(roomCode: string, cb: (presence: PresenceMap) => void) {
    return pollingSubscription(() => getPresence(roomCode), cb, 5000);
  },

  async setRoles(roomCode: string, roles: RoleMap) {
    await rpc('mafia_set_roles', { ...credentials(roomCode), roles });
  },

  async getMyRole(roomCode: string, uid: string): Promise<Role | null> {
    const current = identity();
    if (uid !== current.playerId) throw new Error('Cannot read another player’s Mafia role.');
    return await rpc<Role | null>('mafia_get_role', credentials(roomCode));
  },

  subscribeToMyRole(roomCode: string, uid: string, cb: (role: Role | null) => void) {
    return pollingSubscription(() => this.getMyRole(roomCode, uid), cb);
  },

  subscribeToRoles(roomCode: string, cb: (roles: RoleMap) => void) {
    const load = async () => {
      const rows = await rpc<Array<{ role_player_id: string; role: Role }>>('mafia_get_roles', credentials(roomCode));
      return Object.fromEntries((rows ?? []).map((row) => [row.role_player_id, row.role]));
    };
    return pollingSubscription(load, cb);
  },

  async submitJoinRequest(roomCode: string, uid: string, name: string) {
    const current = identity();
    if (uid !== current.playerId) throw new Error('Invalid Mafia player identity.');
    await rpc('mafia_register_player', credentials(roomCode));
    await this.clearLeaveRequest(roomCode, uid);
    const payload: JoinRequest = { name, ts: Date.now() };
    await rpc('mafia_submit_request', { ...credentials(roomCode), request_type: 'join', payload });
  },

  async clearJoinRequest(roomCode: string, uid: string) {
    await rpc('mafia_clear_request', {
      ...credentials(roomCode), target_player_id: uid, requested_type: 'join'
    });
  },

  subscribeToJoinRequests(roomCode: string, cb: (reqs: Record<string, JoinRequest>) => void) {
    return pollingSubscription(() => getRequests<JoinRequest>(roomCode, 'join'), cb);
  },

  async submitLeaveRequest(roomCode: string, uid: string) {
    const current = identity();
    if (uid !== current.playerId) throw new Error('Invalid Mafia player identity.');
    await rpc('mafia_leave_room', credentials(roomCode));
  },

  async clearLeaveRequest(roomCode: string, uid: string) {
    await rpc('mafia_clear_request', {
      ...credentials(roomCode), target_player_id: uid, requested_type: 'leave'
    });
  },

  subscribeToLeaveRequests(roomCode: string, cb: (reqs: Record<string, LeaveRequest>) => void) {
    return pollingSubscription(() => getRequests<LeaveRequest>(roomCode, 'leave'), cb);
  },

  async submitReady(roomCode: string, round: number, uid: string) {
    if (uid !== identity().playerId) throw new Error('Invalid Mafia player identity.');
    const payload: ReadyIntent = { ready: true, ts: Date.now() };
    await saveIntent(roomCode, round, 'ready', payload);
  },

  subscribeToReady(roomCode: string, round: number, cb: (intents: Record<string, ReadyIntent>) => void) {
    return pollingSubscription(() => getIntents<ReadyIntent>(roomCode, round, 'ready'), cb);
  },

  async submitNightIntent(roomCode: string, round: number, uid: string, intent: NightIntent) {
    if (uid !== identity().playerId) throw new Error('Invalid Mafia player identity.');
    await saveIntent(roomCode, round, 'night', intent);
  },

  subscribeToNightIntents(roomCode: string, round: number, cb: (intents: Record<string, NightIntent>) => void) {
    return pollingSubscription(() => getIntents<NightIntent>(roomCode, round, 'night'), cb);
  },

  async submitDayIntent(roomCode: string, round: number, uid: string, intent: DayIntent) {
    if (uid !== identity().playerId) throw new Error('Invalid Mafia player identity.');
    await saveIntent(roomCode, round, 'day', intent);
  },

  subscribeToDayIntents(roomCode: string, round: number, cb: (intents: Record<string, DayIntent>) => void) {
    return pollingSubscription(() => getIntents<DayIntent>(roomCode, round, 'day'), cb);
  },

  async clearRoundIntents(roomCode: string, round: number) {
    await rpc('mafia_clear_round_intents', { ...credentials(roomCode), intent_round: round });
  },

  async resetGameData(roomCode: string) {
    await rpc('mafia_reset_game_data', credentials(roomCode));
  },

  async setDetectiveResult(roomCode: string, round: number, uid: string, result: DetectiveResult) {
    await rpc('mafia_set_detective_result', {
      ...credentials(roomCode), intent_round: round, target_player_id: uid, result
    });
  },

  subscribeToDetectiveResult(roomCode: string, round: number, uid: string, cb: (result: DetectiveResult | null) => void) {
    const current = identity();
    if (uid !== current.playerId) return () => undefined;
    const load = () => rpc<DetectiveResult | null>('mafia_get_detective_result', {
      ...credentials(roomCode), intent_round: round
    });
    return pollingSubscription(load, cb);
  },

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }
};
