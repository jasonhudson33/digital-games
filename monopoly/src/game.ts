import { board } from './board';
import { CardDeck, DiceRoll, GameState, LogEntry, Player, PlayerColor, PlayerPiece } from './types';

const playerColors: PlayerColor[] = ['red', 'blue', 'green', 'gold'];
export const playerPieces: PlayerPiece[] = [
  'car',
  'ship',
  'hat',
  'boot',
  'dog',
  'cat',
  'train',
  'plane',
  'gem',
  'house',
  'rocket',
  'castle',
  'basketball',
  'soccer',
  'volleyball',
  'tennis',
  'baseball',
  'baseballBat'
];

export const makeId = () => Math.random().toString(36).slice(2, 10);

export const makeRoomCode = () =>
  Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

const log = (text: string): LogEntry => ({ id: `${Date.now()}-${Math.random()}`, text });

type Card = {
  id: string;
  title: string;
  text: string;
  actionText: string;
  apply: (player: Player) => Player;
};

const chanceCards: Card[] = [
  {
    id: 'chance-advance-go',
    title: 'Advance to GO',
    text: 'Take a ride around the board and collect your salary.',
    actionText: 'Move to GO and collect $200.',
    apply: (player) => ({ ...player, position: 0, money: player.money + 200 })
  },
  {
    id: 'chance-bank-dividend',
    title: 'Bank Dividend',
    text: 'Your investments paid off at exactly the right time.',
    actionText: 'Collect $50.',
    apply: (player) => ({ ...player, money: player.money + 50 })
  },
  {
    id: 'chance-speeding-fine',
    title: 'Speeding Fine',
    text: 'You were moving a little too fast past the railroads.',
    actionText: 'Pay $15.',
    apply: (player) => ({ ...player, money: player.money - 15 })
  },
  {
    id: 'chance-go-jail',
    title: 'Go To Jail',
    text: 'Do not pass GO. Do not collect $200.',
    actionText: 'Move directly to Jail.',
    apply: (player) => ({ ...player, position: 10, inJail: true, jailTurnCount: 0 })
  },
  {
    id: 'chance-jail-free',
    title: 'Get Out Of Jail Free',
    text: 'Keep this card until you need it.',
    actionText: 'Receive 1 Get Out of Jail Free card.',
    apply: (player) => ({ ...player, getOutOfJailFreeCards: player.getOutOfJailFreeCards + 1 })
  }
];

const communityCards: Card[] = [
  {
    id: 'community-bank-error',
    title: 'Bank Error In Your Favor',
    text: 'The books were checked twice, and somehow you came out ahead.',
    actionText: 'Collect $200.',
    apply: (player) => ({ ...player, money: player.money + 200 })
  },
  {
    id: 'community-doctor-fee',
    title: "Doctor's Fee",
    text: 'A quick visit turned into a bill.',
    actionText: 'Pay $50.',
    apply: (player) => ({ ...player, money: player.money - 50 })
  },
  {
    id: 'community-sale-stock',
    title: 'From Sale Of Stock',
    text: 'A small certificate in a drawer finally mattered.',
    actionText: 'Collect $50.',
    apply: (player) => ({ ...player, money: player.money + 50 })
  },
  {
    id: 'community-school-fees',
    title: 'School Fees',
    text: 'Tuition comes due.',
    actionText: 'Pay $50.',
    apply: (player) => ({ ...player, money: player.money - 50 })
  },
  {
    id: 'community-jail-free',
    title: 'Get Out Of Jail Free',
    text: 'Hold this card until a future Jail turn.',
    actionText: 'Receive 1 Get Out of Jail Free card.',
    apply: (player) => ({ ...player, getOutOfJailFreeCards: player.getOutOfJailFreeCards + 1 })
  }
];

