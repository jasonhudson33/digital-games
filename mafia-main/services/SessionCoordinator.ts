import type { GameState, JoinRequest, Player, PresenceMap } from '../types';

export const PRESENCE_TIMEOUT_MS = 5 * 60 * 1000;

export const createInitialGameState = (): GameState => ({
  roomCode: '',
  players: [],
  phase: 'LANDING' as GameState['phase'],
  round: 1,
  trialLimit: 2,
  killerTargetId: null,
  detectiveCheckId: null,
  angelSaveId: null,
  lastAngelSavedId: null,
  nightResults: [],
  phaseResult: null,
  nightActions: {},
  nightSelectionHistory: {},
  nominations: {},
  seconds: {},
  dayVotes: {},
  isRunoff: false,
  winner: null,
  lastUpdated: 0,
});

export const migrateGameState = (state: GameState): GameState => ({
  ...state,
  nightResults: state.nightResults || [],
  phaseResult: state.phaseResult || null,
  nightActions: state.nightActions || {},
  nightSelectionHistory: state.nightSelectionHistory || {},
  nominations: state.nominations || {},
  seconds: state.seconds || {},
  dayVotes: state.dayVotes || {},
  isRunoff: state.isRunoff || false,
});

export const shouldApplyRemoteState = (remote: GameState, local: GameState): boolean => (
  remote.lastUpdated > local.lastUpdated
  || (remote.lastUpdated === local.lastUpdated && remote.phase !== local.phase)
);

export const selectActingHostId = (
  players: Player[],
  presence: PresenceMap,
  presenceReady: boolean,
  now = Date.now(),
): string | null => {
  const alive = players.filter((player) => player.isAlive && !player.hasLeft);
  if (presenceReady) {
    const cutoff = now - PRESENCE_TIMEOUT_MS;
    const online = alive.filter((player) => (presence[player.id] || 0) > cutoff);
    return online.find((player) => player.isHost)?.id || online[0]?.id || null;
  }
  return alive.find((player) => player.isHost)?.id || alive[0]?.id || null;
};

export const playersFromJoinRequests = (
  currentPlayers: Player[],
  requests: Record<string, JoinRequest>,
): Player[] => {
  const existing = new Set(currentPlayers.map((player) => player.id));
  return Object.entries(requests)
    .filter(([id]) => !existing.has(id))
    .map(([id, request]) => ({
      id,
      name: request.name,
      cardCode: '',
      isAlive: true,
      voteCount: 0,
      isHost: false,
      isReady: false,
    }));
};

export const selectDeterministicPlayer = (players: Player[], seed: string): Player | null => {
  if (!players.length) return null;
  const hash = Array.from(seed).reduce(
    (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  return players[hash % players.length];
};
