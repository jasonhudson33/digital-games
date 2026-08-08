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
    return { players: updatedPlayers, results: ['A life was spared in the night.'], eliminatedPlayerId: null };
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