export const makeInitialState = (hostId: string, hostName: string, roomCode = makeRoomCode(), piece: PlayerPiece = 'car'): GameState => ({
  roomCode,
  hostId,
  players: [makePlayer(hostId, hostName, 'red', piece)],
  currentPlayerIndex: 0,
  phase: 'lobby',
  lastRoll: null,
  doubleRollCount: 0,
  jailRollMode: null,
  pendingCard: null,
  pendingPurchase: null,
  pendingTax: null,
  pendingRent: null,
  pendingUtilityRent: null,
  pendingDebt: null,
  pendingAuction: null,
  pendingJailExit: null,
  pendingTrade: null,
  improvements: {},
  log: [log(`${hostName} created room ${roomCode}.`)],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const makePlayer = (id: string, name: string, color: PlayerColor, piece: PlayerPiece = 'car'): Player => ({
  id,
  name: name.trim() || 'Player',
  color,
  piece,
  position: 0,
  money: 1500,
  properties: [],
  mortgagedProperties: [],
  getOutOfJailFreeCards: 0,
  jailTurnCount: 0,
  inJail: false,
  bankrupt: false
});

export const joinPlayer = (state: GameState, playerId: string, name: string, piece?: PlayerPiece): GameState => {
  if (state.players.some((player) => player.id === playerId)) return state;
  const used = new Set(state.players.map((player) => player.color));
  const usedPieces = new Set(state.players.map((player) => player.piece));
  const color = playerColors.find((candidate) => !used.has(candidate)) ?? playerColors[state.players.length % playerColors.length];
  const assignedPiece = piece && !usedPieces.has(piece) ? piece : playerPieces.find((candidate) => !usedPieces.has(candidate)) ?? playerPieces[state.players.length % playerPieces.length];
  return touch({
    ...state,
    players: [...state.players, makePlayer(playerId, name, color, assignedPiece)],
    log: [log(`${name.trim() || 'Player'} joined the room.`), ...state.log].slice(0, 30)
  });
};

export const addLocalPlayer = (state: GameState): GameState => {
  const nextNumber = state.players.length + 1;
  return joinPlayer(state, `local-${Date.now()}-${nextNumber}`, `Player ${nextNumber}`);
};

export const startGame = (state: GameState): GameState =>
  touch({
    ...state,
    phase: 'playing',
    doubleRollCount: 0,
    jailRollMode: null,
    pendingPurchase: null,
    pendingTax: null,
    pendingRent: null,
    pendingUtilityRent: null,
    pendingDebt: null,
    pendingAuction: null,
    pendingJailExit: null,
    pendingTrade: null,
    log: [log('The game started. Roll to begin.'), ...state.log].slice(0, 30)
  });

export const rollDice = (state: GameState): GameState => {
  if (
    state.phase !== 'playing' ||
    state.pendingCard ||
    state.pendingPurchase ||
    state.pendingTax ||
    state.pendingRent ||
    state.pendingUtilityRent ||
    state.pendingDebt ||
    state.pendingAuction ||
    state.pendingJailExit ||
    state.pendingTrade
  ) return state;
  const active = state.players[state.currentPlayerIndex];
  if (!active || active.bankrupt) return state;
  if (active.inJail && !state.jailRollMode) return state;

  const dieOne = Math.floor(Math.random() * 6) + 1;
  const dieTwo = Math.floor(Math.random() * 6) + 1;
  const isDouble = dieOne === dieTwo;
  const isTryingForJailDoubles = active.inJail && state.jailRollMode === 'stay';
  const doubleRollCount = isTryingForJailDoubles ? 0 : isDouble ? (state.doubleRollCount ?? 0) + 1 : 0;
  const roll: DiceRoll = {
    dieOne,
    dieTwo,
    isDouble,
    nonce: Date.now(),
    playerId: active.id
  };

  if (!isTryingForJailDoubles && doubleRollCount >= 3) {
    const players = [...state.players];
    const jailed = { ...active, position: 10, inJail: true, jailTurnCount: 0 };
    players[state.currentPlayerIndex] = jailed;
    return finishTurn(
      {
        ...state,
        players,
        lastRoll: roll,
        doubleRollCount: 0,
        jailRollMode: null,
        log: [
          log(`${active.name} rolled ${dieOne} + ${dieTwo}, their third doubles in a row, and went directly to Jail.`),
          ...state.log
        ].slice(0, 30)
      },
      { forceAdvance: true }
    );
  }

  if (isTryingForJailDoubles && !isDouble) {
    const jailTurnCount = active.jailTurnCount + 1;
    if (jailTurnCount >= 3) {
      const players = [...state.players];
      players[state.currentPlayerIndex] = { ...active, jailTurnCount };
      return touch({
        ...state,
        players,
        lastRoll: roll,
        doubleRollCount: 0,
        jailRollMode: null,
        pendingJailExit: {
          playerId: active.id,
          dieOne,
          dieTwo
        },
        log: [log(`${active.name} rolled ${dieOne} + ${dieTwo} on their third Jail turn and must pay or use a card.`), ...state.log].slice(0, 30)
      });
    }

    const players = [...state.players];
    players[state.currentPlayerIndex] = { ...active, jailTurnCount };
    return finishTurn(
      {
        ...state,
        players,
        lastRoll: roll,
        doubleRollCount: 0,
        jailRollMode: null,
        log: [log(`${active.name} rolled ${dieOne} + ${dieTwo} and stayed in Jail (${jailTurnCount}/3).`), ...state.log].slice(0, 30)
      },
      { forceAdvance: true }
    );
  }

  if (isTryingForJailDoubles && isDouble) {
    const players = [...state.players];
    players[state.currentPlayerIndex] = { ...active, inJail: false, jailTurnCount: 0 };
    return resolveLanding(touch({ ...state, players, lastRoll: roll, doubleRollCount: 0, jailRollMode: 'stay' }), roll);
  }

  return resolveLanding(touch({ ...state, lastRoll: roll, doubleRollCount }), roll);
};

export const payToLeaveJail = (state: GameState): GameState => {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  if (!player?.inJail || player.money < 50) return state;
  const entries = [log(`${player.name} paid $50 to get out of Jail.`)];
  const players = [...state.players];
  players[playerIndex] = { ...player, money: player.money - 50, inJail: false, jailTurnCount: 0 };

  return touch({
    ...state,
    players,
    doubleRollCount: 0,
    jailRollMode: 'paid',
    log: [...entries, ...state.log].slice(0, 30)
  });
};

export const useGetOutOfJailFree = (state: GameState): GameState => {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  if (!player?.inJail || player.getOutOfJailFreeCards <= 0) return state;
  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    getOutOfJailFreeCards: player.getOutOfJailFreeCards - 1,
    jailTurnCount: 0,
    inJail: false
  };

  return touch({
    ...state,
    players,
    doubleRollCount: 0,
    jailRollMode: 'card',
    log: [log(`${player.name} used a Get Out of Jail Free card.`), ...state.log].slice(0, 30)
  });
};

export const payForcedJailExit = (state: GameState): GameState => resolveForcedJailExit(state, 'paid');

export const useCardForForcedJailExit = (state: GameState): GameState => resolveForcedJailExit(state, 'card');

export const stayInJailAndRoll = (state: GameState): GameState => {
  const player = state.players[state.currentPlayerIndex];
  if (!player?.inJail) return state;
  return touch({
    ...state,
    doubleRollCount: 0,
    jailRollMode: 'stay',
    log: [log(`${player.name} stayed in Jail and will roll for doubles.`), ...state.log].slice(0, 30)
  });
};

export const acknowledgeCard = (state: GameState): GameState => {
  if (!state.pendingCard) return state;
  return finishTurn({
    ...state,
    pendingCard: null,
    log: [log(`${playerName(state, state.pendingCard.playerId)} acknowledged the ${deckLabel(state.pendingCard.deck)} card.`), ...state.log].slice(0, 30)
  });
};

export const acknowledgeRent = (state: GameState): GameState => {
  if (!state.pendingRent) return state;
  const payer = playerName(state, state.pendingRent.payerId);

  return finishTurn({
    ...state,
    pendingRent: null,
    log: [log(`${payer} acknowledged the rent.`), ...state.log].slice(0, 30)
  });
};

export const finishDebtPayment = (state: GameState): GameState => {
  const debt = state.pendingDebt;
  if (!debt) return state;
  const playerIndex = state.players.findIndex((player) => player.id === debt.playerId);
  if (playerIndex < 0) return { ...state, pendingDebt: null };

  const players = [...state.players];
  const player = players[playerIndex];
  if (player.money < debt.amountOwed) {
    return touch({
      ...state,
      log: [log(`${player.name} still needs $${debt.amountOwed - player.money} more to finish paying.`), ...state.log].slice(0, 30)
    });
  }

  players[playerIndex] = { ...player, money: player.money - debt.amountOwed };
  if (debt.creditorId) {
    const creditorIndex = players.findIndex((candidate) => candidate.id === debt.creditorId);
    if (creditorIndex >= 0) {
      players[creditorIndex] = { ...players[creditorIndex], money: players[creditorIndex].money + debt.amountOwed };
    }
  }

  return finishTurn({
    ...state,
    players,
    pendingDebt: null,
    pendingRent: null,
    pendingTax: null,
    log: [log(`${player.name} finished paying $${debt.amountOwed} for ${debt.reason}.`), ...state.log].slice(0, 30)
  });
};

export const rollUtilityRent = (state: GameState): GameState => {
  const pending = state.pendingUtilityRent;
  if (!pending) return state;
  const playerIndex = state.players.findIndex((player) => player.id === pending.payerId);
  const ownerIndex = state.players.findIndex((player) => player.id === pending.ownerId);
  const space = board[pending.spaceId];
  if (playerIndex < 0 || ownerIndex < 0 || !space) return { ...state, pendingUtilityRent: null };

  const dieOne = Math.floor(Math.random() * 6) + 1;
  const dieTwo = Math.floor(Math.random() * 6) + 1;
  const total = dieOne + dieTwo;
  const amount = total * pending.multiplier;
  const players = [...state.players];
  const payer = { ...players[playerIndex] };
  const owner = players[ownerIndex];
  const rentPaid = Math.min(payer.money, amount);
  const entries: LogEntry[] = [
    log(`${payer.name} rolled ${dieOne} + ${dieTwo} for utility rent and paid ${owner.name} $${rentPaid}.`)
  ];
  if (rentPaid < amount) entries.push(log(`${payer.name} still owed $${amount - rentPaid} but had no more cash.`));

  payer.money -= rentPaid;
  players[ownerIndex] = { ...owner, money: owner.money + rentPaid };
  players[playerIndex] = markBankrupt(payer, entries);
  let nextImprovements = state.improvements;
  if (players[playerIndex].bankrupt) {
    const result = transferBankruptAssets(players, playerIndex, ownerIndex, nextImprovements, entries);
    nextImprovements = result.improvements;
  }

  return touch({
    ...state,
    players,
    improvements: nextImprovements,
    pendingUtilityRent: null,
    pendingRent: {
      spaceId: pending.spaceId,
      payerId: pending.payerId,
      ownerId: pending.ownerId,
      amount,
      isMortgaged: false,
      hasMonopoly: false,
      rentNote: `${total} x ${pending.multiplier} utility rent`
    },
    pendingDebt:
      rentPaid < amount && canRaiseMoney(state, players[playerIndex])
        ? {
            playerId: pending.payerId,
            creditorId: pending.ownerId,
            amountOwed: amount - rentPaid,
            reason: `${space.name} utility rent`
          }
        : null,
    log: [...entries, ...state.log].slice(0, 30)
  });
};

export const buyPendingProperty = (state: GameState): GameState => {
  if (!state.pendingPurchase) return state;
  const space = board[state.pendingPurchase.spaceId];
  const playerIndex = state.players.findIndex((player) => player.id === state.pendingPurchase?.playerId);
  if (!space?.price || playerIndex < 0) return { ...state, pendingPurchase: null };

  const players = [...state.players];
  const buyer = players[playerIndex];
  if (buyer.money < space.price) {
    return touch({
      ...state,
      log: [log(`${buyer.name} needs $${space.price - buyer.money} more to buy ${space.name}. Mortgage property or sell houses/hotels to the bank, then click Buy again.`), ...state.log].slice(0, 30)
    });
  }

  players[playerIndex] = {
    ...buyer,
    money: buyer.money - space.price,
    properties: [...buyer.properties, space.id]
  };

  return finishTurn({
    ...state,
    players,
    pendingPurchase: null,
    log: [log(`${buyer.name} bought ${space.name} for $${space.price}.`), ...state.log].slice(0, 30)
  });
};

export const declinePendingProperty = (state: GameState): GameState => {
  if (!state.pendingPurchase) return state;
  const space = board[state.pendingPurchase.spaceId];
  const player = state.players.find((candidate) => candidate.id === state.pendingPurchase?.playerId);
  return startAuction(
    { ...state, pendingPurchase: null },
    state.pendingPurchase.spaceId,
    `${player?.name ?? 'Player'} declined ${space.name}; it is up for auction.`
  );
};

export const payFlatIncomeTax = (state: GameState): GameState => payPendingTax(state, 'flat');

export const payPercentIncomeTax = (state: GameState): GameState => payPendingTax(state, 'percent');

export const mortgageProperty = (state: GameState, playerId: string, spaceId: number): GameState => {
  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  const space = board[spaceId];
  if (playerIndex < 0 || !space?.price) return state;

  const players = [...state.players];
  const player = players[playerIndex];
  if (!player.properties.includes(spaceId) || player.mortgagedProperties.includes(spaceId)) return state;
  if ((state.improvements?.[spaceId] ?? 0) > 0) return state;
  const mortgageValue = getMortgageValue(spaceId);

  players[playerIndex] = {
    ...player,
    money: player.money + mortgageValue,
    mortgagedProperties: [...player.mortgagedProperties, spaceId]
  };

  return touch({
    ...state,
    players,
    log: [log(`${player.name} mortgaged ${space.name} for $${mortgageValue}.`), ...state.log].slice(0, 30)
  });
};

export const unmortgageProperty = (state: GameState, playerId: string, spaceId: number): GameState => {
  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  const space = board[spaceId];
  if (playerIndex < 0 || !space?.price) return state;

  const players = [...state.players];
  const player = players[playerIndex];
  if (!player.mortgagedProperties.includes(spaceId)) return state;
  const unmortgageCost = getUnmortgageCost(spaceId);
  if (player.money < unmortgageCost) return state;

  players[playerIndex] = {
    ...player,
    money: player.money - unmortgageCost,
    mortgagedProperties: player.mortgagedProperties.filter((id) => id !== spaceId)
  };

  return touch({
    ...state,
    players,
    log: [log(`${player.name} unmortgaged ${space.name} for $${unmortgageCost}.`), ...state.log].slice(0, 30)
  });
};

export const buyImprovement = (state: GameState, playerId: string, spaceId: number): GameState => {
  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  const space = board[spaceId];
  if (playerIndex < 0 || !space || !canImproveProperty(state, state.players[playerIndex], spaceId)) return state;

  const currentLevel = state.improvements[spaceId] ?? 0;
  const cost = getImprovementCost(spaceId);
  const player = state.players[playerIndex];
  if (player.money < cost) return state;

  const players = [...state.players];
  players[playerIndex] = { ...player, money: player.money - cost };
  const nextLevel = currentLevel + 1;
  const label = nextLevel === 5 ? 'a hotel' : `house ${nextLevel}`;

  return touch({
    ...state,
    players,
    improvements: {
      ...state.improvements,
      [spaceId]: nextLevel
    },
    log: [log(`${player.name} bought ${label} on ${space.name} for $${cost}.`), ...state.log].slice(0, 30)
  });
};

export const sellImprovement = (state: GameState, playerId: string, spaceId: number): GameState => {
  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  const space = board[spaceId];
  if (playerIndex < 0 || !space || !canSellImprovement(state, state.players[playerIndex], spaceId)) return state;

  const currentLevel = state.improvements[spaceId] ?? 0;
  const saleValue = Math.floor(getImprovementCost(spaceId) / 2);
  const nextLevel = currentLevel - 1;
  const players = [...state.players];
  const player = players[playerIndex];
  players[playerIndex] = { ...player, money: player.money + saleValue };
  const improvements = { ...state.improvements };
  if (nextLevel <= 0) {
    delete improvements[spaceId];
  } else {
    improvements[spaceId] = nextLevel;
  }

  return touch({
    ...state,
    players,
    improvements,
    log: [log(`${player.name} sold ${currentLevel === 5 ? 'a hotel' : 'a house'} on ${space.name} for $${saleValue}.`), ...state.log].slice(0, 30)
  });
};

export const proposeTrade = (
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  offeredPropertyIds: number[],
  requestedPropertyIds: number[],
  offeredMoney = 0,
  requestedMoney = 0,
  offeredJailCards = 0,
  requestedJailCards = 0
): GameState => {
  const cleanOfferedMoney = sanitizeMoney(offeredMoney);
  const cleanRequestedMoney = sanitizeMoney(requestedMoney);
  const cleanOfferedJailCards = sanitizeMoney(offeredJailCards);
  const cleanRequestedJailCards = sanitizeMoney(requestedJailCards);
  if (
    state.pendingTrade ||
    fromPlayerId === toPlayerId ||
    (
      !offeredPropertyIds.length &&
      !requestedPropertyIds.length &&
      cleanOfferedMoney <= 0 &&
      cleanRequestedMoney <= 0 &&
      cleanOfferedJailCards <= 0 &&
      cleanRequestedJailCards <= 0
    )
  ) return state;
  const fromPlayer = state.players.find((player) => player.id === fromPlayerId);
  const toPlayer = state.players.find((player) => player.id === toPlayerId);
  if (!fromPlayer || !toPlayer || fromPlayer.bankrupt || toPlayer.bankrupt) return state;
  if (fromPlayer.money < cleanOfferedMoney || toPlayer.money < cleanRequestedMoney) return state;
  if (fromPlayer.getOutOfJailFreeCards < cleanOfferedJailCards || toPlayer.getOutOfJailFreeCards < cleanRequestedJailCards) return state;

  const offered = uniqueBuildableTradeIds(offeredPropertyIds, fromPlayer);
  const requested = uniqueBuildableTradeIds(requestedPropertyIds, toPlayer);
  if (!offered.length && !requested.length && cleanOfferedMoney <= 0 && cleanRequestedMoney <= 0 && cleanOfferedJailCards <= 0 && cleanRequestedJailCards <= 0) return state;

  return touch({
    ...state,
    pendingTrade: {
      id: makeId(),
      fromPlayerId,
      toPlayerId,
      offeredPropertyIds: offered,
      requestedPropertyIds: requested,
      offeredMoney: cleanOfferedMoney,
      requestedMoney: cleanRequestedMoney,
      offeredJailCards: cleanOfferedJailCards,
      requestedJailCards: cleanRequestedJailCards
    },
    log: [log(`${fromPlayer.name} offered ${toPlayer.name} a trade.`), ...state.log].slice(0, 30)
  });
};

export const acceptTrade = (state: GameState): GameState => {
  const trade = state.pendingTrade;
  if (!trade) return state;
  const fromIndex = state.players.findIndex((player) => player.id === trade.fromPlayerId);
  const toIndex = state.players.findIndex((player) => player.id === trade.toPlayerId);
  if (fromIndex < 0 || toIndex < 0) return { ...state, pendingTrade: null };

  const players = [...state.players];
  const fromPlayer = players[fromIndex];
  const toPlayer = players[toIndex];
  const offered = uniqueBuildableTradeIds(trade.offeredPropertyIds, fromPlayer);
  const requested = uniqueBuildableTradeIds(trade.requestedPropertyIds, toPlayer);
  const offeredMoney = sanitizeMoney(trade.offeredMoney ?? 0);
  const requestedMoney = sanitizeMoney(trade.requestedMoney ?? 0);
  const offeredJailCards = sanitizeMoney(trade.offeredJailCards ?? 0);
  const requestedJailCards = sanitizeMoney(trade.requestedJailCards ?? 0);
  if (fromPlayer.money < offeredMoney || toPlayer.money < requestedMoney) {
    return touch({
      ...state,
      pendingTrade: null,
      log: [log(`${fromPlayer.name} and ${toPlayer.name}'s trade was canceled because someone could not afford it.`), ...state.log].slice(0, 30)
    });
  }
  if (fromPlayer.getOutOfJailFreeCards < offeredJailCards || toPlayer.getOutOfJailFreeCards < requestedJailCards) {
    return touch({
      ...state,
      pendingTrade: null,
      log: [log(`${fromPlayer.name} and ${toPlayer.name}'s trade was canceled because a Get Out of Jail Free card was no longer available.`), ...state.log].slice(0, 30)
    });
  }

  players[fromIndex] = {
    ...fromPlayer,
    money: fromPlayer.money - offeredMoney + requestedMoney,
    getOutOfJailFreeCards: fromPlayer.getOutOfJailFreeCards - offeredJailCards + requestedJailCards,
    properties: [...fromPlayer.properties.filter((id) => !offered.includes(id)), ...requested],
    mortgagedProperties: [
      ...fromPlayer.mortgagedProperties.filter((id) => !offered.includes(id)),
      ...requested.filter((id) => toPlayer.mortgagedProperties.includes(id))
    ]
  };
  players[toIndex] = {
    ...toPlayer,
    money: toPlayer.money - requestedMoney + offeredMoney,
    getOutOfJailFreeCards: toPlayer.getOutOfJailFreeCards - requestedJailCards + offeredJailCards,
    properties: [...toPlayer.properties.filter((id) => !requested.includes(id)), ...offered],
    mortgagedProperties: [
      ...toPlayer.mortgagedProperties.filter((id) => !requested.includes(id)),
      ...offered.filter((id) => fromPlayer.mortgagedProperties.includes(id))
    ]
  };

  return touch({
    ...state,
    players,
    pendingTrade: null,
    log: [log(`${toPlayer.name} accepted ${fromPlayer.name}'s trade.`), ...state.log].slice(0, 30)
  });
};

export const declineTrade = (state: GameState): GameState => {
  const trade = state.pendingTrade;
  if (!trade) return state;
  return touch({
    ...state,
    pendingTrade: null,
    log: [log(`${playerName(state, trade.toPlayerId)} declined ${playerName(state, trade.fromPlayerId)}'s trade.`), ...state.log].slice(0, 30)
  });
};

const payPendingTax = (state: GameState, option: 'flat' | 'percent'): GameState => {
  if (!state.pendingTax) return state;
  const playerIndex = state.players.findIndex((player) => player.id === state.pendingTax?.playerId);
  if (playerIndex < 0) return { ...state, pendingTax: null };

  const players = [...state.players];
  const player = players[playerIndex];
  const amount = option === 'flat' ? state.pendingTax.flatAmount : state.pendingTax.percentAmount;
  const label = option === 'flat' ? `$${state.pendingTax.flatAmount}` : `10% ($${state.pendingTax.percentAmount})`;
  const entries = [log(`${player.name} chose to pay ${label} for Income Tax.`)];
  const paid = Math.min(player.money, amount);
  players[playerIndex] = markBankrupt({ ...player, money: player.money - paid }, entries);
  if (paid < amount) entries.push(log(`${player.name} still owes $${amount - paid} and must mortgage property or sell houses/hotels to the bank.`));

  const nextState = {
    ...state,
    players,
    pendingTax: null,
    pendingDebt:
      paid < amount && canRaiseMoney(state, players[playerIndex])
        ? {
            playerId: player.id,
            creditorId: null,
            amountOwed: amount - paid,
            reason: 'tax'
          }
        : null,
    log: [...entries, ...state.log].slice(0, 30)
  };

  return nextState.pendingDebt ? touch(nextState) : finishTurn(nextState);
};

export const bidAuction = (state: GameState): GameState => {
  if (!state.pendingAuction) return state;
  const auction = state.pendingAuction;
  const bidder = state.players.find((player) => player.id === auction.activePlayerId);
  if (!bidder || bidder.bankrupt) return state;
  const nextBid = auction.currentBid + 10;

  return touch({
    ...state,
    pendingAuction: advanceAuction(state, {
      ...auction,
      currentBid: nextBid,
      highBidderId: bidder.id,
      passedPlayerIds: auction.passedPlayerIds.filter((id) => id !== bidder.id)
    }),
    log: [log(`${bidder.name} bid $${nextBid}.`), ...state.log].slice(0, 30)
  });
};

export const completeAuctionPurchase = (state: GameState): GameState => finishAuction(state);

export const passAuction = (state: GameState): GameState => {
  if (!state.pendingAuction) return state;
  const auction = state.pendingAuction;
  const player = state.players.find((candidate) => candidate.id === auction.activePlayerId);
  const passedPlayerIds = Array.from(new Set([...auction.passedPlayerIds, auction.activePlayerId]));
  const nextAuction = { ...auction, passedPlayerIds };
  const remaining = auctionPlayers(state, nextAuction);

  if (remaining.length <= 1) {
    return finishAuction({
      ...state,
      pendingAuction: nextAuction,
      log: [log(`${player?.name ?? 'Player'} passed on the auction.`), ...state.log].slice(0, 30)
    });
  }

  return touch({
    ...state,
    pendingAuction: advanceAuction(state, nextAuction),
    log: [log(`${player?.name ?? 'Player'} passed on the auction.`), ...state.log].slice(0, 30)
  });
};

const resolveForcedJailExit = (state: GameState, option: 'paid' | 'card'): GameState => {
  if (!state.pendingJailExit) return state;
  const playerIndex = state.players.findIndex((player) => player.id === state.pendingJailExit?.playerId);
  if (playerIndex < 0) return { ...state, pendingJailExit: null };

  const player = state.players[playerIndex];
  if (option === 'card' && player.getOutOfJailFreeCards <= 0) return state;

  const entries: LogEntry[] = [];
  const cost = option === 'paid' ? 50 : 0;
  const rollTotal = state.pendingJailExit.dieOne + state.pendingJailExit.dieTwo;
  const players = [...state.players];
  const freedBeforeCharge = {
    ...player,
    getOutOfJailFreeCards: option === 'card' ? player.getOutOfJailFreeCards - 1 : player.getOutOfJailFreeCards,
    inJail: false,
    jailTurnCount: 0,
    position: (10 + rollTotal) % board.length
  };
  const freed = cost > 0 ? chargeBank(freedBeforeCharge, cost, entries) : freedBeforeCharge;

  entries.push(
    log(
      option === 'card'
        ? `${player.name} used a Get Out of Jail Free card and moved ${rollTotal} spaces.`
        : `${player.name} paid $50 and moved ${rollTotal} spaces.`
    )
  );
  players[playerIndex] = freed;

  return resolvePostMoveSpace({
    ...state,
    players,
    pendingJailExit: null,
    jailRollMode: null,
    doubleRollCount: 0,
    log: [...entries, ...state.log].slice(0, 30)
  }, playerIndex);
};

const resolveLanding = (state: GameState, roll: DiceRoll): GameState => {
  const players = [...state.players];
  const active = { ...players[state.currentPlayerIndex] };
  const total = roll.dieOne + roll.dieTwo;
  const previous = active.position;
  active.position = (active.position + total) % board.length;

  const entries: LogEntry[] = [];
  entries.push(log(`${active.name} rolled ${roll.dieOne} + ${roll.dieTwo}${roll.isDouble ? ' doubles' : ''}.`));

  if (active.position < previous) {
    active.money += 200;
    entries.push(log(`${active.name} passed GO and collected $200.`));
  }
  players[state.currentPlayerIndex] = active;

  return resolvePostMoveSpace({
    ...state,
    players
  }, state.currentPlayerIndex, entries, roll);
};

const resolvePostMoveSpace = (state: GameState, playerIndex: number, landingEntries: LogEntry[] = [], roll?: DiceRoll): GameState => {
  const players = [...state.players];
  const active = { ...players[playerIndex] };
  const entries = [...landingEntries];
  const space = board[active.position];
  const owner = findOwner(players, space.id);

  if (space.kind === 'goToJail') {
    active.position = 10;
    active.inJail = true;
    active.jailTurnCount = 0;
    entries.push(log(`${active.name} went directly to Jail.`));
  } else if (space.kind === 'tax') {
    const flatAmount = space.name === 'Income Tax' ? 200 : 75;
    const percentAmount = calculatePercentTax(active);
    entries.push(log(`${active.name} landed on ${space.name}.`));
    players[playerIndex] = markBankrupt(active, entries);
    return touch({
      ...state,
      players,
      pendingTax: {
        spaceId: space.id,
        playerId: active.id,
        flatAmount,
        percentAmount
      },
      log: [...entries.reverse(), ...state.log].slice(0, 30)
    });
  } else if (space.kind === 'chance' || space.kind === 'community') {
    const deck = space.kind === 'chance' ? 'chance' : 'community';
    const seed = roll?.nonce ?? Date.now();
    const card = drawCard(deck, seed);
    const cardResult = normalizeCashAfterCard(card.apply(active), active, entries);
    Object.assign(active, cardResult);
    entries.push(log(`${active.name} drew ${card.title}: ${card.actionText}`));
    players[playerIndex] = markBankrupt(active, entries);

    return touch({
      ...state,
      players,
      pendingCard: {
        id: `${card.id}-${seed}`,
        deck,
        title: card.title,
        text: card.text,
        actionText: card.actionText,
        playerId: active.id
      },
      log: [...entries.reverse(), ...state.log].slice(0, 30)
    });
  } else if (space.price && owner && owner.id !== active.id) {
    if (owner.mortgagedProperties.includes(space.id)) {
      entries.push(log(`${active.name} landed on ${owner.name}'s mortgaged ${space.name}; no rent was due.`));
      players[playerIndex] = markBankrupt(active, entries);
      return touch({
        ...state,
        players,
        pendingRent: {
          spaceId: space.id,
          payerId: active.id,
          ownerId: owner.id,
          amount: 0,
          isMortgaged: true,
          hasMonopoly: false
        },
        log: [...entries.reverse(), ...state.log].slice(0, 30)
      });
    }
    if (space.kind === 'utility') {
      const ownedUtilities = owner.properties.filter((spaceId) => board[spaceId]?.kind === 'utility').length;
      const multiplier = ownedUtilities >= 2 ? 10 : 4;
      entries.push(log(`${active.name} landed on ${owner.name}'s ${space.name} and must roll for utility rent.`));
      players[playerIndex] = active;
      return touch({
        ...state,
        players,
        pendingUtilityRent: {
          spaceId: space.id,
          payerId: active.id,
          ownerId: owner.id,
          multiplier
        },
        log: [...entries.reverse(), ...state.log].slice(0, 30)
      });
    }
    const rentDetails = calculateRent(state, space, owner, roll);
    const rent = rentDetails.amount;
    const hasMonopoly = rentDetails.hasMonopoly;
    const rentPaid = Math.min(active.money, rent);
    active.money -= rentPaid;
    const ownerIndex = players.findIndex((player) => player.id === owner.id);
    players[ownerIndex] = { ...players[ownerIndex], money: players[ownerIndex].money + rentPaid };
    entries.push(log(`${active.name} paid ${owner.name} $${rentPaid} rent for ${space.name}${rentDetails.logSuffix}.`));
    if (rentPaid < rent) entries.push(log(`${active.name} still owed $${rent - rentPaid} but had no more cash.`));
    players[playerIndex] = markBankrupt(active, entries);
    let nextImprovements = state.improvements;
    if (players[playerIndex].bankrupt) {
      const result = transferBankruptAssets(players, playerIndex, ownerIndex, nextImprovements, entries);
      nextImprovements = result.improvements;
    }
    return touch({
      ...state,
      players,
      improvements: nextImprovements,
      pendingRent: {
        spaceId: space.id,
        payerId: active.id,
        ownerId: owner.id,
        amount: rent,
        isMortgaged: false,
        hasMonopoly,
        rentNote: rentDetails.note
      },
      pendingDebt:
        rentPaid < rent && canRaiseMoney(state, players[playerIndex])
          ? {
              playerId: active.id,
              creditorId: owner.id,
              amountOwed: rent - rentPaid,
              reason: `${space.name} rent`
            }
          : null,
      log: [...entries.reverse(), ...state.log].slice(0, 30)
    });
  } else if (space.price && !owner) {
    entries.push(log(`${active.name} landed on unowned ${space.name}.`));
    players[playerIndex] = markBankrupt(active, entries);
    return touch({
      ...state,
      players,
      pendingPurchase: {
        spaceId: space.id,
        playerId: active.id
      },
      log: [...entries.reverse(), ...state.log].slice(0, 30)
    });
  } else {
    entries.push(log(`${active.name} landed on ${space.name}.`));
  }

  players[playerIndex] = markBankrupt(active, entries);

  return finishTurn({
    ...state,
    players,
    log: [...entries.reverse(), ...state.log].slice(0, 30)
  });
};

const startAuction = (state: GameState, spaceId: number, message: string): GameState => {
  const activePlayer = nextAuctionPlayer(state.players, state.currentPlayerIndex, []);
  if (!activePlayer) {
    return finishTurn({
      ...state,
      pendingAuction: null,
      log: [log(message), log(`${board[spaceId].name} did not sell.`), ...state.log].slice(0, 30)
    });
  }

  return touch({
    ...state,
    pendingAuction: {
      spaceId,
      currentBid: 0,
      highBidderId: null,
      activePlayerId: activePlayer.id,
      passedPlayerIds: []
    },
    log: [log(message), ...state.log].slice(0, 30)
  });
};

const advanceAuction = (state: GameState, auction = state.pendingAuction): NonNullable<GameState['pendingAuction']> => {
  if (!auction) throw new Error('Cannot advance a missing auction.');
  const currentIndex = state.players.findIndex((player) => player.id === auction.activePlayerId);
  const next = nextAuctionPlayer(state.players, currentIndex, auction.passedPlayerIds) ?? state.players[currentIndex];
  return {
    ...auction,
    activePlayerId: next.id
  };
};

const finishAuction = (state: GameState): GameState => {
  const auction = state.pendingAuction;
  if (!auction) return state;

  const space = board[auction.spaceId];
  if (!auction.highBidderId || auction.currentBid <= 0) {
    return finishTurn({
      ...state,
      pendingAuction: null,
      log: [log(`${space.name} did not sell at auction.`), ...state.log].slice(0, 30)
    });
  }

  const players = [...state.players];
  const winnerIndex = players.findIndex((player) => player.id === auction.highBidderId);
  if (winnerIndex < 0) return { ...state, pendingAuction: null };

  const winner = players[winnerIndex];
  if (winner.money < auction.currentBid) {
    return touch({
      ...state,
      pendingAuction: {
        ...auction,
        activePlayerId: winner.id
      },
      log: [log(`${winner.name} won the auction for ${space.name}, but needs $${auction.currentBid - winner.money} more. Mortgage property or sell houses/hotels to the bank, then complete the purchase.`), ...state.log].slice(0, 30)
    });
  }

  players[winnerIndex] = {
    ...winner,
    money: winner.money - auction.currentBid,
    properties: [...winner.properties, space.id]
  };

  return finishTurn({
    ...state,
    players,
    pendingAuction: null,
    log: [log(`${winner.name} won ${space.name} at auction for $${auction.currentBid}.`), ...state.log].slice(0, 30)
  });
};

const drawCard = (deck: CardDeck, seed: number) => {
  const cards = deck === 'chance' ? chanceCards : communityCards;
  return cards[seed % cards.length];
};

const calculatePercentTax = (player: Player) => {
  const propertyValue = player.properties.reduce((total, spaceId) => {
    const space = board[spaceId];
    return total + (space?.price ?? 0);
  }, 0);
  return Math.ceil((player.money + propertyValue) * 0.1);
};

const calculateRent = (state: GameState, space: (typeof board)[number], owner: Player, roll?: DiceRoll) => {
  const baseRent = space.rent ?? 10;
  if (space.kind === 'railroad') {
    const ownedRailroads = owner.properties.filter((spaceId) => board[spaceId]?.kind === 'railroad').length;
    const amount = 25 * 2 ** Math.max(0, ownedRailroads - 1);
    return {
      amount,
      hasMonopoly: false,
      note: `${ownedRailroads} railroad${ownedRailroads === 1 ? '' : 's'} owned`,
      logSuffix: ` (${ownedRailroads} railroad${ownedRailroads === 1 ? '' : 's'})`
    };
  }
  if (space.kind === 'utility') {
    const ownedUtilities = owner.properties.filter((spaceId) => board[spaceId]?.kind === 'utility').length;
    const multiplier = ownedUtilities >= 2 ? 10 : 4;
    const diceTotal = rollUtilityDice();
    return {
      amount: diceTotal * multiplier,
      hasMonopoly: false,
      note: `${ownedUtilities} utilit${ownedUtilities === 1 ? 'y' : 'ies'} owned: ${diceTotal} x ${multiplier}`,
      logSuffix: ` (${diceTotal} x ${multiplier} utility rent)`
    };
  }
  const improvementLevel = state.improvements?.[space.id] ?? 0;
  if (improvementLevel > 0) {
    return {
      amount: calculateImprovedRent(baseRent, improvementLevel),
      hasMonopoly: true,
      note: improvementLevel >= 5 ? 'Hotel rent' : `${improvementLevel} house${improvementLevel === 1 ? '' : 's'} rent`,
      logSuffix: improvementLevel >= 5 ? ' with hotel rent' : ` with ${improvementLevel} house${improvementLevel === 1 ? '' : 's'}`
    };
  }
  const hasMonopoly = ownerHasColorMonopoly(owner, space);
  return {
    amount: hasMonopoly ? baseRent * 2 : baseRent,
    hasMonopoly,
    note: hasMonopoly ? 'Monopoly rent doubled the base rent' : 'Base rent',
    logSuffix: hasMonopoly ? ' with monopoly rent' : ''
  };
};

const ownerHasColorMonopoly = (owner: Player, space: (typeof board)[number]) => {
  if (space.kind !== 'property' || !space.color) return false;
  const colorGroup = board.filter((candidate) => candidate.kind === 'property' && candidate.color === space.color);
  return colorGroup.length > 0 && colorGroup.every((candidate) => owner.properties.includes(candidate.id));
};

const canImproveProperty = (state: GameState, owner: Player, spaceId: number) => {
  const space = board[spaceId];
  if (!space || space.kind !== 'property' || !space.color) return false;
  if (!owner.properties.includes(spaceId) || !ownerHasColorMonopoly(owner, space)) return false;
  const group = getColorGroup(space);
  if (group.some((candidate) => owner.mortgagedProperties.includes(candidate.id))) return false;

  const level = state.improvements?.[spaceId] ?? 0;
  if (level >= 5) return false;
  if (level === 4) return group.every((candidate) => (state.improvements?.[candidate.id] ?? 0) >= 4);

  const lowestLevel = Math.min(...group.map((candidate) => state.improvements?.[candidate.id] ?? 0));
  return level <= lowestLevel;
};

const canSellImprovement = (state: GameState, owner: Player, spaceId: number) => {
  const space = board[spaceId];
  if (!space || space.kind !== 'property' || !space.color || !owner.properties.includes(spaceId)) return false;
  const level = state.improvements?.[spaceId] ?? 0;
  if (level <= 0) return false;
  const group = getColorGroup(space);
  if (level === 5) return true;
  const highestLevel = Math.max(...group.map((candidate) => {
    const candidateLevel = state.improvements?.[candidate.id] ?? 0;
    return candidateLevel >= 5 ? 4 : candidateLevel;
  }));
  return level >= highestLevel;
};

const calculateImprovedRent = (baseRent: number, improvementLevel: number) => {
  const multipliers: Record<number, number> = {
    1: 5,
    2: 15,
    3: 45,
    4: 80,
    5: 125
  };
  return baseRent * (multipliers[improvementLevel] ?? 1);
};

const getColorGroup = (space: (typeof board)[number]) =>
  board.filter((candidate) => candidate.kind === 'property' && candidate.color === space.color);

const getImprovementCost = (spaceId: number) => {
  if (spaceId <= 10) return 50;
  if (spaceId <= 20) return 100;
  if (spaceId <= 30) return 150;
  return 200;
};

const uniqueBuildableTradeIds = (spaceIds: number[], owner: Player) =>
  Array.from(new Set(spaceIds)).filter((spaceId) => owner.properties.includes(spaceId));

const sanitizeMoney = (amount: number) => Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));

