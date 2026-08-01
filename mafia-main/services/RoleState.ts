import type { Role, RoleMap } from '../types';

export const resolvePrivateRole = (roles: RoleMap, playerId: string | null): Role | null => {
  if (!playerId) return null;
  return roles[playerId] || null;
};
