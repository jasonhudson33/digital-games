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
  apply?: (player: Player) => Player;
  resolve?: (state: GameState, playerIndex: number, entries: LogEntry[]) => GameState;
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
    resolve: (state, playerIndex) => grantJailFreeCard(state, playerIndex, 'chance')
  },
  {
    id: 'chance-investment-matures',
    title: 'Investment Matures',
    text: 'A long-term investment has reached its payout date.',
    actionText: 'Collect $150.',
    apply: (player) => ({ ...player, money: player.money + 150 })
  },
  {
    id: 'chance-board-chair',
    title: 'Board Chair Duties',
    text: 'Your new position comes with an expensive celebration.',
    actionText: 'Pay each other player $50.',
    resolve: (state, playerIndex, entries) => payEachPlayer(state, playerIndex, 50, entries)
  },
  {
    id: 'chance-property-repairs',
    title: 'Property Maintenance',
    text: 'Your buildings are due for repairs.',
    actionText: 'Pay $25 per house and $100 per hotel.',
    resolve: (state, playerIndex, entries) => payForRepairs(state, playerIndex, 25, 100, entries)
  },
  {
    id: 'chance-back-three',
    title: 'Take Three Steps Back',
    text: 'A surprise detour sends you backward.',
    actionText: 'Move back 3 spaces.',
    resolve: (state, playerIndex, entries) =>
      moveFromCard(state, playerIndex, (state.players[playerIndex].position + board.length - 3) % board.length, entries)
  },
  {
    id: 'chance-boardwalk',
    title: 'Visit Boardwalk',
    text: 'Head for the most prestigious address on the board.',
    actionText: 'Advance to Boardwalk.',
    resolve: (state, playerIndex, entries) => moveFromCard(state, playerIndex, 39, entries)
  },
  {
    id: 'chance-illinois',
    title: 'Visit Illinois Avenue',
    text: 'Your next stop is in the red property district.',
    actionText: 'Advance to Illinois Avenue.',
    resolve: (state, playerIndex, entries) => moveFromCard(state, playerIndex, 24, entries)
  },
  {
    id: 'chance-st-charles',
    title: 'Visit St. Charles Place',
    text: 'Travel to the first property in the magenta district.',
    actionText: 'Advance to St. Charles Place.',
    resolve: (state, playerIndex, entries) => moveFromCard(state, playerIndex, 11, entries)
  },
  {
    id: 'chance-reading-railroad',
    title: 'Ride the Reading Railroad',
    text: 'Catch the next train from the first railroad.',
    actionText: 'Advance to Reading Railroad.',
    resolve: (state, playerIndex, entries) => moveFromCard(state, playerIndex, 5, entries)
  },
  {
    id: 'chance-nearest-railroad-a',
    title: 'Next Railroad',
    text: 'Take the quickest route to the next railroad.',
    actionText: 'Advance to the next railroad. Pay double rent if owned.',
    resolve: (state, playerIndex, entries) =>
      moveFromCard(state, playerIndex, nextBoardSpace(state.players[playerIndex].position, [5, 15, 25, 35]), entries, {
        railroadRentMultiplier: 2
      })
  },
  {
    id: 'chance-nearest-railroad-b',
    title: 'Next Railroad',
    text: 'Your travel plans have changed. Head for the next station.',
    actionText: 'Advance to the next railroad. Pay double rent if owned.',
    resolve: (state, playerIndex, entries) =>
      moveFromCard(state, playerIndex, nextBoardSpace(state.players[playerIndex].position, [5, 15, 25, 35]), entries, {
        railroadRentMultiplier: 2
      })
  },
  {
    id: 'chance-nearest-utility',
    title: 'Next Utility',
    text: 'An urgent service call sends you to the next utility.',
    actionText: 'Advance to the next utility. If owned, roll and pay 10 times the total.',
    resolve: (state, playerIndex, entries) =>
      moveFromCard(state, playerIndex, nextBoardSpace(state.players[playerIndex].position, [12, 28]), entries, {
        utilityRentMultiplier: 10
      })
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
    resolve: (state, playerIndex) => grantJailFreeCard(state, playerIndex, 'community')
  },
  {
    id: 'community-advance-go',
    title: 'Advance to GO',
    text: 'Take a full trip around the board and collect your salary.',
    actionText: 'Move to GO and collect $200.',
    apply: (player) => ({ ...player, position: 0, money: player.money + 200 })
  },
  {
    id: 'community-go-jail',
    title: 'Go To Jail',
    text: 'Report directly to Jail without collecting a salary.',
    actionText: 'Move directly to Jail.',
    apply: (player) => ({ ...player, position: 10, inJail: true, jailTurnCount: 0 })
  },
  {
    id: 'community-holiday-fund',
    title: 'Holiday Fund Matures',
    text: 'Your seasonal savings account is ready.',
    actionText: 'Collect $100.',
    apply: (player) => ({ ...player, money: player.money + 100 })
  },
  {
    id: 'community-tax-refund',
    title: 'Income Tax Refund',
    text: 'The tax office found a small refund in your favor.',
    actionText: 'Collect $20.',
    apply: (player) => ({ ...player, money: player.money + 20 })
  },
  {
    id: 'community-birthday',
    title: 'Birthday Gifts',
    text: 'The other players celebrate your birthday.',
    actionText: 'Collect $10 from each other player.',
    resolve: (state, playerIndex, entries) => collectFromEachPlayer(state, playerIndex, 10, entries)
  },
  {
    id: 'community-life-insurance',
    title: 'Life Insurance Matures',
    text: 'A policy has reached its payout date.',
    actionText: 'Collect $100.',
    apply: (player) => ({ ...player, money: player.money + 100 })
  },
  {
    id: 'community-hospital-fees',
    title: 'Hospital Fees',
    text: 'A hospital bill has arrived.',
    actionText: 'Pay $100.',
    apply: (player) => ({ ...player, money: player.money - 100 })
  },
  {
    id: 'community-consultancy',
    title: 'Consulting Payment',
    text: 'A client pays for your professional advice.',
    actionText: 'Collect $25.',
    apply: (player) => ({ ...player, money: player.money + 25 })
  },
  {
    id: 'community-street-repairs',
    title: 'Street Repairs',
    text: 'The streets around your buildings need maintenance.',
    actionText: 'Pay $40 per house and $115 per hotel.',
    resolve: (state, playerIndex, entries) => payForRepairs(state, playerIndex, 40, 115, entries)
  },
  {
    id: 'community-beauty-prize',
    title: 'Contest Prize',
    text: 'Your presentation earned second place.',
    actionText: 'Collect $10.',
    apply: (player) => ({ ...player, money: player.money + 10 })
  },
  {
    id: 'community-inheritance',
    title: 'Inheritance',
    text: 'A relative left you a generous gift.',
    actionText: 'Collect $100.',
    apply: (player) => ({ ...player, money: player.money + 100 })
  }
];