const rollUtilityDice = () => Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

const canRaiseMoney = (state: GameState, player: Player) => {
  const hasUnmortgagedProperty = player.properties.some((spaceId) => !player.mortgagedProperties.includes(spaceId));
  const hasImprovements = player.properties.some((spaceId) => (state.improvements?.[spaceId] ?? 0) > 0);
  return hasUnmortgagedProperty || hasImprovements;
};

const chargeBank = (player: Player, amount: number, entries: LogEntry[]) => {
  if (player.money >= amount) return { ...player, money: player.money - amount };
  const charged = { ...player, money: 0 };
  return markBankrupt(charged, entries);
};

const normalizeCashAfterCard = (nextPlayer: Player, previousPlayer: Player, entries: LogEntry[]) => {
  if (nextPlayer.money >= 0) return nextPlayer;
  entries.push(log(`${previousPlayer.name} could only pay $${previousPlayer.money}.`));
  return markBankrupt({ ...nextPlayer, money: 0 }, entries);
};

const transferBankruptAssets = (
  players: Player[],
  debtorIndex: number,
  creditorIndex: number,
  improvements: GameState['improvements'],
  entries: LogEntry[]
) => {
  const debtor = players[debtorIndex];
  const creditor = players[creditorIndex];
  const transferredProperties = debtor.properties;
  const transferredMoney = Math.max(0, debtor.money);
  const nextImprovements = { ...improvements };
  transferredProperties.forEach((spaceId) => {
    delete nextImprovements[spaceId];
  });

  players[creditorIndex] = {
    ...creditor,
    money: creditor.money + transferredMoney,
    properties: [...creditor.properties, ...transferredProperties],
    mortgagedProperties: Array.from(new Set([...creditor.mortgagedProperties, ...transferredProperties]))
  };
  players[debtorIndex] = {
    ...debtor,
    money: 0,
    properties: [],
    mortgagedProperties: [],
    getOutOfJailFreeCards: 0
  };
  entries.push(log(`${debtor.name} gave ${creditor.name} all remaining money and mortgaged properties.`));

  return { improvements: nextImprovements };
};

