import type { Player } from '../types';

export const MAX_MAFIA_PLAYERS = 20;

const nextComputerName = (players: Player[]): string => {
  const usedNames = new Set(players.map((player) => player.name.toLocaleLowerCase()));
  let number = 1;
  while (usedNames.has(`computer ${number}`)) number += 1;
  return `Computer ${number}`;
};

export const addComputerPlayer = (players: Player[], id: string): Player[] => {
  if (players.length >= MAX_MAFIA_PLAYERS || players.some((player) => player.id === id)) return players;

  return [
    ...players,
    {
      id,
      name: nextComputerName(players),
      cardCode: '',
      isAlive: true,
      voteCount: 0,
      isHost: false,
      isReady: false,
      isComputer: true,
      isBot: true,
    },
  ];
};

export const removeComputerPlayer = (players: Player[], id: string): Player[] => {
  const target = players.find((player) => player.id === id);
  if (!target?.isBot) return players;
  return players.filter((player) => player.id !== id);
};
