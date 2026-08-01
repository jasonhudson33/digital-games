import type { DayIntent, Player } from '../types';

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

export const mergeDayActions = (
  currentNominations: Record<string, string>,
  currentSeconds: Record<string, string[]>,
  entries: Array<[string, DayIntent]>,
): { nominations: Record<string, string>; seconds: Record<string, string[]> } => {
  const nominations = { ...currentNominations };
  const seconds = Object.fromEntries(
    Object.entries(currentSeconds).map(([targetId, playerIds]) => [targetId, [...playerIds]])
  );

  for (const [playerId, intent] of entries) {
    if (intent.kind === 'NOMINATE') nominations[playerId] = intent.targetId;
    if (intent.kind === 'RESCIND') delete nominations[playerId];
    if (intent.kind === 'SECOND') {
      seconds[intent.targetId] = seconds[intent.targetId] || [];
      if (!seconds[intent.targetId].includes(playerId)) seconds[intent.targetId].push(playerId);
    }
  }

  return { nominations, seconds };
};
