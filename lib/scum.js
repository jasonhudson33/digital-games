export const SCUM_SUITS = ["clubs", "diamonds", "hearts", "spades"];
export const SCUM_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const SCUM_SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
  "joker-red": "★",
  "joker-black": "★",
};

const BOT_NAMES = [
  "Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash", "Remy",
  "Sage", "Quinn", "Indigo", "Lane", "Wren", "Ellis", "Scout", "Rio",
];
const SUIT_ORDER = [...SCUM_SUITS, "joker-black", "joker-red"];

export function scumRankLabel(rank) {
  return { 11: "J", 12: "Q", 13: "K", 14: "A", 15: "Joker" }[rank] || String(rank);
}

export function scumPlaceName(place, playerCount) {
  if (place === 1) return "President";
  if (place === playerCount) return "Scum";
  if (place === 2 && playerCount > 3) return "Vice President";
  if (place === playerCount - 1 && playerCount > 3) return "Vice Scum";
  return "Citizen";
}

export function getScumDeckCount(playerCount) {
  return Math.ceil(playerCount / 4);
}

export function getScumTradeGroups(standings, passGroupCount) {
  const groupCount = Math.min(Math.max(0, Math.floor(passGroupCount)), Math.floor(standings.length / 2));
  return Array.from({ length: groupCount }, (_, groupIndex) => ({
    upperPlayerIndex: standings[groupIndex],
    lowerPlayerIndex: standings[standings.length - 1 - groupIndex],
    count: groupCount - groupIndex,
    upperPlace: groupIndex + 1,
    lowerPlace: standings.length - groupIndex,
  }));
}

export function createScumDeck(deckCount = 1) {
  return Array.from({ length: deckCount }, (_, copy) => [
    ...SCUM_RANKS.filter((rank) => rank !== 15).flatMap((rank) =>
      SCUM_SUITS.map((suit) => ({
        id: `${copy}-${rank}-${suit}`,
        rank,
        suit,
        copy,
      }))
    ),
    { id: `${copy}-15-joker-black`, rank: 15, suit: "joker-black", copy },
    { id: `${copy}-15-joker-red`, rank: 15, suit: "joker-red", copy },
  ]).flat();
}

export function shuffleScumDeck(deck, random = Math.random) {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function sortScumHand(hand) {
  return [...hand].sort(
    (a, b) => a.rank - b.rank || SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) || (a.copy || 0) - (b.copy || 0)
  );
}

export function createScumGame({
  playerName = "You",
  playerCount = 4,
  playerSeeds = null,
  passGroupCount = 1,
  dealerIndex = null,
  random = Math.random,
} = {}) {
  const seats = Array.isArray(playerSeeds) && playerSeeds.length >= 3 ? playerSeeds : null;
  const normalizedPlayerCount = seats?.length ?? Math.max(3, Math.floor(Number(playerCount) || 4));
  const deckCount = getScumDeckCount(normalizedPlayerCount);
  const normalizedPassGroupCount = Math.min(
    Math.floor(normalizedPlayerCount / 2),
    Math.max(0, Math.floor(Number(passGroupCount) || 0))
  );
  const requestedDealer = dealerIndex === null ? normalizedPlayerCount - 1 : dealerIndex;
  const normalizedDealer = ((requestedDealer % normalizedPlayerCount) + normalizedPlayerCount) % normalizedPlayerCount;
  const deck = shuffleScumDeck(createScumDeck(deckCount), random);
  const playerSetup = seats
    ? seats.map((seat, id) => ({
        id,
        playerId: seat.playerId ?? seat.id ?? String(id),
        name: seat.name?.trim() || `Player ${id + 1}`,
        isComputer: Boolean(seat.isComputer),
        title: null,
      }))
    : Array.from({ length: normalizedPlayerCount }, (_, id) => ({
        id,
        playerId: String(id),
        name: id === 0 ? playerName.trim() || "You" : BOT_NAMES[id - 1] || `Player ${id + 1}`,
        isComputer: id !== 0,
        title: null,
      }));
  const players = dealScumCards(playerSetup, deck);
  const openingPlayerIndex = (normalizedDealer + 1) % normalizedPlayerCount;
  const turnOrder = Array.from(
    { length: normalizedPlayerCount },
    (_, offset) => (openingPlayerIndex + offset) % normalizedPlayerCount
  );

  return {
    players,
    playerCount: normalizedPlayerCount,
    deckCount,
    passGroupCount: normalizedPassGroupCount,
    dealerIndex: normalizedDealer,
    roundNumber: 1,
    turnOrder,
    currentPlayerIndex: openingPlayerIndex,
    pile: null,
    passed: [],
    lastPlayerIndex: null,
    continuationPlayerIndex: null,
    standings: [],
    phase: "playing",
    turnNumber: 1,
    message: `${players[normalizedDealer].name} dealt. ${players[openingPlayerIndex].name}, to their left, leads.`,
    history: [],
  };
}

