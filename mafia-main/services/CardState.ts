import type { Role } from '../types';

const ROLE_FALLBACK_CARDS: Record<Role, string> = {
  King: 'KS',
  Jack: 'JS',
  Ace: 'AS',
  Citizen: '2S',
};

export const displayCardCode = (cardCode: string, role: Role): string => {
  return (cardCode || ROLE_FALLBACK_CARDS[role]).replace(/^0/, 'T');
};
