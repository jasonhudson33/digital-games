import type { Player } from '../types';

export const canParticipateInDay = (players: Player[], playerId: string): boolean => {
  const player = players.find((candidate) => candidate.id === playerId);
  return Boolean(player?.isAlive && !player.hasLeft);
};