export function startNextScumRound(state, random = Math.random) {
  if (state.phase !== "finished" || !state.standings.length) return state;
  const playerCount = state.playerCount || state.players.length;
  const deckCount = state.deckCount || getScumDeckCount(playerCount);
  const presidentIndex = state.standings[0];
  const pendingTrades = getScumTradeGroups(state.standings, state.passGroupCount ?? 1);
  const deck = shuffleScumDeck(createScumDeck(deckCount), random);
  const players = dealScumCards(
    state.players.map((player) => ({
      id: player.id,
      playerId: player.playerId,
      name: player.name,
      isComputer: Boolean(player.isComputer),
      title: scumPlaceName(player.place, playerCount),
    })),
    deck
  );

  return {
    ...state,
    players,
    playerCount,
    deckCount,
    roundNumber: (state.roundNumber || 1) + 1,
    turnOrder: [...state.standings],
    currentPlayerIndex: presidentIndex,
    pile: null,
    passed: [],
    lastPlayerIndex: null,
    continuationPlayerIndex: null,
    standings: [],
    phase: pendingTrades.length ? "trading" : "playing",
    pendingTrades,
    tradeSelections: {},
    turnNumber: 1,
    message: pendingTrades.length
      ? `${pendingTrades.length} class ${pendingTrades.length === 1 ? "trade" : "trades"} must finish before the President leads.`
      : `${players[presidentIndex].name}, the President, leads the new round.`,
    history: [],
  };
}

export function completeScumTrades(state, humanCardIds = []) {
  if (state.phase !== "trading") return state;
  const selections = Object.fromEntries(
    (state.pendingTrades || []).map((trade) => [
      trade.upperPlayerIndex,
      trade.upperPlayerIndex === 0
        ? humanCardIds
        : state.players[trade.upperPlayerIndex].hand.slice(0, trade.count).map((card) => card.id),
    ])
  );
  return resolveScumTrades(state, selections);
}

export function submitScumTrade(state, playerIndex, cardIds) {
  if (state.phase !== "trading") return state;
  const trades = state.pendingTrades || [];
  const trade = trades.find((candidate) => candidate.upperPlayerIndex === playerIndex);
  if (!trade || state.tradeSelections?.[playerIndex]) return state;
  const validIds = new Set(state.players[playerIndex].hand.map((card) => card.id));
  if (cardIds.length !== trade.count || cardIds.some((id) => !validIds.has(id))) return state;

  const tradeSelections = { ...(state.tradeSelections || {}), [playerIndex]: [...cardIds] };
  if (trades.some((candidate) => !tradeSelections[candidate.upperPlayerIndex])) {
    return {
      ...state,
      tradeSelections,
      message: `${state.players[playerIndex].name} chose their class trade. Waiting for the remaining upper classes.`,
    };
  }
  return resolveScumTrades(state, tradeSelections);
}

function resolveScumTrades(state, selections) {
  const trades = state.pendingTrades || [];
  for (const trade of trades) {
    const validIds = new Set(state.players[trade.upperPlayerIndex].hand.map((card) => card.id));
    const selectedIds = selections[trade.upperPlayerIndex] || [];
    if (selectedIds.length !== trade.count || selectedIds.some((id) => !validIds.has(id))) return state;
  }

  const outgoingByPlayer = new Map();
  const incomingByPlayer = new Map();
  for (const trade of trades) {
    const upperHand = state.players[trade.upperPlayerIndex].hand;
    const lowerHand = state.players[trade.lowerPlayerIndex].hand;
    const upperIds = new Set(selections[trade.upperPlayerIndex]);
    const upperCards = upperHand.filter((card) => upperIds.has(card.id));
    const lowerCards = lowerHand.slice(-trade.count);

    outgoingByPlayer.set(trade.upperPlayerIndex, upperCards);
    outgoingByPlayer.set(trade.lowerPlayerIndex, lowerCards);
    incomingByPlayer.set(trade.upperPlayerIndex, lowerCards);
    incomingByPlayer.set(trade.lowerPlayerIndex, upperCards);
  }

  const players = state.players.map((player, playerIndex) => {
    const outgoingIds = new Set((outgoingByPlayer.get(playerIndex) || []).map((card) => card.id));
    return {
      ...player,
      hand: sortScumHand([
        ...player.hand.filter((card) => !outgoingIds.has(card.id)),
        ...(incomingByPlayer.get(playerIndex) || []),
      ]),
    };
  });
  const presidentIndex = state.turnOrder[0];

  return {
    ...state,
    players,
    phase: "playing",
    pendingTrades: [],
    tradeSelections: {},
    message: `Class trades complete. ${players[presidentIndex].name}, the President, leads.`,
  };
}

