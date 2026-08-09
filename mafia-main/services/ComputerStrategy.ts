import type { GameState, Player, Role, RoleMap } from '../types';

const KILLER = 'King' as Role;
const DETECTIVE = 'Jack' as Role;
const ANGEL = 'Ace' as Role;

export const chooseComputerNightTarget = (
  state: GameState,
  role: Role,
  actorIds: string[],
  roleMap: RoleMap,
): Player | null => {
  const candidates = state.players.filter((player) => {
    if (!player.isAlive || player.hasLeft) return false;
    if (role === ANGEL) return player.id !== state.lastAngelSavedId;
    return !actorIds.includes(player.id);
  });
  const priorTargets = new Set(
    role === DETECTIVE
      ? Object.values(state.nightSelectionHistory.DETECTIVE || {})
      : [],
  );
  return rankPlayers(candidates, (candidate) => {
    if (role === KILLER) {
      const challengedKiller = Object.entries(state.nominations).some(
        ([nominatorId, targetId]) => nominatorId === candidate.id && roleMap[targetId] === KILLER,
      );
      return (challengedKiller ? 12 : 0) + (candidate.isHost ? 2 : 0) + (candidate.isComputer ? 0 : 1);
    }
    if (role === DETECTIVE) return priorTargets.has(candidate.id) ? -100 : 5;
    const nominationPressure = Object.values(state.nominations).filter((targetId) => targetId === candidate.id).length;
    return nominationPressure * 3 + (candidate.isHost ? 1 : 0) + (actorIds.includes(candidate.id) ? 1 : 0);
  }, `${state.roomCode}:${state.round}:${role}`);
};

export const chooseComputerDayTarget = (
  state: GameState,
  computer: Player,
  candidates: Player[],
  roleMap: RoleMap,
  action: 'nominate' | 'second' | 'vote',
): Player | null => rankPlayers(
  candidates.filter((candidate) => candidate.id !== computer.id),
  (candidate) => {
    if (roleMap[computer.id] === KILLER && roleMap[candidate.id] === KILLER) return -10_000;
    const nominations = Object.values(state.nominations).filter((targetId) => targetId === candidate.id).length;
    const seconds = state.seconds[candidate.id]?.length || 0;
    const votes = Object.values(state.dayVotes).filter((targetId) => targetId === candidate.id).length;
    return nominations * 4 + seconds * 3 + votes * 2 + (candidate.isComputer ? 0 : 0.25);
  },
  `${state.roomCode}:${state.round}:${action}:${computer.id}`,
);

function rankPlayers(players: Player[], score: (player: Player) => number, seed: string): Player | null {
  if (!players.length) return null;
  const scored = players.map((player) => ({ player, score: score(player) }));
  const highest = Math.max(...scored.map((entry) => entry.score));
  const tied = scored.filter((entry) => entry.score === highest).map((entry) => entry.player);
  const hash = Array.from(seed).reduce(
    (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  return tied[hash % tied.length];
}
