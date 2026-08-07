export const HEARTS_SUITS = ["clubs", "diamonds", "spades", "hearts"];
export const HEARTS_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

const PLAYER_NAMES = ["You", "Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash"];

export function rankLabel(rank) {
  return { 11: "J", 12: "Q", 13: "K", 14: "A" }[rank] || String(rank);
}

export function formatHeartCard(card) {
  return `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
}

export function createHeartDeck(copies = 1) {
  return Array.from({ length: copies }, (_, copy) =>
    HEARTS_SUITS.flatMap((suit) =>
      HEARTS_RANKS.map((rank) => ({
        id: `${suit}-${rank}-${copy}`,
        suit,
        rank,
        copy,
      }))
    )
  ).flat();
}

export function shuffleHeartDeck(deck, random = Math.random) {
  const result = [...deck];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function sortHeartHand(hand) {
  return [...hand].sort((a, b) => {
    const suitDifference = HEARTS_SUITS.indexOf(a.suit) - HEARTS_SUITS.indexOf(b.suit);
    return suitDifference || a.rank - b.rank || (a.copy || 0) - (b.copy || 0);
  });
}

export function getPassCycle(playerCount) {
  return playerCount === 3 ? ["left", "right", "hold"] : ["left", "right", "across", "hold"];
}

export function createHeartsMatch({
  variant = "classic",
  playerName = "You",
  playerCount = variant === "killer" ? 6 : 4,
  targetScore = 100,
} = {}) {
  const allowed = variant === "killer" ? playerCount >= 5 && playerCount <= 8 : playerCount >= 3 && playerCount <= 4;
  if (!allowed) throw new Error("That player count is not available for this Hearts variant.");

  const players = PLAYER_NAMES.slice(0, playerCount).map((name, index) => ({
    id: index,
    name: index === 0 ? playerName.trim() || "You" : name,
    score: 0,
    roundPoints: 0,
    tricks: 0,
    hand: [],
    captured: [],
  }));

  return dealHeartsRound({
    variant,
    playerCount,
    deckCopies: variant === "killer" ? 2 : 1,
    roundPenaltyTotal: variant === "killer" ? 52 : 26,
    targetScore,
    players,
    roundNumber: 1,
    dealerIndex: playerCount - 1,
    history: [],
  });
}

export function dealHeartsRound(match, random = Math.random) {
  const baseDeck =
    match.variant === "classic" && match.playerCount === 3
      ? createHeartDeck(match.deckCopies).filter((card) => !(card.suit === "diamonds" && card.rank === 2))
      : createHeartDeck(match.deckCopies);
  let deck = shuffleHeartDeck(baseDeck, random);
  if (match.variant === "killer") {
    deck = keepTwoClubsInSeparateHands(deck, match.playerCount);
  }
  const cardsPerPlayer = Math.floor(deck.length / match.playerCount);
  const dealtCardCount = cardsPerPlayer * match.playerCount;
  const dealtCards = deck.slice(0, dealtCardCount);
  const kitty = deck.slice(dealtCardCount);
  const players = match.players.map((player, playerIndex) => ({
    ...player,
    hand: sortHeartHand(dealtCards.filter((_, cardIndex) => cardIndex % match.playerCount === playerIndex)),
    captured: [],
    roundPoints: 0,
    tricks: 0,
  }));
  const passCycle = getPassCycle(match.playerCount);
  const passDirection =
    match.variant === "killer" ? "hold" : passCycle[(match.roundNumber - 1) % passCycle.length];
  const base = {
    ...match,
    players,
    cardsPerPlayer,
    kitty,
    kittyClaimed: kitty.length === 0,
    carryoverCards: [],
    passDirection,
    phase: passDirection === "hold" ? "playing" : "passing",
    selectedPass: [],
    currentPlayerIndex: null,
    trick: [],
    trickNumber: 1,
    heartsPlayed: false,
    lastTrick: null,
    lastWinnerIndex: null,
    roundSummary: null,
    message:
      passDirection === "hold"
        ? match.variant === "killer" ? "No passing in Killer Hearts." : "No pass this round."
        : `Choose three cards to pass ${passDirection}.`,
  };

  return passDirection === "hold" ? beginHeartsPlay(base) : base;
}

function beginHeartsPlay(state) {
  const twoClubHolders = state.players
    .map((player, playerIndex) => ({ playerIndex, hasTwo: player.hand.some(isTwoOfClubs) }))
    .filter((entry) => entry.hasTwo)
    .map((entry) => entry.playerIndex);
  let openingPlayer = twoClubHolders[0];
  let message = `${state.players[openingPlayer].name} opens with the 2♣.`;
  if (state.variant === "killer") {
    const firstSeatAfterDealer = (state.dealerIndex + 1) % state.playerCount;
    openingPlayer = [...twoClubHolders].sort(
      (a, b) =>
        ((a - firstSeatAfterDealer + state.playerCount) % state.playerCount) -
        ((b - firstSeatAfterDealer + state.playerCount) % state.playerCount)
    )[0];
    message = `${state.players[openingPlayer].name} opens with a 2♣. Both 2♣ holders must play them.`;
  }
  return { ...state, phase: "playing", currentPlayerIndex: openingPlayer, message };
}

function keepTwoClubsInSeparateHands(deck, playerCount) {
  const result = [...deck];
  const dealtCardCount = Math.floor(result.length / playerCount) * playerCount;
  let positions = result.map((card, index) => (isTwoOfClubs(card) ? index : -1)).filter((index) => index >= 0);

  if (positions[0] >= dealtCardCount) {
    const target = result.findIndex((card, index) => index < dealtCardCount && !isTwoOfClubs(card));
    [result[positions[0]], result[target]] = [result[target], result[positions[0]]];
  }

  positions = result.map((card, index) => (isTwoOfClubs(card) ? index : -1)).filter((index) => index >= 0);
  const firstSeat = positions[0] % playerCount;
  if (positions[1] >= dealtCardCount || positions[1] % playerCount === firstSeat) {
    const target = result.findIndex(
      (card, index) => index < dealtCardCount && index % playerCount !== firstSeat && !isTwoOfClubs(card)
    );
    [result[positions[1]], result[target]] = [result[target], result[positions[1]]];
  }
  return result;
}

export function getPassTarget(playerIndex, direction, playerCount = 4) {
  if (direction === "left") return (playerIndex + 1) % playerCount;
  if (direction === "right") return (playerIndex + playerCount - 1) % playerCount;
  if (direction === "across") return (playerIndex + playerCount / 2) % playerCount;
  return playerIndex;
}

export function chooseBotPass(hand) {
  const suitCounts = HEARTS_SUITS.reduce(
    (counts, suit) => ({ ...counts, [suit]: hand.filter((card) => card.suit === suit).length }),
    {}
  );
  return [...hand]
    .sort((a, b) => passDanger(b, suitCounts) - passDanger(a, suitCounts))
    .slice(0, 3);
}

function passDanger(card, suitCounts) {
  let danger = card.rank;
  if (isQueenOfSpades(card)) danger += 45;
  if (card.suit === "spades" && card.rank > 12) danger += 24;
  if (card.suit === "hearts") danger += 12 + card.rank / 2;
  if (suitCounts[card.suit] <= 2) danger -= 7;
  return danger;
}

export function completeHeartsPass(state, humanCardIds) {
  if (state.phase !== "passing" || humanCardIds.length !== 3) return state;
  const selections = state.players.map((player, index) =>
    index === 0 ? player.hand.filter((card) => humanCardIds.includes(card.id)) : chooseBotPass(player.hand)
  );
  if (selections.some((selection) => selection.length !== 3)) return state;

  const outgoingIds = selections.map((cards) => new Set(cards.map((card) => card.id)));
  const players = state.players.map((player, index) => {
    const sender = state.players.findIndex(
      (_, candidate) => getPassTarget(candidate, state.passDirection, state.playerCount) === index
    );
    return {
      ...player,
      hand: sortHeartHand([
        ...player.hand.filter((card) => !outgoingIds[index].has(card.id)),
        ...selections[sender],
      ]),
    };
  });
  const received = selections.find(
    (_, sender) => getPassTarget(sender, state.passDirection, state.playerCount) === 0
  );
  return beginHeartsPlay({
    ...state,
    players,
    selectedPass: [],
    message: `You received ${received.map(formatHeartCard).join(", ")}.`,
  });
}

export function getLegalHeartCards(state, playerIndex) {
  const hand = state.players[playerIndex].hand;
  if (state.phase !== "playing" || state.currentPlayerIndex !== playerIndex || !hand.length) return [];

  if (state.trickNumber === 1) {
    const requiredTwoClubs = hand.filter(isTwoOfClubs);
    if (requiredTwoClubs.length) return requiredTwoClubs;
  }

  if (state.trick.length) {
    const leadSuit = state.trick[0].card.suit;
    const following = hand.filter((card) => card.suit === leadSuit);
    return following.length ? following : hand;
  }

  const nonHearts = hand.filter((card) => card.suit !== "hearts");
  return nonHearts.length ? nonHearts : hand;
}

export function playHeartCard(state, playerIndex, cardId) {
  const legalCards = getLegalHeartCards(state, playerIndex);
  if (!legalCards.some((card) => card.id === cardId)) return state;
  const card = state.players[playerIndex].hand.find((candidate) => candidate.id === cardId);
  const players = state.players.map((player, index) =>
    index === playerIndex
      ? { ...player, hand: player.hand.filter((candidate) => candidate.id !== cardId) }
      : player
  );
  const trick = [...state.trick, { playerIndex, card }];
  const heartsPlayed = state.heartsPlayed || card.suit === "hearts";

  if (trick.length < state.playerCount) {
    const nextPlayer = (playerIndex + 1) % state.playerCount;
    return {
      ...state,
      players,
      trick,
      heartsPlayed,
      currentPlayerIndex: nextPlayer,
      message: `${state.players[nextPlayer].name}'s turn.`,
    };
  }

  const winnerIndex = getTrickWinner(trick, state.variant === "killer");
  const currentPoints = trick.reduce((total, play) => total + cardPoints(play.card), 0);
  const carriedPoints = state.carryoverCards.reduce((total, carriedCard) => total + cardPoints(carriedCard), 0);
  return {
    ...state,
    players,
    trick,
    heartsPlayed,
    currentPlayerIndex: winnerIndex ?? trick[0].playerIndex,
    phase: "collecting",
    lastTrick: { winnerIndex, leadPlayerIndex: trick[0].playerIndex, points: currentPoints + carriedPoints, cards: trick.map((play) => play.card) },
    message:
      winnerIndex === null
        ? `Every ${SUIT_SYMBOLS[trick[0].card.suit]} in the lead suit canceled. The trick carries over.`
        : `${state.players[winnerIndex].name} takes ${state.carryoverCards.length ? "the carryover and " : ""}the trick${currentPoints + carriedPoints ? ` with ${currentPoints + carriedPoints} point${currentPoints + carriedPoints === 1 ? "" : "s"}` : ""}.`,
  };
}

