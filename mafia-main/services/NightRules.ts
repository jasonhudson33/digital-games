import type { Player, Role } from '../types';

export interface NightResolution {
  players: Player[];
  results: string[];
  eliminatedPlayerId: string | null;
}

export const nightActorsForRole = (
  players: Player[],
  actingRole: Role,
  roles: Record<string, Role>,
): Player[] => players.filter((player) => player.isAlive && roles[player.id] === actingRole);

export const nightSelectionsByTarget = (
  votes: Record<string, string>,
  actorIds: string[],
): Record<string, string[]> => {
  const actorSet = new Set(actorIds);
  const selections: Record<string, string[]> = {};
  for (const [actorId, targetId] of Object.entries(votes)) {
    if (!actorSet.has(actorId)) continue;
    selections[targetId] = [...(selections[targetId] || []), actorId];
  }
  return selections;
};

export const canSelectNightTarget = (
  players: Player[],
  actingRole: Role,
  actorId: string,
  targetId: string,
  lastAngelSavedId: string | null,
  teammateIds: string[] = [],
): boolean => {
  const target = players.find((player) => player.id === targetId);
  if (!target?.isAlive) return false;
  if (actingRole === 'Ace') return targetId !== lastAngelSavedId;
  if (teammateIds.includes(targetId)) return false;
  return targetId !== actorId;
};

export const resolveNight = (
  players: Player[],
  killerTargetId: string | null,
  angelSaveId: string | null,
): NightResolution => {
  const updatedPlayers = players.map((player) => ({ ...player }));

  if (killerTargetId && killerTargetId === angelSaveId) {
    const spared = updatedPlayers.find((player) => player.id === killerTargetId);
    const result = spared
      ? `${spared.name} was attacked in the night but was spared.`
      : 'A life was spared in the night.';
    return { players: updatedPlayers, results: [result], eliminatedPlayerId: null };
  }

  if (killerTargetId) {
    const victim = updatedPlayers.find((player) => player.id === killerTargetId);
    if (victim) {
      victim.isAlive = false;
      return {
        players: updatedPlayers,
        results: [`${victim.name} was eliminated in the night.`],
        eliminatedPlayerId: victim.id,
      };
    }
  }

  return {
    players: updatedPlayers,
    results: ['The night passed without incident.'],
    eliminatedPlayerId: null,
  };
};

const DETECTIVE_ACK_ROUND_OFFSET = 2_000_000;

/** Round key for detective result acknowledgements, kept apart from role-reveal ready intents. */
export const detectiveAckRound = (round: number): number => round + DETECTIVE_ACK_ROUND_OFFSET;

/** Living human detectives who have not yet acknowledged their result. Computers never block. */
export const pendingDetectiveAcks = (
  players: Player[],
  detectiveIds: string[],
  acknowledgedIds: string[],
): string[] => detectiveIds.filter((detectiveId) => {
  const player = players.find((candidate) => candidate.id === detectiveId);
  return Boolean(player && player.isAlive && !player.isComputer && !acknowledgedIds.includes(detectiveId));
});