export function getLegalScumPlays(state, playerIndex) {
  if (
    state.phase !== "playing" ||
    state.currentPlayerIndex !== playerIndex ||
    state.players[playerIndex].place ||
    state.passed.includes(playerIndex)
  ) {
    return [];
  }

  const hand = state.players[playerIndex].hand;
  const jokers = hand.filter(isJoker);
  const groups = Object.values(groupByRank(hand.filter((card) => !isJoker(card))));
  const plays = [];

  for (const cards of groups) {
    if (state.pile && cards[0].rank <= state.pile.rank) continue;
    const candidateCounts = state.pile
      ? [state.pile.count]
      : Array.from({ length: cards.length + jokers.length }, (_, index) => index + 1);

    for (const count of candidateCounts) {
      const minimumJokers = Math.max(0, count - cards.length);
      const maximumJokers = Math.min(jokers.length, count - 1);
      for (let jokerCount = minimumJokers; jokerCount <= maximumJokers; jokerCount += 1) {
        const naturalCount = count - jokerCount;
        if (naturalCount > 0 && naturalCount <= cards.length) {
          plays.push([...cards.slice(0, naturalCount), ...jokers.slice(0, jokerCount)]);
        }
      }
    }
  }

  if (!state.pile || state.pile.rank < 15) {
    const pureJokerCounts = state.pile
      ? [state.pile.count]
      : Array.from({ length: jokers.length }, (_, index) => index + 1);
    for (const count of pureJokerCounts) {
      if (count <= jokers.length) plays.push(jokers.slice(0, count));
    }
  }

  return plays;
}

export function isLegalScumPlay(state, playerIndex, cardIds) {
  if (
    !cardIds.length ||
    state.phase !== "playing" ||
    state.currentPlayerIndex !== playerIndex ||
    state.players[playerIndex].place ||
    state.passed.includes(playerIndex)
  ) return false;
  const selected = state.players[playerIndex].hand.filter((card) => cardIds.includes(card.id));
  const naturalRanks = new Set(selected.filter((card) => !isJoker(card)).map((card) => card.rank));
  if (selected.length !== cardIds.length || naturalRanks.size > 1) return false;
  if (state.pile && selected.length !== state.pile.count) return false;
  if (state.pile && getScumPlayRank(selected) <= state.pile.rank) return false;
  return true;
}

export function chooseScumCardSelection(hand, cardId, currentIds = [], requiredCount = null) {
  const card = hand.find((candidate) => candidate.id === cardId);
  if (!card) return currentIds;
  if (currentIds.includes(cardId)) return [];

  if (requiredCount !== null) {
    const currentCards = hand.filter((candidate) => currentIds.includes(candidate.id));
    const allJokers = hand.filter(isJoker);

    if (isJoker(card)) {
      const selectedJokers = [...currentCards.filter(isJoker), card]
        .filter((candidate, index, cards) => cards.findIndex((item) => item.id === candidate.id) === index);
      const currentNatural = currentCards.find((candidate) => !isJoker(candidate));
      if (!currentNatural) {
        if (allJokers.length >= requiredCount) {
          return [card, ...allJokers.filter((candidate) => candidate.id !== card.id)]
            .slice(0, requiredCount)
            .map((candidate) => candidate.id);
        }
        return selectedJokers.map((candidate) => candidate.id);
      }

      const jokerCards = selectedJokers.slice(0, Math.max(1, requiredCount - 1));
      const matchingNaturals = hand.filter((candidate) => !isJoker(candidate) && candidate.rank === currentNatural.rank);
      const naturalCount = requiredCount - jokerCards.length;
      if (matchingNaturals.length < naturalCount) return currentIds;
      return [...matchingNaturals.slice(0, naturalCount), ...jokerCards].map((candidate) => candidate.id);
    }

    const selectedJokers = currentCards.filter(isJoker).slice(0, requiredCount - 1);
    const matchingNaturals = [
      card,
      ...hand.filter((candidate) => !isJoker(candidate) && candidate.rank === card.rank && candidate.id !== card.id),
    ];
    const naturalCount = requiredCount - selectedJokers.length;
    if (matchingNaturals.length >= naturalCount) {
      return [...matchingNaturals.slice(0, naturalCount), ...selectedJokers].map((candidate) => candidate.id);
    }
    const neededJokers = requiredCount - matchingNaturals.length;
    if (allJokers.length < neededJokers) return currentIds;
    return [...matchingNaturals, ...allJokers.slice(0, neededJokers)].map((candidate) => candidate.id);
  }

  const currentCards = hand.filter((candidate) => currentIds.includes(candidate.id));
  if (isJoker(card)) return [...currentIds, cardId];
  const currentNatural = currentCards.find((candidate) => !isJoker(candidate));
  if (currentNatural && currentNatural.rank !== card.rank) {
    return [...currentCards.filter(isJoker).map((candidate) => candidate.id), cardId];
  }
  return [...currentIds, cardId];
}

