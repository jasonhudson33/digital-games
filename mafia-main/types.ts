export enum Role {
  KILLER = 'King',
  DETECTIVE = 'Jack',
  ANGEL = 'Ace',
  CITIZEN = 'Citizen'
}

export enum GamePhase {
  LANDING = 'LANDING',
  LOBBY = 'LOBBY',
  SETUP = 'SETUP', // Host only
  ROLE_REVEAL = 'ROLE_REVEAL',
  NIGHT_TRANSITION = 'NIGHT_TRANSITION',
  NIGHT_KILLER = 'NIGHT_KILLER',
  NIGHT_DETECTIVE = 'NIGHT_DETECTIVE',
  NIGHT_ANGEL = 'NIGHT_ANGEL',
  DAY_RESULTS = 'DAY_RESULTS',
  DAY_DELIBERATION = 'DAY_DELIBERATION',
  DAY_VOTING = 'DAY_VOTING',
  GAME_OVER = 'GAME_OVER'
}

export interface Player {
  id: string; // Firebase auth.uid
  name: string;
  cardCode: string;
  isAlive: boolean;
  voteCount: number;
  isHost?: boolean;
  isReady?: boolean;
}

/** Map of playerId -> Role. Stored privately under rooms/{code}/roles. */
export type RoleMap = Record<string, Role>;

export type JoinRequest = { name: string; ts: number };
export type LeaveRequest = { ts: number };
export type ReadyIntent = { ready: true; ts: number };

export type NightIntent = {
  kind: 'KILL' | 'CHECK' | 'SAVE';
  targetId: string;
  ts: number;
};

export type DayIntent =
  | { kind: 'NOMINATE'; targetId: string; ts: number }
  | { kind: 'RESCIND'; targetId: string; ts: number }
  | { kind: 'SECOND'; targetId: string; ts: number }
  | { kind: 'VOTE'; targetId: string; ts: number };

export interface RoomMeta {
  hostUid: string;
  createdAt: number;
  version: number;
}

export interface DetectiveResult {
  targetId: string;
  isKiller: boolean;
  ts: number;
}

export interface GameState {
  roomCode: string;
  players: Player[];
  phase: GamePhase;
  round: number;
  trialLimit: number;

  killerTargetId: string | null;
  detectiveCheckId: string | null;
  angelSaveId: string | null;
  lastAngelSavedId: string | null;

  nightResults: string[];

  /**
   * Aggregated actions for the current phase, written by host.
   * actorId -> targetId
   */
  nightActions: Record<string, string>;

  /** Aggregated daytime data, written by host. */
  nominations: Record<string, string>;
  seconds: Record<string, string[]>;
  dayVotes: Record<string, string>; // voterId -> targetId

  winner: 'CITIZENS' | 'KILLERS' | null;

  /** Roles are only copied here at GAME_OVER for reveal. */
  revealedRoles?: RoleMap;

  lastUpdated: number;
}