export function getTrickWinner(trick, cancellation = false) {
  const leadSuit = trick[0].card.suit;
  let contenders = trick.filter((play) => play.card.suit === leadSuit);
  if (cancellation) {
    const counts = contenders.reduce((result, play) => {
      const key = `${play.card.suit}-${play.card.rank}`;
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    contenders = contenders.filter((play) => counts[`${play.card.suit}-${play.card.rank}`] === 1);
  }
  if (!contenders.length) return null;
  return contenders.reduce((winner, play) => (play.card.rank > winner.card.rank ? play : winner)).playerIndex;
}

export function cardPoints(card) {
  if (card.suit === "hearts") return 1;
  if (isQueenOfSpades(card)) return 13;
  return 0;
}

export function collectHeartTrick(state) {
  if (state.phase !== "collecting" || !state.lastTrick) return state;
  const { winnerIndex, leadPlayerIndex, cards } = state.lastTrick;
  const noCardsRemain = state.players.every((player) => player.hand.length === 0);

  if (winnerIndex === null && !noCardsRemain) {
    return {
      ...state,
      carryoverCards: [...state.carryoverCards, ...cards],
      trick: [],
      trickNumber: state.trickNumber + 1,
      phase: "playing",
      currentPlayerIndex: leadPlayerIndex,
      lastTrick: null,
      message: `${state.players[leadPlayerIndex].name} leads again. ${state.carryoverCards.length + cards.length} cards are in the carryover.`,
    };
  }

  const resolvedWinner = winnerIndex ?? state.lastWinnerIndex ?? leadPlayerIndex;
  const kittyCards = state.kittyClaimed ? [] : state.kitty;
  const capturedCards = [...state.carryoverCards, ...cards, ...kittyCards];
  const capturedPoints = capturedCards.reduce((sum, capturedCard) => sum + cardPoints(capturedCard), 0);
  const players = state.players.map((player, index) =>
    index === resolvedWinner
      ? {
          ...player,
          captured: [...player.captured, ...capturedCards],
          tricks: player.tricks + 1,
          roundPoints: player.roundPoints + capturedPoints,
        }
      : player
  );

  if (noCardsRemain) {
    return finishHeartsRound({
      ...state,
      players,
      carryoverCards: [],
      kittyClaimed: true,
      trick: [],
      lastWinnerIndex: resolvedWinner,
    });
  }
  return {
    ...state,
    players,
    carryoverCards: [],
    kittyClaimed: true,
    trick: [],
    trickNumber: state.trickNumber + 1,
    phase: "playing",
    currentPlayerIndex: resolvedWinner,
    lastWinnerIndex: resolvedWinner,
    lastTrick: null,
    message: `${players[resolvedWinner].name} leads the next trick.`,
  };
}

function finishHeartsRound(state) {
  const shooterIndex = state.players.findIndex((player) => player.roundPoints === state.roundPenaltyTotal);
  const appliedPoints = state.players.map((player, index) =>
    shooterIndex === -1 ? player.roundPoints : index === shooterIndex ? 0 : state.roundPenaltyTotal
  );
  const players = state.players.map((player, index) => ({ ...player, score: player.score + appliedPoints[index] }));
  const matchEnded = players.some((player) => player.score >= state.targetScore);
  const lowestScore = Math.min(...players.map((player) => player.score));
  const winners = matchEnded ? players.filter((player) => player.score === lowestScore) : [];
  const roundSummary = {
    shooterIndex,
    appliedPoints,
    matchEnded,
    winnerIndexes: winners.map((player) => player.id),
  };
  return {
    ...state,
    players,
    phase: matchEnded ? "gameOver" : "roundComplete",
    roundSummary,
    history: [...state.history, { roundNumber: state.roundNumber, points: appliedPoints, shooterIndex }],
    lastTrick: null,
    message: shooterIndex === -1 ? `Round ${state.roundNumber} is complete.` : `${players[shooterIndex].name} shot the moon!`,
  };
}

export function startNextHeartsRound(state, random = Math.random) {
  if (state.phase !== "roundComplete") return state;
  return dealHeartsRound(
    { ...state, roundNumber: state.roundNumber + 1, dealerIndex: (state.dealerIndex + 1) % state.playerCount },
    random
  );
}

export function chooseBotHeartCard(state, playerIndex) {
  const legal = getLegalHeartCards(state, playerIndex);
  if (legal.length <= 1) return legal[0];
  const sorted = [...legal].sort((a, b) => a.rank - b.rank);
  if (!state.trick.length) {
    const nonPointCards = sorted.filter((card) => cardPoints(card) === 0 && card.suit !== "hearts");
    return (nonPointCards.length ? nonPointCards : sorted)[0];
  }

  const leadSuit = state.trick[0].card.suit;
  const followsSuit = sorted[0].suit === leadSuit;
  if (!followsSuit) {
    return sorted.find(isQueenOfSpades) || [...sorted].reverse().find((card) => card.suit === "hearts") || sorted[sorted.length - 1];
  }

  const livePlays = state.variant === "killer"
    ? state.trick.filter((play) => {
        const matches = state.trick.filter((other) => other.card.suit === play.card.suit && other.card.rank === play.card.rank);
        return matches.length === 1;
      })
    : state.trick;
  const currentHigh = Math.max(0, ...livePlays.filter((play) => play.card.suit === leadSuit).map((play) => play.card.rank));
  const trickPoints = state.trick.reduce((sum, play) => sum + cardPoints(play.card), 0);
  const losingCards = sorted.filter((card) => card.rank < currentHigh);
  if (losingCards.length) return losingCards[losingCards.length - 1];
  if (trickPoints > 0) return sorted[0];
  return state.trick.length === state.playerCount - 1 ? sorted[sorted.length - 1] : sorted[0];
}

function isQueenOfSpades(card) {
  return card.suit === "spades" && card.rank === 12;
}

function isTwoOfClubs(card) {
  return card.suit === "clubs" && card.rank === 2;
}