export function playScumCards(state, playerIndex, cardIds) {
  if (!isLegalScumPlay(state, playerIndex, cardIds)) return state;

  const selected = state.players[playerIndex].hand.filter((card) => cardIds.includes(card.id));
  const playedIds = new Set(selected.map((card) => card.id));
  let players = state.players.map((player, index) =>
    index === playerIndex
      ? { ...player, hand: player.hand.filter((card) => !playedIds.has(card.id)) }
      : player
  );
  let standings = [...state.standings];

  if (players[playerIndex].hand.length === 0) {
    const place = standings.length + 1;
    standings.push(playerIndex);
    players = players.map((player, index) => (index === playerIndex ? { ...player, place } : player));
  }

  if (standings.length === players.length - 1) {
    const lastIndex = players.findIndex((player) => !player.place);
    standings.push(lastIndex);
    players = players.map((player, index) =>
      index === lastIndex ? { ...player, place: players.length } : player
    );
    return {
      ...state,
      players,
      standings,
      phase: "finished",
      pile: { cards: selected, rank: getScumPlayRank(selected), count: selected.length, playerIndex },
      currentPlayerIndex: null,
      lastPlayerIndex: playerIndex,
      continuationPlayerIndex: null,
      message: `${players[standings[0]].name} is President. ${players[lastIndex].name} is Scum.`,
      history: addHistory(state, `${state.players[playerIndex].name} went out.`),
    };
  }

  const pile = { cards: selected, rank: getScumPlayRank(selected), count: selected.length, playerIndex };
  const base = {
    ...state,
    players,
    standings,
    pile,
    lastPlayerIndex: playerIndex,
    continuationPlayerIndex: null,
    turnNumber: state.turnNumber + 1,
    message: `${state.players[playerIndex].name} played ${describePlay(selected)}.`,
    history: addHistory(state, `${state.players[playerIndex].name} played ${describePlay(selected)}.`),
  };

  if (selected.length === 4) {
    return clearScumPile(base, playerIndex, "Four of a kind burns the pile.");
  }

  const nextPlayerIndex = nextEligiblePlayer(base, playerIndex);
  if (nextPlayerIndex === null) return clearScumPile(base, playerIndex, "The table is yours.");
  if (nextPlayerIndex === playerIndex) {
    const continuation = { ...base, currentPlayerIndex: playerIndex };
    if (!canPlayerContinue(continuation, playerIndex)) {
      return clearScumPile(base, playerIndex, "No higher play remains.");
    }
    return {
      ...continuation,
      continuationPlayerIndex: playerIndex,
      message: `${state.players[playerIndex].name} may continue or move on.`,
    };
  }
  return { ...base, currentPlayerIndex: nextPlayerIndex };
}

export function passScumTurn(state, playerIndex) {
  if (
    state.phase !== "playing" ||
    state.currentPlayerIndex !== playerIndex ||
    !state.pile ||
    state.continuationPlayerIndex === playerIndex ||
    state.passed.includes(playerIndex)
  ) {
    return state;
  }

  const passed = [...state.passed, playerIndex];
  const base = {
    ...state,
    passed,
    turnNumber: state.turnNumber + 1,
    message: `${state.players[playerIndex].name} passed.`,
    history: addHistory(state, `${state.players[playerIndex].name} passed.`),
  };
  const nextPlayerIndex = nextEligiblePlayer(base, playerIndex);
  if (nextPlayerIndex === null) {
    return clearScumPile(base, state.lastPlayerIndex, `${state.players[state.lastPlayerIndex].name} takes the table.`);
  }
  if (nextPlayerIndex === state.lastPlayerIndex) {
    const continuation = { ...base, currentPlayerIndex: nextPlayerIndex };
    if (!canPlayerContinue(continuation, nextPlayerIndex)) {
      return clearScumPile(base, nextPlayerIndex, `${state.players[nextPlayerIndex].name} takes the table.`);
    }
    return {
      ...continuation,
      continuationPlayerIndex: nextPlayerIndex,
      message: `Everyone else passed. ${state.players[nextPlayerIndex].name} may continue or move on.`,
    };
  }
  return { ...base, currentPlayerIndex: nextPlayerIndex, continuationPlayerIndex: null };
}

