import type { Player } from '../types';

const RUNOFF_ROUND_OFFSET = 1_000_000;

export const canParticipateInDay = (players: Player[], playerId: string): boolean => {
  const player = players.find((candidate) => candidate.id === playerId);
  return Boolean(player?.isAlive && !player.hasLeft);
};

export const resolveDayVote = (
  candidateIds: string[],
  votes: Record<string, string>,
): { top: string[]; tally: Record<string, number> } => {
  const tally = Object.fromEntries(candidateIds.map((candidateId) => [candidateId, 0]));
  for (const targetId of Object.values(votes)) {
    if (targetId in tally) tally[targetId] += 1;
  }
  if (!candidateIds.length) return { top: [], tally };
  const maxVotes = Math.max(...Object.values(tally));
  return {
    top: candidateIds.filter((candidateId) => tally[candidateId] === maxVotes),
    tally,
  };
};

export const dayBallotRound = (round: number, isRunoff: boolean): number => {
  return isRunoff ? round + RUNOFF_ROUND_OFFSET : round;
};
