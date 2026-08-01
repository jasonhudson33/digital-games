import type { Player } from '../types';

export interface NightResolution {
  players: Player[];
  results: string[];
}

export const resolveNight = (
  players: Player[],
  killerTargetId: string | null,
  angelSaveId: string | null,
): NightResolution => {
  const updatedPlayers = players.map((player) => ({ ...player }));

  if (killerTargetId && killerTargetId === angelSaveId) {
    return { players: updatedPlayers, results: ['A life was spared in the night.'] };
  }

  if (killerTargetId) {
    const victim = updatedPlayers.find((player) => player.id === killerTargetId);
    if (victim) {
      victim.isAlive = false;
      return { players: updatedPlayers, results: [`${victim.name} was eliminated in the night.`] };
    }
  }

  return { players: updatedPlayers, results: ['The night passed without incident.'] };
};