export function moveOnScumPile(state, playerIndex) {
  if (
    state.phase !== "playing" ||
    state.currentPlayerIndex !== playerIndex ||
    state.continuationPlayerIndex !== playerIndex ||
    !state.pile
  ) {
    return state;
  }

  return clearScumPile(state, playerIndex, `${state.players[playerIndex].name} moves on.`);
}

export function chooseScumBotPlay(state, playerIndex) {
  const legal = getLegalScumPlays(state, playerIndex);
  if (!legal.length) return null;
  if (state.pile) return [...legal].sort((a, b) => a[0].rank - b[0].rank)[0];

  const grouped = Object.values(groupByRank(state.players[playerIndex].hand));
  const lowestRank = Math.min(...grouped.map((cards) => cards[0].rank));
  return grouped.find((cards) => cards[0].rank === lowestRank);
}

function dealScumCards(playerSeeds, deck) {
  return playerSeeds.map((player, playerIndex) => ({
    ...player,
    hand: sortScumHand(deck.filter((_, cardIndex) => cardIndex % playerSeeds.length === playerIndex)),
    place: null,
  }));
}

function clearScumPile(state, preferredPlayerIndex, reason) {
  const currentPlayerIndex =
    preferredPlayerIndex !== null && !state.players[preferredPlayerIndex].place
      ? preferredPlayerIndex
      : nextActivePlayer(state, preferredPlayerIndex ?? 0);
  return {
    ...state,
    pile: null,
    passed: [],
    continuationPlayerIndex: null,
    currentPlayerIndex,
    message: `${reason} ${state.players[currentPlayerIndex].name} leads.`,
    history: addHistory(state, reason),
  };
}

function canPlayerContinue(state, playerIndex) {
  if (
    !state.pile ||
    !state.players[playerIndex] ||
    state.players[playerIndex].place ||
    state.passed.includes(playerIndex)
  ) {
    return false;
  }
  return getLegalScumPlays({ ...state, currentPlayerIndex: playerIndex }, playerIndex).length > 0;
}

function nextEligiblePlayer(state, fromIndex) {
  const turnOrder = getTurnOrder(state);
  const fromPosition = Math.max(0, turnOrder.indexOf(fromIndex));
  for (let offset = 1; offset <= turnOrder.length; offset += 1) {
    const index = turnOrder[(fromPosition + offset) % turnOrder.length];
    if (!state.players[index].place && !state.passed.includes(index)) return index;
  }
  return null;
}

function nextActivePlayer(state, fromIndex) {
  const turnOrder = getTurnOrder(state);
  const fromPosition = Math.max(0, turnOrder.indexOf(fromIndex));
  for (let offset = 1; offset <= turnOrder.length; offset += 1) {
    const index = turnOrder[(fromPosition + offset) % turnOrder.length];
    if (!state.players[index].place) return index;
  }
  return null;
}

function getTurnOrder(state) {
  return state.turnOrder?.length === state.players.length
    ? state.turnOrder
    : state.players.map((player) => player.id);
}

function groupByRank(hand) {
  return hand.reduce((groups, card) => {
    groups[card.rank] = [...(groups[card.rank] || []), card];
    return groups;
  }, {});
}

function describePlay(cards) {
  const rankValue = getScumPlayRank(cards);
  const rank = scumRankLabel(rankValue);
  const jokerCount = cards.filter(isJoker).length;
  let description;
  if (cards.length === 1) description = `a ${rank}`;
  else {
    const pluralRank = rankValue === 15 ? "Jokers" : `${rank}s`;
    if (cards.length === 2) description = `a pair of ${pluralRank}`;
    else if (cards.length === 3) description = `three ${pluralRank}`;
    else description = `${cards.length} ${pluralRank}`;
  }
  if (jokerCount && jokerCount < cards.length) {
    description += ` with ${jokerCount} wild ${jokerCount === 1 ? "Joker" : "Jokers"}`;
  }
  return description;
}

function isJoker(card) {
  return card.rank === 15;
}

function getScumPlayRank(cards) {
  return cards.find((card) => !isJoker(card))?.rank ?? 15;
}

function addHistory(state, text) {
  return [{ id: `${state.turnNumber}-${text}`, text }, ...state.history].slice(0, 8);
}
