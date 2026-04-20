// Use scoped package @firebase/database to resolve export issues in some environments
import {
  ref,
  set,
  get,
  onValue,
  remove,
} from '@firebase/database';
import { db } from '../firebase';
import type {
  GameState,
  RoomMeta,
  JoinRequest,
  LeaveRequest,
  ReadyIntent,
  NightIntent,
  DayIntent,
  RoleMap,
  Role,
  DetectiveResult,
} from '../types';

export const RoomService = {
  // ---------- Core Paths ----------
  stateRef(roomCode: string) {
    return ref(db, `rooms/${roomCode}/state`);
  },
  metaRef(roomCode: string) {
    return ref(db, `rooms/${roomCode}/meta`);
  },
  rolesRef(roomCode: string) {
    return ref(db, `rooms/${roomCode}/roles`);
  },
  roleRef(roomCode: string, uid: string) {
    return ref(db, `rooms/${roomCode}/roles/${uid}`);
  },
  joinReqRef(roomCode: string) {
    return ref(db, `rooms/${roomCode}/joinRequests`);
  },
  leaveReqRef(roomCode: string) {
    return ref(db, `rooms/${roomCode}/leaveRequests`);
  },
  readyIntentsRef(roomCode: string, round: number) {
    return ref(db, `rooms/${roomCode}/intents/${round}/ready`);
  },
  nightIntentsRef(roomCode: string, round: number) {
    return ref(db, `rooms/${roomCode}/intents/${round}/night`);
  },
  dayIntentsRef(roomCode: string, round: number) {
    return ref(db, `rooms/${roomCode}/intents/${round}/day`);
  },
  detectiveResultRef(roomCode: string, round: number, uid: string) {
    return ref(db, `rooms/${roomCode}/private/${round}/detectiveResults/${uid}`);
  },

  // ---------- State ----------
  async saveState(roomCode: string, state: GameState): Promise<void> {
    try {
      await set(this.stateRef(roomCode), { ...state, lastUpdated: Date.now() });
    } catch (e) {
      console.error('Failed to save state to Firebase', e);
      throw e;
    }
  },

  async getState(roomCode: string): Promise<GameState | null> {
    try {
      const snap = await get(this.stateRef(roomCode));
      return snap.exists() ? (snap.val() as GameState) : null;
    } catch (e) {
      console.error('Failed to get state from Firebase', e);
      return null;
    }
  },

  subscribeToState(roomCode: string, cb: (state: GameState) => void) {
    return onValue(this.stateRef(roomCode), (snap) => {
      if (snap.exists()) cb(snap.val() as GameState);
    });
  },

  // ---------- Meta ----------
  async setMeta(roomCode: string, meta: RoomMeta) {
    await set(this.metaRef(roomCode), meta);
  },

  async getMeta(roomCode: string): Promise<RoomMeta | null> {
    const snap = await get(this.metaRef(roomCode));
    return snap.exists() ? (snap.val() as RoomMeta) : null;
  },

  subscribeToMeta(roomCode: string, cb: (meta: RoomMeta | null) => void) {
    return onValue(this.metaRef(roomCode), (snap) => {
      cb(snap.exists() ? (snap.val() as RoomMeta) : null);
    });
  },

  // ---------- Roles (private-ish) ----------
  async setRoles(roomCode: string, roles: RoleMap) {
    await set(this.rolesRef(roomCode), roles);
  },

  async getMyRole(roomCode: string, uid: string): Promise<Role | null> {
    const snap = await get(this.roleRef(roomCode, uid));
    return snap.exists() ? (snap.val() as Role) : null;
  },

  subscribeToRoles(roomCode: string, cb: (roles: RoleMap) => void) {
    return onValue(this.rolesRef(roomCode), (snap) => {
      if (snap.exists()) cb(snap.val() as RoleMap);
    });
  },

  // ---------- Requests ----------
  async submitJoinRequest(roomCode: string, uid: string, name: string) {
    const payload: JoinRequest = { name, ts: Date.now() };
    await set(ref(db, `rooms/${roomCode}/joinRequests/${uid}`), payload);
  },

  async clearJoinRequest(roomCode: string, uid: string) {
    await remove(ref(db, `rooms/${roomCode}/joinRequests/${uid}`));
  },

  subscribeToJoinRequests(roomCode: string, cb: (reqs: Record<string, JoinRequest>) => void) {
    return onValue(this.joinReqRef(roomCode), (snap) => {
      cb(snap.exists() ? (snap.val() as Record<string, JoinRequest>) : {});
    });
  },

  async submitLeaveRequest(roomCode: string, uid: string) {
    const payload: LeaveRequest = { ts: Date.now() };
    await set(ref(db, `rooms/${roomCode}/leaveRequests/${uid}`), payload);
  },

  subscribeToLeaveRequests(roomCode: string, cb: (reqs: Record<string, LeaveRequest>) => void) {
    return onValue(this.leaveReqRef(roomCode), (snap) => {
      cb(snap.exists() ? (snap.val() as Record<string, LeaveRequest>) : {});
    });
  },

  // ---------- Ready intent ----------
  async submitReady(roomCode: string, round: number, uid: string) {
    const payload: ReadyIntent = { ready: true, ts: Date.now() };
    await set(ref(db, `rooms/${roomCode}/intents/${round}/ready/${uid}`), payload);
  },

  subscribeToReady(roomCode: string, round: number, cb: (intents: Record<string, ReadyIntent>) => void) {
    return onValue(this.readyIntentsRef(roomCode, round), (snap) => {
      cb(snap.exists() ? (snap.val() as Record<string, ReadyIntent>) : {});
    });
  },

  // ---------- Intents ----------
  async submitNightIntent(roomCode: string, round: number, uid: string, intent: NightIntent) {
    await set(ref(db, `rooms/${roomCode}/intents/${round}/night/${uid}`), intent);
  },

  subscribeToNightIntents(roomCode: string, round: number, cb: (intents: Record<string, NightIntent>) => void) {
    return onValue(this.nightIntentsRef(roomCode, round), (snap) => {
      cb(snap.exists() ? (snap.val() as Record<string, NightIntent>) : {});
    });
  },

  async submitDayIntent(roomCode: string, round: number, uid: string, intent: DayIntent) {
    await set(ref(db, `rooms/${roomCode}/intents/${round}/day/${uid}`), intent);
  },

  subscribeToDayIntents(roomCode: string, round: number, cb: (intents: Record<string, DayIntent>) => void) {
    return onValue(this.dayIntentsRef(roomCode, round), (snap) => {
      cb(snap.exists() ? (snap.val() as Record<string, DayIntent>) : {});
    });
  },

  async clearRoundIntents(roomCode: string, round: number) {
    await remove(ref(db, `rooms/${roomCode}/intents/${round}`));
  },

  // ---------- Private detective result ----------
  async setDetectiveResult(roomCode: string, round: number, uid: string, result: DetectiveResult) {
    await set(this.detectiveResultRef(roomCode, round, uid), result);
  },

  subscribeToDetectiveResult(roomCode: string, round: number, uid: string, cb: (result: DetectiveResult | null) => void) {
    return onValue(this.detectiveResultRef(roomCode, round, uid), (snap) => {
      cb(snap.exists() ? (snap.val() as DetectiveResult) : null);
    });
  },

  // ---------- Room code ----------
  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  },
};