const getMortgageValue = (spaceId: number) => Math.floor((board[spaceId]?.price ?? 0) / 2);

const getUnmortgageCost = (spaceId: number) => {
  const mortgageValue = getMortgageValue(spaceId);
  return mortgageValue + Math.ceil(mortgageValue * 0.1);
};

const deckLabel = (deck: CardDeck) => (deck === 'chance' ? 'Chance' : 'Community Chest');

const playerName = (state: GameState, playerId: string) =>
  state.players.find((player) => player.id === playerId)?.name ?? 'Player';

const markBankrupt = (player: Player, entries: LogEntry[]) => {
  if (player.money > 0 || player.bankrupt) return player;
  const unmortgagedProperties = player.properties.filter((spaceId) => !player.mortgagedProperties.includes(spaceId));
  if (unmortgagedProperties.length > 0) {
    entries.push(log(`${player.name} is out of cash and needs to mortgage property before being out.`));
    return player;
  }
  if (player.money === 0 && player.properties.length === 0) return player;
  entries.push(log(`${player.name} is bankrupt.`));
  return { ...player, bankrupt: true };
};

const finishTurn = (state: GameState, options: { forceAdvance?: boolean } = {}): GameState => {
  const activePlayers = state.players.filter((player) => !player.bankrupt);
  const gameOver = activePlayers.length === 1 && state.players.length > 1;
  const activePlayer = state.players[state.currentPlayerIndex];
  const rollsAgain = !options.forceAdvance && !activePlayer.inJail && Boolean(state.lastRoll?.isDouble) && (state.doubleRollCount ?? 0) > 0;

  return touch({
    ...state,
    phase: gameOver ? 'gameOver' : state.phase,
    currentPlayerIndex: gameOver || rollsAgain ? state.currentPlayerIndex : nextPlayerIndex(state.players, state.currentPlayerIndex),
    doubleRollCount: rollsAgain ? state.doubleRollCount : 0,
    jailRollMode: null,
    log:
      rollsAgain && !gameOver
        ? [log(`${state.players[state.currentPlayerIndex].name} rolled doubles and gets to roll again.`), ...state.log].slice(0, 30)
        : state.log
  });
};

const auctionPlayers = (state: GameState, auction: NonNullable<GameState['pendingAuction']>) =>
  state.players.filter((player) => !player.bankrupt && !auction.passedPlayerIds.includes(player.id));

const nextAuctionPlayer = (players: Player[], currentIndex: number, passedPlayerIds: string[]) => {
  const available = players.filter((player) => !player.bankrupt && !passedPlayerIds.includes(player.id));
  if (!available.length) return null;

  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = players[(currentIndex + offset + players.length) % players.length];
    if (available.some((player) => player.id === candidate.id)) return candidate;
  }

  return available[0];
};

const findOwner = (players: Player[], spaceId: number) =>
  players.find((player) => player.properties.includes(spaceId));

const nextPlayerIndex = (players: Player[], current: number) => {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = (current + offset) % players.length;
    if (!players[candidate].bankrupt) return candidate;
  }
  return current;
};

const touch = (state: GameState): GameState => ({ ...state, updatedAt: Date.now() });
