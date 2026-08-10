import { board } from './board';
import { getUtilityRentMultiplier } from './rentRules';
import { CardDeck, GameState, PlayerPiece } from './types';

export const MONOPOLY_ROOM_STATE_VERSION = 2;

const validPieces: PlayerPiece[] = [
  'car', 'ship', 'hat', 'boot', 'dog', 'cat', 'train', 'plane', 'gem',
  'house', 'rocket', 'castle', 'basketball', 'soccer', 'volleyball',
  'tennis', 'baseball', 'baseballBat'
];

export const migrateMonopolyRoomState = (state: GameState): GameState => {
  const players = normalizePlayers(state);
  const activePlayers = players.filter((player) => !player.bankrupt);
  const gameOver = activePlayers.length === 1 && players.length > 1;
  const winnerIndex = gameOver
    ? players.findIndex((player) => player.id === activePlayers[0].id)
    : state.currentPlayerIndex;

  return {
    ...state,
    roomStateVersion: MONOPOLY_ROOM_STATE_VERSION,
    players,
    phase: gameOver ? 'gameOver' : state.phase,
    turnStage: state.turnStageVersion === 2 ? state.turnStage ?? 'roll' : 'roll',
    turnStageVersion: 2,
    currentPlayerIndex: winnerIndex,
    doubleRollCount: state.doubleRollCount ?? 0,
    jailRollMode: state.jailRollMode ?? null,
    pendingCard: gameOver ? null : state.pendingCard ?? null,
    pendingCardQueue: gameOver ? [] : state.pendingCardQueue ?? [],
    pendingPurchase: gameOver ? null : state.pendingPurchase ?? null,
    pendingTax: gameOver ? null : state.pendingTax ?? null,
    pendingRent: gameOver ? null : state.pendingRent ?? null,
    pendingUtilityRent: gameOver ? null : normalizeUtilityRent(state, players),
    pendingDebt: gameOver ? null : state.pendingDebt ?? null,
    pendingAuction: gameOver ? null : state.pendingAuction ?? null,
    pendingJailExit: gameOver ? null : state.pendingJailExit ?? null,
    pendingTrade: gameOver
      ? null
      : state.pendingTrade
        ? {
            ...state.pendingTrade,
            expiresAt: state.pendingTrade.expiresAt ?? state.updatedAt + 15_000,
            offeredMoney: state.pendingTrade.offeredMoney ?? 0,
            requestedMoney: state.pendingTrade.requestedMoney ?? 0,
            offeredJailCards: state.pendingTrade.offeredJailCards ?? 0,
            requestedJailCards: state.pendingTrade.requestedJailCards ?? 0
          }
        : null,
    improvements: state.improvements ?? {},
    houseRules: state.houseRules ?? false,
    freeParkingPot: Math.max(0, state.freeParkingPot ?? 0)
  };
};

const normalizePlayers = (state: GameState): GameState['players'] => {
  const claimedDecks = new Set<CardDeck>();
  const validDecks: CardDeck[] = ['chance', 'community'];
  return state.players.map((player) => {
    const decks: CardDeck[] = [];
    for (const deck of player.getOutOfJailFreeCardDecks ?? []) {
      if (validDecks.includes(deck) && !claimedDecks.has(deck)) {
        decks.push(deck);
        claimedDecks.add(deck);
      }
    }
    const targetCount = Math.min(2, Math.max(player.getOutOfJailFreeCards ?? 0, decks.length));
    for (const deck of validDecks) {
      if (decks.length >= targetCount) break;
      if (!claimedDecks.has(deck)) {
        decks.push(deck);
        claimedDecks.add(deck);
      }
    }
    return {
      ...player,
      isComputer: player.isComputer ?? player.id.startsWith('computer-'),
      mortgagedProperties: player.mortgagedProperties ?? [],
      getOutOfJailFreeCards: decks.length,
      getOutOfJailFreeCardDecks: decks,
      jailTurnCount: player.jailTurnCount ?? 0,
      piece: validPieces.includes(player.piece) ? player.piece : 'car'
    };
  });
};

const normalizeUtilityRent = (state: GameState, players: GameState['players']) => {
  const pending = state.pendingUtilityRent;
  if (!pending) return null;
  const owner = players.find((player) => player.id === pending.ownerId);
  const isChanceRate = pending.isChanceRate ?? state.pendingCard?.id.startsWith('chance-nearest-utility') ?? false;
  return {
    ...pending,
    multiplier: owner ? getUtilityRentMultiplier(owner, board, isChanceRate) : 4,
    isChanceRate
  };
};
