import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type {
  DayIntent,
  DetectiveResult,
  GameState,
  JoinRequest,
  LeaveRequest,
  NightIntent,
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

const code = (roomCode: string) => roomCode.trim().toUpperCase();

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const subscribe = <T>(
  roomCode: string,
  table: string,
  roomColumn: 'code' | 'room_code',
  load: () => Promise<T>,
  cb: (value: T) => void
): Unsubscribe => {
  const room = code(roomCode);
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
      if (!stopped) console.error(`Failed to refresh Mafia ${table}`, error);
    }
  };

  void refresh();
  const channel: RealtimeChannel = client()
    .channel(`mafia:${table}:${room}:${subscriptionId++}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `${roomColumn}=eq.${room}` },
      () => void refresh()
    )
    .subscribe();
  const pollId = window.setInterval(() => void refresh(), 1500);

  return () => {
    stopped = true;
    window.clearInterval(pollId);
    void client().removeChannel(channel);
  };
};

const getRequests = async <T>(roomCode: string, requestType: 'join' | 'leave'): Promise<Record<string, T>> => {
  const { data, error } = await client()
    .from('mafia_requests')
    .select('player_id,payload')
    .eq('room_code', code(roomCode))
    .eq('request_type', requestType)
    .order('player_id');
  throwIfError(error);
  return Object.fromEntries((data ?? []).map((row) => [row.player_id, row.payload as T]));
};

const getIntents = async <T>(roomCode: string, round: number, intentType: IntentType): Promise<Record<string, T>> => {
  const { data, error } = await client()
    .from('mafia_intents')
    .select('player_id,payload')
    .eq('room_code', code(roomCode))
    .eq('round', round)
    .eq('intent_type', intentType)
    .order('player_id');
  throwIfError(error);
  return Object.fromEntries((data ?? []).map((row) => [row.player_id, row.payload as T]));
};

const saveIntent = async (roomCode: string, round: number, intentType: IntentType, playerId: string, payload: unknown) => {
  const { error } = await client().from('mafia_intents').upsert({
    room_code: code(roomCode),
    round,
    intent_type: intentType,
    player_id: playerId,
    payload,
    updated_at: new Date().toISOString()
  });
  throwIfError(error);
};

export const RoomService = {
  async saveState(roomCode: string, state: GameState): Promise<void> {
    const next = { ...state, lastUpdated: Math.max(Date.now(), state.lastUpdated + 1) };
    const { data, error } = await client()
      .from('mafia_rooms')
      .update({ state: next, updated_at: new Date().toISOString() })
      .eq('code', code(roomCode))
      .select('code')
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new Error(`Mafia room ${code(roomCode)} has not been created.`);
  },

  async getState(roomCode: string): Promise<GameState | null> {
    const { data, error } = await client()
      .from('mafia_rooms')
      .select('state')
      .eq('code', code(roomCode))
      .maybeSingle();
    throwIfError(error);
    return data?.state && Object.keys(data.state).length ? data.state as GameState : null;
  },

  subscribeToState(roomCode: string, cb: (state: GameState) => void) {
    return subscribe(roomCode, 'mafia_rooms', 'code', async () => {
      const state = await this.getState(roomCode);
      return state;
    }, (state) => {
      if (state) cb(state);
    });
  },

  async setMeta(roomCode: string, meta: RoomMeta) {
    const { error } = await client().from('mafia_rooms').upsert({
      code: code(roomCode),
      meta,
      updated_at: new Date().toISOString()
    });
    throwIfError(error);
  },

  async getMeta(roomCode: string): Promise<RoomMeta | null> {
    const { data, error } = await client()
      .from('mafia_rooms')
      .select('meta')
      .eq('code', code(roomCode))
      .maybeSingle();
    throwIfError(error);
    return data?.meta && Object.keys(data.meta).length ? data.meta as RoomMeta : null;
  },

  subscribeToMeta(roomCode: string, cb: (meta: RoomMeta | null) => void) {
    return subscribe(roomCode, 'mafia_rooms', 'code', () => this.getMeta(roomCode), cb);
  },

  async setRoles(roomCode: string, roles: RoleMap) {
    const room = code(roomCode);
    const { error: deleteError } = await client().from('mafia_roles').delete().eq('room_code', room);
    throwIfError(deleteError);
    const rows = Object.entries(roles).map(([playerId, role]) => ({ room_code: room, player_id: playerId, role }));
    if (!rows.length) return;
    const { error } = await client().from('mafia_roles').insert(rows);
    throwIfError(error);
  },

  async getMyRole(roomCode: string, uid: string): Promise<Role | null> {
    const { data, error } = await client()
      .from('mafia_roles')
      .select('role')
      .eq('room_code', code(roomCode))
      .eq('player_id', uid)
      .maybeSingle();
    throwIfError(error);
    return data?.role as Role ?? null;
  },

  subscribeToRoles(roomCode: string, cb: (roles: RoleMap) => void) {
    const load = async () => {
      const { data, error } = await client()
        .from('mafia_roles')
        .select('player_id,role')
        .eq('room_code', code(roomCode))
        .order('player_id');
      throwIfError(error);
      return Object.fromEntries((data ?? []).map((row) => [row.player_id, row.role as Role]));
    };
    return subscribe(roomCode, 'mafia_roles', 'room_code', load, cb);
  },

  async submitJoinRequest(roomCode: string, uid: string, name: string) {
    await this.clearLeaveRequest(roomCode, uid);
    const payload: JoinRequest = { name, ts: Date.now() };
    const { error } = await client().from('mafia_requests').upsert({
      room_code: code(roomCode), player_id: uid, request_type: 'join', payload, updated_at: new Date().toISOString()
    });
    throwIfError(error);
  },

  async clearJoinRequest(roomCode: string, uid: string) {
    const { error } = await client().from('mafia_requests').delete()
      .eq('room_code', code(roomCode)).eq('player_id', uid).eq('request_type', 'join');
    throwIfError(error);
  },

  subscribeToJoinRequests(roomCode: string, cb: (reqs: Record<string, JoinRequest>) => void) {
    return subscribe(roomCode, 'mafia_requests', 'room_code', () => getRequests<JoinRequest>(roomCode, 'join'), cb);
  },

  async submitLeaveRequest(roomCode: string, uid: string) {
    await this.clearJoinRequest(roomCode, uid);
    const payload: LeaveRequest = { ts: Date.now() };
    const { error } = await client().from('mafia_requests').upsert({
      room_code: code(roomCode), player_id: uid, request_type: 'leave', payload, updated_at: new Date().toISOString()
    });
    throwIfError(error);
  },

  async clearLeaveRequest(roomCode: string, uid: string) {
    const { error } = await client().from('mafia_requests').delete()
      .eq('room_code', code(roomCode)).eq('player_id', uid).eq('request_type', 'leave');
    throwIfError(error);
  },

  subscribeToLeaveRequests(roomCode: string, cb: (reqs: Record<string, LeaveRequest>) => void) {
    return subscribe(roomCode, 'mafia_requests', 'room_code', () => getRequests<LeaveRequest>(roomCode, 'leave'), cb);
  },

  async submitReady(roomCode: string, round: number, uid: string) {
    const payload: ReadyIntent = { ready: true, ts: Date.now() };
    await saveIntent(roomCode, round, 'ready', uid, payload);
  },

  subscribeToReady(roomCode: string, round: number, cb: (intents: Record<string, ReadyIntent>) => void) {
    return subscribe(roomCode, 'mafia_intents', 'room_code', () => getIntents<ReadyIntent>(roomCode, round, 'ready'), cb);
  },

  async submitNightIntent(roomCode: string, round: number, uid: string, intent: NightIntent) {
    await saveIntent(roomCode, round, 'night', uid, intent);
  },

  subscribeToNightIntents(roomCode: string, round: number, cb: (intents: Record<string, NightIntent>) => void) {
    return subscribe(roomCode, 'mafia_intents', 'room_code', () => getIntents<NightIntent>(roomCode, round, 'night'), cb);
  },

  async submitDayIntent(roomCode: string, round: number, uid: string, intent: DayIntent) {
    await saveIntent(roomCode, round, 'day', uid, intent);
  },

  subscribeToDayIntents(roomCode: string, round: number, cb: (intents: Record<string, DayIntent>) => void) {
    return subscribe(roomCode, 'mafia_intents', 'room_code', () => getIntents<DayIntent>(roomCode, round, 'day'), cb);
  },

  async clearRoundIntents(roomCode: string, round: number) {
    const { error } = await client().from('mafia_intents').delete()
      .eq('room_code', code(roomCode)).eq('round', round);
    throwIfError(error);
  },

  async setDetectiveResult(roomCode: string, round: number, uid: string, result: DetectiveResult) {
    const { error } = await client().from('mafia_detective_results').upsert({
      room_code: code(roomCode), round, player_id: uid, result, updated_at: new Date().toISOString()
    });
    throwIfError(error);
  },

  subscribeToDetectiveResult(roomCode: string, round: number, uid: string, cb: (result: DetectiveResult | null) => void) {
    const load = async () => {
      const { data, error } = await client().from('mafia_detective_results').select('result')
        .eq('room_code', code(roomCode)).eq('round', round).eq('player_id', uid).maybeSingle();
      throwIfError(error);
      return data?.result as DetectiveResult ?? null;
    };
    return subscribe(roomCode, 'mafia_detective_results', 'room_code', load, cb);
  },

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }
};
