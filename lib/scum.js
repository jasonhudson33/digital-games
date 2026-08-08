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
  dealerIndex = playerCount - 1,
  random = Math.random,
} = {}) {
  const normalizedPlayerCount = Math.max(3, Math.floor(Number(playerCount) || 4));
  const deckCount = getScumDeckCount(normalizedPlayerCount);
  const normalizedDealer = ((dealerIndex % normalizedPlayerCount) + normalizedPlayerCount) % normalizedPlayerCount;
  const deck = shuffleScumDeck(createScumDeck(deckCount), random);
  const names = Array.from({ length: normalizedPlayerCount }, (_, index) =>
    index === 0 ? playerName.trim() || "You" : BOT_NAMES[index - 1] || `Player ${index + 1}`
  );
  const players = dealScumCards(names.map((name, id) => ({ id, name, title: null })), deck);
  const openingPlayerIndex = (normalizedDealer + 1) % normalizedPlayerCount;

  return {
    players,
    playerCount: normalizedPlayerCount,
    deckCount,
    dealerIndex: normalizedDealer,
    roundNumber: 1,
    currentPlayerIndex: openingPlayerIndex,
    pile: null,
    passed: [],
    lastPlayerIndex: null,
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
  const deck = shuffleScumDeck(createScumDeck(deckCount), random);
  const players = dealScumCards(
    state.players.map((player) => ({
      id: player.id,
      name: player.name,
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
    currentPlayerIndex: presidentIndex,
    pile: null,
    passed: [],
    lastPlayerIndex: null,
    standings: [],
    phase: "playing",
    turnNumber: 1,
    message: `${players[presidentIndex].name}, the President, leads the new round.`,
    history: [],
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

  const groups = groupByRank(state.players[playerIndex].hand);
  return Object.values(groups).flatMap((cards) => {
    const count = state.pile?.count || cards.length;
    if (state.pile && (cards[0].rank <= state.pile.rank || cards.length < count)) return [];
    const candidateCounts = state.pile ? [count] : Array.from({ length: cards.length }, (_, index) => index + 1);
    return candidateCounts.map((candidateCount) => cards.slice(0, candidateCount));
  });
}

export function isLegalScumPlay(state, playerIndex, cardIds) {
  if (!cardIds.length) return false;
  const selected = state.players[playerIndex].hand.filter((card) => cardIds.includes(card.id));
  if (selected.length !== cardIds.length || new Set(selected.map((card) => card.rank)).size !== 1) return false;
  if (state.pile && selected.length !== state.pile.count) return false;
  if (state.pile && selected[0].rank <= state.pile.rank) return false;
  return getLegalScumPlays(state, playerIndex).some(
    (play) => play.length === selected.length && play.every((card) => card.rank === selected[0].rank)
  );
}

export function chooseScumCardSelection(hand, cardId, currentIds = [], requiredCount = null) {
  const card = hand.find((candidate) => candidate.id === cardId);
  if (!card) return currentIds;

  const matchingCards = hand.filter((candidate) => candidate.rank === card.rank);
  if (requiredCount !== null) {
    if (matchingCards.length < requiredCount) return currentIds;
    if (currentIds.includes(cardId)) return [];
    return matchingCards.slice(0, requiredCount).map((candidate) => candidate.id);
  }

  if (currentIds.includes(cardId)) return currentIds.filter((id) => id !== cardId);
  const currentCards = hand.filter((candidate) => currentIds.includes(candidate.id));
  if (currentCards.length && currentCards[0].rank !== card.rank) return [cardId];
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
      pile: { cards: selected, rank: selected[0].rank, count: selected.length, playerIndex },
      currentPlayerIndex: null,
      lastPlayerIndex: playerIndex,
      message: `${players[standings[0]].name} is President. ${players[lastIndex].name} is Scum.`,
      history: addHistory(state, `${state.players[playerIndex].name} went out.`),
    };
  }

  const pile = { cards: selected, rank: selected[0].rank, count: selected.length, playerIndex };
  const base = {
    ...state,
    players,
    standings,
    pile,
    lastPlayerIndex: playerIndex,
    turnNumber: state.turnNumber + 1,
    message: `${state.players[playerIndex].name} played ${describePlay(selected)}.`,
    history: addHistory(state, `${state.players[playerIndex].name} played ${describePlay(selected)}.`),
  };

  if (selected.length === 4) {
    return clearScumPile(base, playerIndex, "Four of a kind burns the pile.");
  }

  const nextPlayerIndex = nextEligiblePlayer(base, playerIndex);
  if (nextPlayerIndex === null) return clearScumPile(base, playerIndex, "The table is yours.");
  return { ...base, currentPlayerIndex: nextPlayerIndex };
}

export function passScumTurn(state, playerIndex) {
  if (
    state.phase !== "playing" ||
    state.currentPlayerIndex !== playerIndex ||
    !state.pile ||
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
  if (nextPlayerIndex === null || nextPlayerIndex === state.lastPlayerIndex) {
    return clearScumPile(base, state.lastPlayerIndex, `${state.players[state.lastPlayerIndex].name} takes the table.`);
  }
  return { ...base, currentPlayerIndex: nextPlayerIndex };
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
    currentPlayerIndex,
    message: `${reason} ${state.players[currentPlayerIndex].name} leads.`,
    history: addHistory(state, reason),
  };
}

function nextEligiblePlayer(state, fromIndex) {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (fromIndex + offset) % state.players.length;
    if (!state.players[index].place && !state.passed.includes(index)) return index;
  }
  return null;
}

function nextActivePlayer(state, fromIndex) {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (fromIndex + offset) % state.players.length;
    if (!state.players[index].place) return index;
  }
  return null;
}

function groupByRank(hand) {
  return hand.reduce((groups, card) => {
    groups[card.rank] = [...(groups[card.rank] || []), card];
    return groups;
  }, {});
}

function describePlay(cards) {
  const rank = scumRankLabel(cards[0].rank);
  if (cards.length === 1) return `a ${rank}`;
  const pluralRank = cards[0].rank === 15 ? "Jokers" : `${rank}s`;
  if (cards.length === 2) return `a pair of ${pluralRank}`;
  if (cards.length === 3) return `three ${pluralRank}`;
  return `${cards.length} ${pluralRank}`;
}

function addHistory(state, text) {
  return [{ id: `${state.turnNumber}-${text}`, text }, ...state.history].slice(0, 8);
}
