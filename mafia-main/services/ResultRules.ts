import type { PhaseResult, Role } from '../types';

type Winner = 'CITIZENS' | 'KILLERS' | null;

export const createNightPhaseResult = (
  eliminatedPlayerId: string | null,
  eliminatedRole: Role | null,
  round: number,
  winner: Winner,
): PhaseResult => ({
  eliminatedPlayerId,
  eliminatedRole,
  source: 'NIGHT',
  nextPhase: (winner ? 'GAME_OVER' : 'DAY_DELIBERATION') as PhaseResult['nextPhase'],
  nextRound: round,
});

export const createVotePhaseResult = (
  eliminatedPlayerId: string,
  eliminatedRole: Role,
  round: number,
  winner: Winner,
): PhaseResult => ({
  eliminatedPlayerId,
  eliminatedRole,
  source: 'VOTE',
  nextPhase: (winner ? 'GAME_OVER' : 'NIGHT_TRANSITION') as PhaseResult['nextPhase'],
  nextRound: winner ? round : round + 1,
});

export const acknowledgePhaseResult = (result: PhaseResult) => ({
  phase: result.nextPhase,
  round: result.nextRound,
  phaseResult: null,
});
