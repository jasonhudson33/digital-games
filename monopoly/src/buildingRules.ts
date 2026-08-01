import type { Improvements } from './types';

export const HOUSE_LIMIT = 32;
export const HOTEL_LIMIT = 12;

export const getBuildingSupply = (improvements: Improvements) => {
  let housesOnBoard = 0;
  let hotelsOnBoard = 0;

  for (const rawLevel of Object.values(improvements ?? {})) {
    const level = Math.max(0, Math.floor(rawLevel));
    if (level >= 5) {
      hotelsOnBoard += 1;
    } else {
      housesOnBoard += Math.min(4, level);
    }
  }

  return {
    housesOnBoard,
    hotelsOnBoard,
    housesRemaining: Math.max(0, HOUSE_LIMIT - housesOnBoard),
    hotelsRemaining: Math.max(0, HOTEL_LIMIT - hotelsOnBoard)
  };
};

export const canPurchaseBuilding = (improvements: Improvements, currentLevel: number) => {
  const supply = getBuildingSupply(improvements);
  return currentLevel === 4 ? supply.hotelsRemaining > 0 : supply.housesRemaining > 0;
};

export const getRepairAssessment = (
  propertyIds: number[],
  improvements: Improvements,
  houseCost: number,
  hotelCost: number
) => {
  let houses = 0;
  let hotels = 0;

  for (const spaceId of propertyIds) {
    const level = improvements?.[spaceId] ?? 0;
    if (level >= 5) {
      hotels += 1;
    } else {
      houses += Math.max(0, Math.min(4, Math.floor(level)));
    }
  }

  return { houses, hotels, total: houses * houseCost + hotels * hotelCost };
};

export const getRepairPayment = (money: number, repairCost: number) => {
  const paid = Math.min(Math.max(0, money), Math.max(0, repairCost));
  return {
    paid,
    balance: Math.max(0, money - paid),
    amountOwed: Math.max(0, repairCost - paid)
  };
};
