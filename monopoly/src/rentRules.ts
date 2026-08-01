import type { Player, Space, SpaceKind } from './types';

export const countRentBearingProperties = (owner: Player, spaces: readonly Space[], kind: SpaceKind) =>
  owner.properties.filter(
    (spaceId) => spaces[spaceId]?.kind === kind && !(owner.mortgagedProperties ?? []).includes(spaceId)
  ).length;

export const getUtilityRentMultiplier = (owner: Player, spaces: readonly Space[], isChanceRate = false) =>
  isChanceRate ? 10 : countRentBearingProperties(owner, spaces, 'utility') >= 2 ? 10 : 4;
