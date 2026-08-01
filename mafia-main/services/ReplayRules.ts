import type { Player } from '../types';

export const prepareReplayPlayers = (players: Player[]): Player[] => {
  return players.map((player) => ({
    ...player,
    cardCode: '',
    isAlive: true,
    isReady: false,
    voteCount: 0,
  }));
};