export const makeInitialState = (hostId: string, hostName: string, roomCode = makeRoomCode(), piece: PlayerPiece = 'car'): GameState => ({
  roomCode,
  hostId,
  players: [makePlayer(hostId, hostName, 'red', piece)],
  currentPlayerIndex: 0,
  phase: 'lobby',
  turnStage: 'roll',
  turnStageVersion: 2,
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
  isComputer: false,
  color,
  piece,
  position: 0,
  money: 1500,
  properties: [],
  mortgagedProperties: [],
  getOutOfJailFreeCards: 0,
  getOutOfJailFreeCardDecks: [],
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

export const addComputerPlayer = (state: GameState): GameState => {
  if (state.phase !== 'lobby') return state;
  const computerNumber = state.players.filter((player) => player.isComputer).length + 1;
  const computerId = `computer-${makeId()}`;
  const next = joinPlayer(state, computerId, `Computer ${computerNumber}`);
  return touch({
    ...next,
    players: next.players.map((player) => player.id === computerId ? { ...player, isComputer: true } : player),
    log: [log(`Computer ${computerNumber} joined the room.`), ...next.log.slice(1)].slice(0, 30)
  });
};

export const startGame = (state: GameState): GameState =>
  touch({
    ...state,
    phase: 'playing',
    turnStage: 'roll',
    turnStageVersion: 2,
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
    state.turnStage !== 'roll' ||
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
    return finishTurn({
      ...state,
      players,
      lastRoll: roll,
      doubleRollCount: 0,
      jailRollMode: null,
      log: [
        log(`${active.name} rolled ${dieOne} + ${dieTwo}, their third doubles in a row, and went directly to Jail.`),
        ...state.log
      ].slice(0, 30)
    });
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
    return finishTurn({
      ...state,
      players,
      lastRoll: roll,
      doubleRollCount: 0,
      jailRollMode: null,
      log: [log(`${active.name} rolled ${dieOne} + ${dieTwo} and stayed in Jail (${jailTurnCount}/3).`), ...state.log].slice(0, 30)
    });
  }

  if (isTryingForJailDoubles && isDouble) {
    const players = [...state.players];
    players[state.currentPlayerIndex] = { ...active, inJail: false, jailTurnCount: 0 };
    return resolveLanding(touch({ ...state, players, lastRoll: roll, doubleRollCount: 0, jailRollMode: 'stay' }), roll);
  }

  return resolveLanding(touch({ ...state, lastRoll: roll, doubleRollCount }), roll);
};

export const finishManagementStage = (state: GameState, playerId: string): GameState => {
  const activePlayer = state.players[state.currentPlayerIndex];
  if (
    state.phase !== 'playing' ||
    state.turnStage !== 'manage' ||
    activePlayer?.id !== playerId ||
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
  const rollsAgain = !activePlayer.inJail && Boolean(state.lastRoll?.isDouble) && (state.doubleRollCount ?? 0) > 0;
  const nextIndex = rollsAgain ? state.currentPlayerIndex : nextPlayerIndex(state.players, state.currentPlayerIndex);
  const nextPlayer = state.players[nextIndex];
  return touch({
    ...state,
    turnStage: 'roll',
    currentPlayerIndex: nextIndex,
    doubleRollCount: rollsAgain ? state.doubleRollCount : 0,
    jailRollMode: null,
    log: [
      log(rollsAgain ? `${activePlayer.name} finished managing and may roll again.` : `${activePlayer.name} ended the turn. ${nextPlayer.name} rolls next.`),
      ...state.log
    ].slice(0, 30)
  });
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
  const freedPlayer = consumeJailFreeCard(player);
  players[playerIndex] = {
    ...freedPlayer,
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
  const next = {
    ...state,
    pendingCard: null,
    log: [log(`${playerName(state, state.pendingCard.playerId)} acknowledged the ${deckLabel(state.pendingCard.deck)} card.`), ...state.log].slice(0, 30)
  };
  const hasFollowUp =
    next.pendingPurchase ||
    next.pendingTax ||
    next.pendingRent ||
    next.pendingUtilityRent ||
    next.pendingDebt ||
    next.pendingAuction;
  return hasFollowUp ? touch(next) : finishTurn(next);
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
    const creditorIndex = debt.creditorId
      ? players.findIndex((candidate) => candidate.id === debt.creditorId)
      : -1;
    if (getPlayerLiquidationValue(state, player) < debt.amountOwed) {
      const entries: LogEntry[] = [];
      const result = creditorIndex >= 0
        ? transferBankruptAssets(players, playerIndex, creditorIndex, state.improvements, entries)
        : forfeitBankruptAssets(players, playerIndex, state.improvements, entries);
      return finishTurn({
        ...state,
        players,
        improvements: result.improvements,
        pendingDebt: null,
        pendingRent: null,
        pendingTax: null,
        pendingUtilityRent: null,
        log: [...entries, ...state.log].slice(0, 30)
      });
    }
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
  const owner = state.players[ownerIndex];
  const ownedUtilities = owner.properties.filter((spaceId) => board[spaceId]?.kind === 'utility').length;
  const multiplier = pending.multiplier === 10 ? 10 : ownedUtilities >= 2 ? 10 : 4;
  const amount = total * multiplier;
  const players = [...state.players];
  const payer = { ...players[playerIndex] };
  const rentPaid = Math.min(payer.money, amount);
  const entries: LogEntry[] = [
    log(`${payer.name} rolled ${dieOne} + ${dieTwo} for utility rent and paid ${owner.name} $${rentPaid}.`)
  ];
  if (rentPaid < amount) entries.push(log(`${payer.name} still owed $${amount - rentPaid} but had no more cash.`));

  payer.money -= rentPaid;
  players[ownerIndex] = { ...owner, money: owner.money + rentPaid };
  players[playerIndex] = markBankrupt(payer, entries);
  let nextImprovements = state.improvements;
  const amountOwed = amount - rentPaid;
  const cannotCoverDebt = amountOwed > 0 && getPlayerLiquidationValue(state, players[playerIndex]) < amountOwed;
  if (players[playerIndex].bankrupt || cannotCoverDebt) {
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
      rentNote: `${total} x ${multiplier} utility rent`
    },
    pendingDebt:
      rentPaid < amount && !cannotCoverDebt && canRaiseMoney(state, players[playerIndex])
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
  const colorGroup = space.kind === 'property' && space.color ? getColorGroup(space) : [space];
  if (colorGroup.some((candidate) => (state.improvements?.[candidate.id] ?? 0) > 0)) return state;
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
  const activePlayer = state.players[state.currentPlayerIndex];
  if (
    state.phase !== 'playing' ||
    state.turnStage !== 'manage' ||
    activePlayer?.id !== playerId ||
    playerIndex < 0 ||
    !space ||
    !canImproveProperty(state, state.players[playerIndex], spaceId)
  ) return state;

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
    state.phase !== 'playing' ||
    state.turnStage !== 'manage' ||
    ![fromPlayerId, toPlayerId].includes(state.players[state.currentPlayerIndex]?.id) ||
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

  const offered = uniqueTradeablePropertyIds(state, offeredPropertyIds, fromPlayer);
  const requested = uniqueTradeablePropertyIds(state, requestedPropertyIds, toPlayer);
  const offeredSomething = offered.length > 0 || cleanOfferedMoney > 0 || cleanOfferedJailCards > 0;
  const requestedSomething = requested.length > 0 || cleanRequestedMoney > 0 || cleanRequestedJailCards > 0;
  if (!offeredSomething || !requestedSomething) return state;

  return touch({
    ...state,
    pendingTrade: {
      id: makeId(),
      expiresAt: Date.now() + 15_000,
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
  if (Date.now() >= trade.expiresAt) return expireTrade(state, trade.id);
  const fromIndex = state.players.findIndex((player) => player.id === trade.fromPlayerId);
  const toIndex = state.players.findIndex((player) => player.id === trade.toPlayerId);
  if (fromIndex < 0 || toIndex < 0) return { ...state, pendingTrade: null };

  const players = [...state.players];
  const fromPlayer = players[fromIndex];
  const toPlayer = players[toIndex];
  const offered = uniqueTradeablePropertyIds(state, trade.offeredPropertyIds, fromPlayer);
  const requested = uniqueTradeablePropertyIds(state, trade.requestedPropertyIds, toPlayer);
  const offeredMoney = sanitizeMoney(trade.offeredMoney ?? 0);
  const requestedMoney = sanitizeMoney(trade.requestedMoney ?? 0);
  const offeredJailCards = sanitizeMoney(trade.offeredJailCards ?? 0);
  const requestedJailCards = sanitizeMoney(trade.requestedJailCards ?? 0);
  if (
    offered.length !== new Set(trade.offeredPropertyIds).size ||
    requested.length !== new Set(trade.requestedPropertyIds).size
  ) {
    return touch({
      ...state,
      pendingTrade: null,
      log: [log(`${fromPlayer.name} and ${toPlayer.name}'s trade was canceled because a property has houses or a hotel.`), ...state.log].slice(0, 30)
    });
  }
  const offeredSomething = offered.length > 0 || offeredMoney > 0 || offeredJailCards > 0;
  const requestedSomething = requested.length > 0 || requestedMoney > 0 || requestedJailCards > 0;
  if (!offeredSomething || !requestedSomething) {
    return touch({
      ...state,
      pendingTrade: null,
      log: [log(`${fromPlayer.name} and ${toPlayer.name}'s trade was canceled because both players must give something.`), ...state.log].slice(0, 30)
    });
  }
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

  const fromJailCardDecks = fromPlayer.getOutOfJailFreeCardDecks ?? [];
  const toJailCardDecks = toPlayer.getOutOfJailFreeCardDecks ?? [];
  const offeredJailCardDecks = fromJailCardDecks.slice(0, offeredJailCards);
  const requestedJailCardDecks = toJailCardDecks.slice(0, requestedJailCards);

  players[fromIndex] = {
    ...fromPlayer,
    money: fromPlayer.money - offeredMoney + requestedMoney,
    getOutOfJailFreeCards: fromPlayer.getOutOfJailFreeCards - offeredJailCards + requestedJailCards,
    getOutOfJailFreeCardDecks: [
      ...fromJailCardDecks.slice(offeredJailCards),
      ...requestedJailCardDecks
    ],
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
    getOutOfJailFreeCardDecks: [
      ...toJailCardDecks.slice(requestedJailCards),
      ...offeredJailCardDecks
    ],
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

export const expireTrade = (state: GameState, tradeId: string, now = Date.now()): GameState => {
  const trade = state.pendingTrade;
  if (!trade || trade.id !== tradeId || now < trade.expiresAt) return state;
  return touch({
    ...state,
    pendingTrade: null,
    log: [log(`${playerName(state, trade.toPlayerId)} did not respond in time, so ${playerName(state, trade.fromPlayerId)}'s trade was declined.`), ...state.log].slice(0, 30)
  });
};

export const computerShouldAct = (state: GameState): boolean => {
  if (state.phase !== 'playing') return false;
  if (state.pendingTrade) return Boolean(findPlayer(state, state.pendingTrade.toPlayerId)?.isComputer);
  if (state.pendingAuction) return Boolean(findPlayer(state, state.pendingAuction.activePlayerId)?.isComputer);
  const pendingPlayerId =
    state.pendingCard?.playerId ??
    state.pendingPurchase?.playerId ??
    state.pendingTax?.playerId ??
    state.pendingRent?.payerId ??
    state.pendingUtilityRent?.payerId ??
    state.pendingDebt?.playerId ??
    state.pendingJailExit?.playerId;
  if (pendingPlayerId) return Boolean(findPlayer(state, pendingPlayerId)?.isComputer);
  return Boolean(state.players[state.currentPlayerIndex]?.isComputer);
};

export const takeComputerAction = (state: GameState): GameState => {
  if (!computerShouldAct(state)) return state;

  if (state.pendingTrade) {
    return computerAcceptsTrade(state) ? acceptTrade(state) : declineTrade(state);
  }

  if (state.pendingAuction) {
    const auction = state.pendingAuction;
    const bidder = findPlayer(state, auction.activePlayerId);
    const space = board[auction.spaceId];
    if (!bidder?.isComputer || !space) return state;
    const nextBid = auction.currentBid + 10;
    const maximumBid = Math.min(space.price ?? 0, Math.max(0, bidder.money - 200));
    return auction.highBidderId !== bidder.id && nextBid <= maximumBid ? bidAuction(state) : passAuction(state);
  }

  const computer = state.players[state.currentPlayerIndex];
  if (!computer?.isComputer) return state;
  if (state.pendingCard) return acknowledgeCard(state);
  if (state.pendingPurchase) {
    const price = board[state.pendingPurchase.spaceId]?.price ?? 0;
    return price > 0 && computer.money - price >= 200 ? buyPendingProperty(state) : declinePendingProperty(state);
  }
  if (state.pendingTax) {
    return state.pendingTax.percentAmount < state.pendingTax.flatAmount ? payPercentIncomeTax(state) : payFlatIncomeTax(state);
  }
  if (state.pendingUtilityRent) return rollUtilityRent(state);
  if (state.pendingDebt) return raiseComputerDebtMoney(state, computer);
  if (state.pendingRent) return acknowledgeRent(state);
  if (state.pendingJailExit) {
    return computer.getOutOfJailFreeCards > 0 ? useCardForForcedJailExit(state) : payForcedJailExit(state);
  }

  if (state.turnStage === 'manage') {
    let managedState = state;
    for (let purchase = 0; purchase < 20; purchase += 1) {
      const managedComputer = managedState.players[managedState.currentPlayerIndex];
      const buildableSpaceId = managedComputer.properties.find(
        (spaceId) => canImproveProperty(managedState, managedComputer, spaceId) && managedComputer.money - getImprovementCost(spaceId) >= 300
      );
      if (buildableSpaceId === undefined) return finishManagementStage(managedState, managedComputer.id);
      managedState = buyImprovement(managedState, managedComputer.id, buildableSpaceId);
    }
    return finishManagementStage(managedState, computer.id);
  }

  if (computer.inJail && !state.jailRollMode) {
    if (computer.getOutOfJailFreeCards > 0) return useGetOutOfJailFree(state);
    return computer.money >= 250 ? payToLeaveJail(state) : stayInJailAndRoll(state);
  }
  return rollDice(state);
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
  const playerAfterCard = option === 'card' ? consumeJailFreeCard(player) : player;
  const freedBeforeCharge = {
    ...playerAfterCard,
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

type LandingOptions = {
  deferTurnEnd?: boolean;
  railroadRentMultiplier?: number;
  utilityRentMultiplier?: number;
};

const resolvePostMoveSpace = (
  state: GameState,
  playerIndex: number,
  landingEntries: LogEntry[] = [],
  roll?: DiceRoll,
  options: LandingOptions = {}
): GameState => {
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
    const card = drawCard(deck, seed, state);
    let cardState: GameState;
    if (card.resolve) {
      players[playerIndex] = active;
      cardState = card.resolve({ ...state, players }, playerIndex, entries);
    } else {
      const cardResult = normalizeCashAfterCard(card.apply?.(active) ?? active, active, entries);
      Object.assign(active, cardResult);
      players[playerIndex] = markBankrupt(active, entries);
      cardState = { ...state, players };
    }
    const cardPlayer = cardState.players[playerIndex];
    const cardLog = log(`${cardPlayer.name} drew ${card.title}: ${card.actionText}`);

    return touch({
      ...cardState,
      pendingCard: {
        id: `${card.id}-${seed}`,
        deck,
        title: card.title,
        text: card.text,
        actionText: card.actionText,
        playerId: cardPlayer.id
      },
      log: [cardLog, ...cardState.log].slice(0, 30)
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
      const multiplier = options.utilityRentMultiplier ?? (ownedUtilities >= 2 ? 10 : 4);
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
    const railroadMultiplier = space.kind === 'railroad' ? options.railroadRentMultiplier ?? 1 : 1;
    const rent = rentDetails.amount * railroadMultiplier;
    const hasMonopoly = rentDetails.hasMonopoly;
    const rentPaid = Math.min(active.money, rent);
    active.money -= rentPaid;
    const ownerIndex = players.findIndex((player) => player.id === owner.id);
    players[ownerIndex] = { ...players[ownerIndex], money: players[ownerIndex].money + rentPaid };
    const specialRentSuffix = railroadMultiplier > 1 ? ` at ${railroadMultiplier}x rent` : rentDetails.logSuffix;
    entries.push(log(`${active.name} paid ${owner.name} $${rentPaid} rent for ${space.name}${specialRentSuffix}.`));
    if (rentPaid < rent) entries.push(log(`${active.name} still owed $${rent - rentPaid} but had no more cash.`));
    players[playerIndex] = markBankrupt(active, entries);
    let nextImprovements = state.improvements;
    const amountOwed = rent - rentPaid;
    const cannotCoverDebt = amountOwed > 0 && getPlayerLiquidationValue(state, players[playerIndex]) < amountOwed;
    if (players[playerIndex].bankrupt || cannotCoverDebt) {
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
        rentNote: railroadMultiplier > 1 ? `${rentDetails.note}; ${railroadMultiplier}x Chance rent` : rentDetails.note
      },
      pendingDebt:
        rentPaid < rent && !cannotCoverDebt && canRaiseMoney(state, players[playerIndex])
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

  const next = {
    ...state,
    players,
    log: [...entries.reverse(), ...state.log].slice(0, 30)
  };
  return options.deferTurnEnd ? touch(next) : finishTurn(next);
};

const nextBoardSpace = (position: number, destinations: number[]) =>
  destinations.find((destination) => destination > position) ?? destinations[0];

const moveFromCard = (
  state: GameState,
  playerIndex: number,
  destination: number,
  entries: LogEntry[],
  options: LandingOptions = {}
) => {
  const players = [...state.players];
  const active = { ...players[playerIndex] };
  const previous = active.position;
  active.position = destination;
  if (destination < previous) {
    active.money += 200;
    entries.push(log(`${active.name} passed GO and collected $200.`));
  }
  players[playerIndex] = active;
  entries.push(log(`${active.name} advanced to ${board[destination].name}.`));
  return resolvePostMoveSpace({ ...state, players }, playerIndex, entries, undefined, {
    ...options,
    deferTurnEnd: true
  });
};

const payEachPlayer = (state: GameState, playerIndex: number, amount: number, entries: LogEntry[]) => {
  const players = state.players.map((player) => ({ ...player }));
  const active = players[playerIndex];
  let totalPaid = 0;

  players.forEach((player, index) => {
    if (index === playerIndex || active.money <= 0) return;
    const paid = Math.min(amount, active.money);
    active.money -= paid;
    player.money += paid;
    totalPaid += paid;
  });

  const totalOwed = amount * Math.max(0, players.length - 1);
  entries.push(log(`${active.name} paid the other players $${totalPaid} of $${totalOwed} owed.`));
  players[playerIndex] = markBankrupt(active, entries);
  return { ...state, players };
};

const collectFromEachPlayer = (state: GameState, playerIndex: number, amount: number, entries: LogEntry[]) => {
  const players = state.players.map((player) => ({ ...player }));
  const active = players[playerIndex];
  let totalCollected = 0;

  players.forEach((player, index) => {
    if (index === playerIndex || player.bankrupt) return;
    const paid = Math.min(amount, player.money);
    player.money -= paid;
    active.money += paid;
    totalCollected += paid;
    players[index] = markBankrupt(player, entries);
  });

  entries.push(log(`${active.name} collected $${totalCollected} from the other players.`));
  return { ...state, players };
};

const payForRepairs = (
  state: GameState,
  playerIndex: number,
  houseCost: number,
  hotelCost: number,
  entries: LogEntry[]
) => {
  const players = [...state.players];
  const active = players[playerIndex];
  const repairCost = active.properties.reduce((total, spaceId) => {
    const level = state.improvements?.[spaceId] ?? 0;
    return total + (level >= 5 ? hotelCost : level * houseCost);
  }, 0);
  const charged = normalizeCashAfterCard({ ...active, money: active.money - repairCost }, active, entries);
  players[playerIndex] = markBankrupt(charged, entries);
  entries.push(log(`${active.name} paid $${Math.min(active.money, repairCost)} for property repairs.`));
  return { ...state, players };
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

const drawCard = (deck: CardDeck, seed: number, state: GameState) => {
  const jailCardIsHeld = state.players.some((player) => player.getOutOfJailFreeCardDecks?.includes(deck));
  const cards = (deck === 'chance' ? chanceCards : communityCards).filter(
    (card) => !jailCardIsHeld || card.id !== `${deck}-jail-free`
  );
  return cards[seed % cards.length];
};

const grantJailFreeCard = (state: GameState, playerIndex: number, deck: CardDeck): GameState => {
  const players = [...state.players];
  const player = players[playerIndex];
  if (player.getOutOfJailFreeCardDecks?.includes(deck)) return state;
  players[playerIndex] = {
    ...player,
    getOutOfJailFreeCards: player.getOutOfJailFreeCards + 1,
    getOutOfJailFreeCardDecks: [...(player.getOutOfJailFreeCardDecks ?? []), deck]
  };
  return { ...state, players };
};

const consumeJailFreeCard = (player: Player): Player => ({
  ...player,
  getOutOfJailFreeCards: Math.max(0, player.getOutOfJailFreeCards - 1),
  getOutOfJailFreeCardDecks: (player.getOutOfJailFreeCardDecks ?? []).slice(1)
});

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
  return colorGroup.length > 0 && colorGroup.every(
    (candidate) => owner.properties.includes(candidate.id) && !owner.mortgagedProperties.includes(candidate.id)
  );
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

const uniqueTradeablePropertyIds = (state: GameState, spaceIds: number[], owner: Player) =>
  Array.from(new Set(spaceIds)).filter(
    (spaceId) => owner.properties.includes(spaceId) && (state.improvements?.[spaceId] ?? 0) === 0
  );

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
  const liquidationProceeds = getRemainingLiquidationProceeds({ improvements }, debtor);
  const transferredMoney = Math.max(0, debtor.money + liquidationProceeds);
  const nextImprovements = { ...improvements };
  transferredProperties.forEach((spaceId) => {
    delete nextImprovements[spaceId];
  });

  players[creditorIndex] = {
    ...creditor,
    money: creditor.money + transferredMoney,
    properties: [...creditor.properties, ...transferredProperties],
    mortgagedProperties: Array.from(new Set([...creditor.mortgagedProperties, ...transferredProperties])),
    getOutOfJailFreeCards: creditor.getOutOfJailFreeCards + debtor.getOutOfJailFreeCards,
    getOutOfJailFreeCardDecks: [
      ...(creditor.getOutOfJailFreeCardDecks ?? []),
      ...(debtor.getOutOfJailFreeCardDecks ?? [])
    ]
  };
  players[debtorIndex] = {
    ...debtor,
    money: 0,
    properties: [],
    mortgagedProperties: [],
    getOutOfJailFreeCards: 0,
    getOutOfJailFreeCardDecks: [],
    bankrupt: true
  };
  entries.push(log(`${debtor.name} could not cover the debt, transferred $${transferredMoney} and all remaining deeds to ${creditor.name}, and left the game.`));

  return { improvements: nextImprovements };
};

const forfeitBankruptAssets = (
  players: Player[],
  debtorIndex: number,
  improvements: GameState['improvements'],
  entries: LogEntry[]
) => {
  const debtor = players[debtorIndex];
  const nextImprovements = { ...improvements };
  debtor.properties.forEach((spaceId) => delete nextImprovements[spaceId]);
  players[debtorIndex] = {
    ...debtor,
    money: 0,
    properties: [],
    mortgagedProperties: [],
    getOutOfJailFreeCards: 0,
    getOutOfJailFreeCardDecks: [],
    bankrupt: true
  };
  entries.push(log(`${debtor.name} could not cover the bank debt, returned all remaining assets to the bank, and left the game.`));
  return { improvements: nextImprovements };
};

const getMortgageValue = (spaceId: number) => Math.floor((board[spaceId]?.price ?? 0) / 2);

const getRemainingLiquidationProceeds = (state: Pick<GameState, 'improvements'>, player: Player) => {
  const mortgageProceeds = player.properties.reduce(
    (total, spaceId) => total + (player.mortgagedProperties.includes(spaceId) ? 0 : getMortgageValue(spaceId)),
    0
  );
  const buildingProceeds = player.properties.reduce((total, spaceId) => {
    const level = state.improvements?.[spaceId] ?? 0;
    return total + level * Math.floor(getImprovementCost(spaceId) / 2);
  }, 0);
  return mortgageProceeds + buildingProceeds;
};

export const getPlayerLiquidationValue = (state: Pick<GameState, 'improvements'>, player: Player) =>
  Math.max(0, player.money) + getRemainingLiquidationProceeds(state, player);

const getUnmortgageCost = (spaceId: number) => {
  const mortgageValue = getMortgageValue(spaceId);
  return mortgageValue + Math.ceil(mortgageValue * 0.1);
};

const deckLabel = (deck: CardDeck) => (deck === 'chance' ? 'Chance' : 'Community Chest');

const playerName = (state: GameState, playerId: string) =>
  state.players.find((player) => player.id === playerId)?.name ?? 'Player';

const findPlayer = (state: GameState, playerId: string) =>
  state.players.find((player) => player.id === playerId);

const computerAcceptsTrade = (state: GameState) => {
  const trade = state.pendingTrade;
  if (!trade) return false;
  const fromPlayer = findPlayer(state, trade.fromPlayerId);
  const toPlayer = findPlayer(state, trade.toPlayerId);
  if (!fromPlayer || !toPlayer?.isComputer) return false;
  const sideValue = (propertyIds: number[], money: number, jailCards: number) =>
    propertyIds.reduce((total, spaceId) => total + (board[spaceId]?.price ?? 0), 0) + money + jailCards * 50;
  const computerReceives = sideValue(trade.offeredPropertyIds, trade.offeredMoney, trade.offeredJailCards);
  const computerGives = sideValue(trade.requestedPropertyIds, trade.requestedMoney, trade.requestedJailCards);
  return computerReceives >= computerGives;
};

const raiseComputerDebtMoney = (state: GameState, computer: Player): GameState => {
  const debt = state.pendingDebt;
  if (!debt || debt.playerId !== computer.id || computer.money >= debt.amountOwed) return finishDebtPayment(state);

  const sellableSpaceId = computer.properties.find((spaceId) => canSellImprovement(state, computer, spaceId));
  if (sellableSpaceId !== undefined) return sellImprovement(state, computer.id, sellableSpaceId);

  for (const spaceId of computer.properties) {
    const next = mortgageProperty(state, computer.id, spaceId);
    if (next !== state) return next;
  }
  return finishDebtPayment(state);
};

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

const finishTurn = (state: GameState): GameState => {
  const activePlayers = state.players.filter((player) => !player.bankrupt);
  const gameOver = activePlayers.length === 1 && state.players.length > 1;
  const winner = gameOver ? activePlayers[0] : null;
  const winnerIndex = winner ? state.players.findIndex((player) => player.id === winner.id) : -1;
  const justFinished = gameOver && state.phase !== 'gameOver';
  const activePlayer = state.players[state.currentPlayerIndex];

  if (!gameOver && activePlayer.bankrupt) {
    return touch({
      ...state,
      turnStage: 'roll',
      currentPlayerIndex: nextPlayerIndex(state.players, state.currentPlayerIndex),
      doubleRollCount: 0,
      jailRollMode: null
    });
  }

  return touch({
    ...state,
    phase: gameOver ? 'gameOver' : state.phase,
    turnStage: 'manage',
    currentPlayerIndex: gameOver ? winnerIndex : state.currentPlayerIndex,
    jailRollMode: null,
    pendingCard: gameOver ? null : state.pendingCard,
    pendingPurchase: gameOver ? null : state.pendingPurchase,
    pendingTax: gameOver ? null : state.pendingTax,
    pendingRent: gameOver ? null : state.pendingRent,
    pendingUtilityRent: gameOver ? null : state.pendingUtilityRent,
    pendingDebt: gameOver ? null : state.pendingDebt,
    pendingAuction: gameOver ? null : state.pendingAuction,
    pendingJailExit: gameOver ? null : state.pendingJailExit,
    pendingTrade: gameOver ? null : state.pendingTrade,
    log:
      justFinished && winner
        ? [log(`${winner.name} won the game!`), ...state.log].slice(0, 30)
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

const touch = (state: GameState): GameState => {
  const activePlayers = state.players.filter((player) => !player.bankrupt);
  if (state.phase === 'playing' && activePlayers.length === 1 && state.players.length > 1) {
    const winner = activePlayers[0];
    return {
      ...state,
      phase: 'gameOver',
      currentPlayerIndex: state.players.findIndex((player) => player.id === winner.id),
      pendingCard: null,
      pendingPurchase: null,
      pendingTax: null,
      pendingRent: null,
      pendingUtilityRent: null,
      pendingDebt: null,
      pendingAuction: null,
      pendingJailExit: null,
      pendingTrade: null,
      log: [log(`${winner.name} won the game!`), ...state.log].slice(0, 30),
      updatedAt: Date.now()
    };
  }
  return { ...state, updatedAt: Date.now() };
};
