export const PINOCHLE_SUITS = ["clubs", "diamonds", "spades", "hearts"];
export const PINOCHLE_RANKS = [9, 11, 12, 13, 10, 14];
export const PINOCHLE_SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

const RANK_STRENGTH = new Map(PINOCHLE_RANKS.map((rank, index) => [rank, index]));
const PINOCHLE_SCORE_SCALE = 10;
const PINOCHLE_BID_INCREMENT = 10;
const AROUND_SCORES = {
  14: [0, 100, 1000, 1500, 2000],
  13: [0, 80, 800, 1200, 1600],
  12: [0, 60, 600, 900, 1200],
  11: [0, 40, 400, 600, 800],
};
const PINOCHLE_SCORES = [0, 40, 300, 900, 1600];

export function pinochleRankLabel(rank) {
  return { 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A" }[rank];
}

export function formatPinochleCard(card) {
  return `${pinochleRankLabel(card.rank)}${PINOCHLE_SUIT_SYMBOLS[card.suit]}`;
}

export function pinochleDeckCopies(playerCount) {
  return playerCount === 6 ? 4 : 2;
}

export function createPinochleDeck(playerCount) {
  const cards = [];
  for (let copy = 0; copy < pinochleDeckCopies(playerCount); copy += 1) {
    for (const suit of PINOCHLE_SUITS) {
      for (const rank of PINOCHLE_RANKS) {
        cards.push({ id: `${copy}-${suit}-${rank}`, copy, suit, rank });
      }
    }
  }
  return cards;
}

export function shufflePinochleDeck(cards, random = Math.random) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function sortPinochleCards(cards, trump = null) {
  return [...cards].sort((left, right) => {
    if (trump && left.suit === trump && right.suit !== trump) return 1;
    if (trump && right.suit === trump && left.suit !== trump) return -1;
    return PINOCHLE_SUITS.indexOf(left.suit) - PINOCHLE_SUITS.indexOf(right.suit)
      || RANK_STRENGTH.get(left.rank) - RANK_STRENGTH.get(right.rank)
      || left.copy - right.copy;
  });
}

export function createPinochleGame({ playerSeeds, targetScore } = {}) {
  if (!Array.isArray(playerSeeds) || playerSeeds.length < 2 || playerSeeds.length > 6) {
    throw new Error("Pinochle requires two to six players.");
  }
  const playerCount = playerSeeds.length;
  const partnershipGame = playerCount === 4 || playerCount === 6;
  const teamCount = partnershipGame ? 2 : playerCount;
  const players = playerSeeds.map((seed, index) => ({
    playerId: seed.playerId ?? `local-${index}`,
    name: String(seed.name || `Player ${index + 1}`),
    isComputer: Boolean(seed.isComputer),
    teamId: partnershipGame ? index % 2 : index,
    hand: [],
  }));
  const teams = Array.from({ length: teamCount }, (_, id) => ({
    id,
    memberIds: players.flatMap((player, index) => player.teamId === id ? [index] : []),
    score: 0,
  }));
  return dealPinochleRound({
    playerCount,
    players,
    teams,
    partnershipGame,
    scoringScale: PINOCHLE_SCORE_SCALE,
    targetScore: targetScore || (playerCount === 6 ? 5000 : 1500),
    dealerIndex: playerCount - 1,
    roundNumber: 0,
    history: [],
  });
}

export function migratePinochleScoring(game) {
  if (!game || game.scoringScale === PINOCHLE_SCORE_SCALE) return game;
  const scale = (value) => Number.isFinite(value) ? value * PINOCHLE_SCORE_SCALE : value;
  const scaleList = (values) => Array.isArray(values) ? values.map(scale) : values;
  const roundSummary = game.roundSummary ? {
    ...game.roundSummary,
    contractPoints: scale(game.roundSummary.contractPoints),
    bidderMeldPoints: scale(game.roundSummary.bidderMeldPoints),
    contractTrickPoints: scale(game.roundSummary.contractTrickPoints),
    teamTrickPoints: scaleList(game.roundSummary.teamTrickPoints),
    teamMeldPoints: scaleList(game.roundSummary.teamMeldPoints),
    scoringPoints: scaleList(game.roundSummary.scoringPoints),
    roundDeltas: scaleList(game.roundSummary.roundDeltas),
  } : game.roundSummary;
  return {
    ...game,
    scoringScale: PINOCHLE_SCORE_SCALE,
    targetScore: scale(game.targetScore),
    minimumBid: scale(game.minimumBid),
    highBid: scale(game.highBid),
    bidHistory: game.bidHistory?.map((bid) => ({ ...bid, amount: scale(bid.amount) })) || [],
    teams: game.teams?.map((team) => ({ ...team, score: scale(team.score) })) || [],
    players: game.players?.map((player) => ({ ...player, roundTrickPoints: scale(player.roundTrickPoints) })) || [],
    melds: game.melds?.map((meld) => ({
      ...meld,
      total: scale(meld.total),
      items: meld.items?.map((item) => ({ ...item, points: scale(item.points) })) || [],
    })) || [],
    teamMeldPoints: scaleList(game.teamMeldPoints),
    lastTrick: game.lastTrick ? { ...game.lastTrick, points: scale(game.lastTrick.points) } : game.lastTrick,
    roundSummary,
  };
}

export function dealPinochleRound(game, random = Math.random) {
  const deck = shufflePinochleDeck(createPinochleDeck(game.playerCount), random);
  const dealerIndex = (game.dealerIndex + 1) % game.playerCount;
  const handSize = game.playerCount === 2 ? 12 : Math.floor(deck.length / game.playerCount);
  const players = game.players.map((player) => ({ ...player, hand: [], roundTrickPoints: 0, tricksWon: 0 }));
  let deckIndex = 0;
  for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
    for (let offset = 1; offset <= game.playerCount; offset += 1) {
      players[(dealerIndex + offset) % game.playerCount].hand.push(deck[deckIndex++]);
    }
  }
  players.forEach((player) => { player.hand = sortPinochleCards(player.hand); });
  const firstBidder = (dealerIndex + 1) % game.playerCount;
  if (game.playerCount === 2) {
    const stockTrumpCard = deck[deckIndex];
    return {
      ...game,
      roundNumber: game.roundNumber + 1,
      dealerIndex,
      players: players.map((player) => ({ ...player, hand: sortPinochleCards(player.hand, stockTrumpCard.suit) })),
      stock: deck.slice(deckIndex + 1),
      stockTrumpCard,
      kitty: [],
      kittySize: 0,
      phase: "playing",
      currentPlayerIndex: firstBidder,
      leadPlayerIndex: firstBidder,
      minimumBid: null,
      highBid: null,
      highBidderIndex: null,
      passedPlayerIndexes: [],
      bidHistory: [],
      trump: stockTrumpCard.suit,
      melds: players.map(() => ({ total: 0, items: [] })),
      teamMeldPoints: game.teams.map(() => 0),
      twoPlayerDeclaredMeldPoints: players.map(() => ({})),
      trick: [],
      trickNumber: 0,
      lastTrick: null,
      roundSummary: null,
      winnerTeamIds: [],
      message: `${players[firstBidder].name} leads. The turned ${formatPinochleCard(stockTrumpCard)} makes ${PINOCHLE_SUIT_SYMBOLS[stockTrumpCard.suit]} trump.`,
    };
  }
  const minimumBid = game.playerCount === 5 ? 150 : game.playerCount === 6 ? 500 : 200;
  return {
    ...game,
    roundNumber: game.roundNumber + 1,
    dealerIndex,
    players,
    kitty: deck.slice(deckIndex),
    kittySize: deck.length - deckIndex,
    stock: [],
    stockTrumpCard: null,
    phase: "bidding",
    currentPlayerIndex: firstBidder,
    minimumBid,
    highBid: null,
    highBidderIndex: null,
    passedPlayerIndexes: [],
    bidHistory: [],
    trump: null,
    melds: [],
    teamMeldPoints: game.teams.map(() => 0),
    trick: [],
    leadPlayerIndex: null,
    trickNumber: 0,
    lastTrick: null,
    roundSummary: null,
    winnerTeamIds: [],
    message: `${players[firstBidder].name} opens the bidding at ${minimumBid}.`,
  };
}

export function placePinochleBid(game, playerIndex, amount) {
  requirePhaseAndTurn(game, "bidding", playerIndex);
  const bid = Number(amount);
  const required = game.highBid === null ? game.minimumBid : game.highBid + PINOCHLE_BID_INCREMENT;
  if (!Number.isInteger(bid) || bid < required) throw new Error(`Bid at least ${required}.`);
  if (bid % PINOCHLE_BID_INCREMENT !== 0) throw new Error("Bid in increments of 10.");
  const next = {
    ...game,
    highBid: bid,
    highBidderIndex: playerIndex,
    bidHistory: [...game.bidHistory, { playerIndex, amount: bid }],
    message: `${game.players[playerIndex].name} bids ${bid}.`,
  };
  return advanceBidding(next, playerIndex);
}

export function passPinochleBid(game, playerIndex) {
  requirePhaseAndTurn(game, "bidding", playerIndex);
  const passedPlayerIndexes = [...game.passedPlayerIndexes, playerIndex];
  const active = game.players.map((_, index) => index).filter((index) => !passedPlayerIndexes.includes(index));
  if (active.length === 1 || remainingBiddersAreTeammates(game, active)) {
    const bidderIndex = game.highBidderIndex ?? active[0];
    const highBid = game.highBid ?? game.minimumBid;
    return beginTrumpChoice({
      ...game,
      highBid,
      highBidderIndex: bidderIndex,
      passedPlayerIndexes,
      bidHistory: [...game.bidHistory, { playerIndex, amount: null }],
    });
  }
  const next = {
    ...game,
    passedPlayerIndexes,
    bidHistory: [...game.bidHistory, { playerIndex, amount: null }],
    message: `${game.players[playerIndex].name} passes.`,
  };
  return advanceBidding(next, playerIndex);
}

function advanceBidding(game, afterPlayerIndex) {
  const active = game.players.map((_, index) => index).filter((index) => !game.passedPlayerIndexes.includes(index));
  if ((active.length === 1 && game.highBidderIndex === active[0]) || remainingBiddersAreTeammates(game, active)) {
    return beginTrumpChoice(game);
  }
  let nextPlayerIndex = afterPlayerIndex;
  do {
    nextPlayerIndex = (nextPlayerIndex + 1) % game.playerCount;
  } while (game.passedPlayerIndexes.includes(nextPlayerIndex));
  return { ...game, currentPlayerIndex: nextPlayerIndex };
}

function remainingBiddersAreTeammates(game, activePlayerIndexes) {
  if (!game.partnershipGame || game.highBidderIndex === null || activePlayerIndexes.length < 2) return false;
  const biddingTeamId = game.players[game.highBidderIndex].teamId;
  return activePlayerIndexes.every((index) => game.players[index].teamId === biddingTeamId);
}

function beginTrumpChoice(game) {
  const kittyTaken = game.kittySize > 0;
  const players = kittyTaken
    ? game.players.map((player, index) => index === game.highBidderIndex
      ? { ...player, hand: sortPinochleCards([...player.hand, ...game.kitty]) }
      : player)
    : game.players;
  return {
    ...game,
    players,
    kittyTaken,
    phase: "choosing-trump",
    currentPlayerIndex: game.highBidderIndex,
    message: kittyTaken
      ? `${game.players[game.highBidderIndex].name} won the bid at ${game.highBid}, took the ${game.kittySize} center cards, and chooses trump.`
      : `${game.players[game.highBidderIndex].name} won the bid at ${game.highBid} and chooses trump.`,
  };
}

export function choosePinochleTrump(game, playerIndex, trump) {
  requirePhaseAndTurn(game, "choosing-trump", playerIndex);
  if (!PINOCHLE_SUITS.includes(trump)) throw new Error("Choose a valid trump suit.");
  const players = game.players.map((player, index) => index === playerIndex
    ? { ...player, hand: sortPinochleCards(game.kittyTaken ? player.hand : [...player.hand, ...game.kitty], trump) }
    : { ...player, hand: sortPinochleCards(player.hand, trump) });
  const withTrump = { ...game, players, trump };
  if (game.kittySize > 0) {
    return {
      ...withTrump,
      phase: "discarding-kitty",
      currentPlayerIndex: playerIndex,
      message: `${players[playerIndex].name} took the kitty and must discard ${game.kittySize} card${game.kittySize === 1 ? "" : "s"}.`,
    };
  }
  return beginPartnershipExchange(withTrump);
}

export function discardPinochleKitty(game, playerIndex, cardIds) {
  requirePhaseAndTurn(game, "discarding-kitty", playerIndex);
  if (!Array.isArray(cardIds) || cardIds.length !== game.kittySize || new Set(cardIds).size !== cardIds.length) {
    throw new Error(`Discard exactly ${game.kittySize} card${game.kittySize === 1 ? "" : "s"}.`);
  }
  const hand = game.players[playerIndex].hand;
  if (cardIds.some((id) => !hand.some((card) => card.id === id))) throw new Error("Discard cards from your hand.");
  const players = game.players.map((player, index) => index === playerIndex
    ? { ...player, hand: player.hand.filter((card) => !cardIds.includes(card.id)) }
    : player);
  return beginPartnershipExchange({ ...game, players, kitty: hand.filter((card) => cardIds.includes(card.id)) });
}

function beginPartnershipExchange(game) {
  if (!game.partnershipGame) return beginTrickPlay(game);
  const exchangeCount = game.playerCount === 4 ? 4 : 3;
  const bidderTeamId = game.players[game.highBidderIndex].teamId;
  const exchangePartnerIndexes = game.teams[bidderTeamId].memberIds.filter((index) => index !== game.highBidderIndex);
  return {
    ...game,
    phase: "partner-passing",
    currentPlayerIndex: exchangePartnerIndexes[0],
    exchangeCount,
    exchangePartnerIndexes,
    partnerPasses: {},
    exchangeReturnQueue: [],
    message: `${game.players[exchangePartnerIndexes[0]].name} chooses ${exchangeCount} cards to send to bidder ${game.players[game.highBidderIndex].name}.`,
  };
}

export function passPinochlePartnerCards(game, playerIndex, cardIds) {
  requirePhaseAndTurn(game, "partner-passing", playerIndex);
  if (!game.exchangePartnerIndexes.includes(playerIndex)) throw new Error("Only a bidding partner can send cards.");
  const selected = requireExchangeCards(game, playerIndex, cardIds, game.exchangeCount);
  const players = game.players.map((player, index) => index === playerIndex
    ? { ...player, hand: player.hand.filter((card) => !cardIds.includes(card.id)) }
    : player);
  const partnerPasses = { ...game.partnerPasses, [playerIndex]: selected };
  const remainingPartners = game.exchangePartnerIndexes.filter((index) => !partnerPasses[index]);
  if (remainingPartners.length) {
    return {
      ...game,
      players,
      partnerPasses,
      currentPlayerIndex: remainingPartners[0],
      message: `${game.players[remainingPartners[0]].name} chooses ${game.exchangeCount} cards to send to bidder ${game.players[game.highBidderIndex].name}.`,
    };
  }
  const receivedCards = game.exchangePartnerIndexes.flatMap((index) => partnerPasses[index]);
  players[game.highBidderIndex] = {
    ...players[game.highBidderIndex],
    hand: sortPinochleCards([...players[game.highBidderIndex].hand, ...receivedCards], game.trump),
  };
  const exchangeReturnQueue = [...game.exchangePartnerIndexes];
  return {
    ...game,
    players,
    partnerPasses,
    phase: "bidder-returning",
    currentPlayerIndex: game.highBidderIndex,
    exchangeReturnQueue,
    message: `${game.players[game.highBidderIndex].name} chooses ${game.exchangeCount} cards to return to ${game.players[exchangeReturnQueue[0]].name}.`,
  };
}

export function returnPinochlePartnerCards(game, playerIndex, cardIds) {
  requirePhaseAndTurn(game, "bidder-returning", playerIndex);
  if (playerIndex !== game.highBidderIndex) throw new Error("Only the bidder can return partner cards.");
  const selected = requireExchangeCards(game, playerIndex, cardIds, game.exchangeCount);
  const partnerIndex = game.exchangeReturnQueue[0];
  const players = game.players.map((player, index) => {
    if (index === playerIndex) return { ...player, hand: player.hand.filter((card) => !cardIds.includes(card.id)) };
    if (index === partnerIndex) return { ...player, hand: sortPinochleCards([...player.hand, ...selected], game.trump) };
    return player;
  });
  const exchangeReturnQueue = game.exchangeReturnQueue.slice(1);
  if (exchangeReturnQueue.length) {
    return {
      ...game,
      players,
      exchangeReturnQueue,
      message: `${game.players[playerIndex].name} chooses ${game.exchangeCount} cards to return to ${game.players[exchangeReturnQueue[0]].name}.`,
    };
  }
  return beginTrickPlay({
    ...game,
    players,
    partnerPasses: {},
    exchangeReturnQueue: [],
    message: "The partnership exchange is complete.",
  });
}

function requireExchangeCards(game, playerIndex, cardIds, count) {
  if (!Array.isArray(cardIds) || cardIds.length !== count || new Set(cardIds).size !== cardIds.length) {
    throw new Error(`Choose exactly ${count} cards for the exchange.`);
  }
  const hand = game.players[playerIndex].hand;
  const selected = cardIds.map((id) => hand.find((card) => card.id === id));
  if (selected.some((card) => !card)) throw new Error("Exchange cards from your hand.");
  return selected;
}

function beginTrickPlay(game) {
  const melds = game.players.map((player) => calculatePinochleMeld(player.hand, game.trump));
  const teamMeldPoints = game.teams.map((team) => team.memberIds.reduce((sum, playerIndex) => sum + melds[playerIndex].total, 0));
  const contractPlayerIndexes = game.playerCount === 5
    ? game.players.flatMap((player, index) => index === game.highBidderIndex
      || player.hand.some((card) => card.suit === game.trump && card.rank === 11)
      ? [index]
      : [])
    : game.teams[game.players[game.highBidderIndex].teamId].memberIds;
  const leader = game.highBidderIndex;
  return {
    ...game,
    phase: "playing",
    currentPlayerIndex: leader,
    leadPlayerIndex: leader,
    melds,
    teamMeldPoints,
    contractPlayerIndexes,
    revealedContractPlayerIndexes: [],
    trick: [],
    kitty: [],
    message: `${game.players[leader].name} leads.`,
  };
}

export function calculatePinochleMeld(cards, trump) {
  const count = (suit, rank) => cards.filter((card) => card.suit === suit && card.rank === rank).length;
  const take = (suit, rank, copies) => cards.filter((card) => card.suit === suit && card.rank === rank).slice(0, copies);
  const items = [];
  const add = (name, points, meldCards) => { if (points > 0) items.push({ name, points, cards: meldCards }); };

  for (const rank of [14, 13, 12, 11]) {
    const copies = Math.min(...PINOCHLE_SUITS.map((suit) => count(suit, rank)));
    add(
      `${pinochleRankLabel(rank)}s around${copies > 1 ? ` ×${copies}` : ""}`,
      scoreForCopies(AROUND_SCORES[rank], copies),
      PINOCHLE_SUITS.flatMap((suit) => take(suit, rank, copies)),
    );
  }

  const pinochles = Math.min(count("spades", 12), count("diamonds", 11));
  add(
    `Pinochle${pinochles > 1 ? ` ×${pinochles}` : ""}`,
    scoreForCopies(PINOCHLE_SCORES, pinochles),
    [...take("spades", 12, pinochles), ...take("diamonds", 11, pinochles)],
  );

  const runCopies = Math.min(...[14, 10, 13, 12, 11].map((rank) => count(trump, rank)));
  const runScore = [0, 150, 1500, 2250, 3000][Math.min(runCopies, 4)] || 0;
  add(
    `Run in ${PINOCHLE_SUIT_SYMBOLS[trump]}${runCopies > 1 ? ` ×${runCopies}` : ""}`,
    runScore,
    [14, 10, 13, 12, 11].flatMap((rank) => take(trump, rank, runCopies)),
  );

  for (const suit of PINOCHLE_SUITS) {
    const marriages = Math.min(count(suit, 13), count(suit, 12));
    const extraMarriages = suit === trump ? Math.max(0, marriages - runCopies) : marriages;
    const marriageOffset = suit === trump ? runCopies : 0;
    add(
      `${suit === trump ? "Royal" : "Common"} marriage in ${PINOCHLE_SUIT_SYMBOLS[suit]}${extraMarriages > 1 ? ` ×${extraMarriages}` : ""}`,
      extraMarriages * (suit === trump ? 40 : 20),
      [
        ...cards.filter((card) => card.suit === suit && card.rank === 13).slice(marriageOffset, marriageOffset + extraMarriages),
        ...cards.filter((card) => card.suit === suit && card.rank === 12).slice(marriageOffset, marriageOffset + extraMarriages),
      ],
    );
  }

  const trumpNines = count(trump, 9);
  add(`Dix${trumpNines > 1 ? ` ×${trumpNines}` : ""}`, trumpNines * PINOCHLE_SCORE_SCALE, take(trump, 9, trumpNines));
  return { total: items.reduce((sum, item) => sum + item.points, 0), items };
}

function scoreForCopies(table, copies) {
  return table[Math.min(copies, table.length - 1)] || 0;
}

export function getLegalPinochleCards(game, playerIndex) {
  const hand = game.players[playerIndex]?.hand || [];
  if (game.phase !== "playing" || game.currentPlayerIndex !== playerIndex || game.trick.length === 0) return hand;
  if (game.playerCount === 2 && twoPlayerStockCount(game) > 0) return hand;
  const leadSuit = game.trick[0].card.suit;
  const leadCards = hand.filter((card) => card.suit === leadSuit);
  const currentWinner = winningPinochlePlay(game.trick, game.trump);
  if (leadCards.length) {
    const headingCards = leadCards.filter((card) => cardBeats(card, currentWinner.card, leadSuit, game.trump));
    return headingCards.length ? headingCards : leadCards;
  }
  const trumpCards = hand.filter((card) => card.suit === game.trump);
  if (trumpCards.length) {
    const overtrumps = currentWinner.card.suit === game.trump
      ? trumpCards.filter((card) => cardBeats(card, currentWinner.card, leadSuit, game.trump))
      : trumpCards;
    return overtrumps.length ? overtrumps : trumpCards;
  }
  return hand;
}

export function canTakeRestOfPinochleTricks(game, playerIndex) {
  if (game.phase !== "playing"
    || game.currentPlayerIndex !== playerIndex
    || game.leadPlayerIndex !== playerIndex
    || game.trick.length !== 0
    || twoPlayerStockCount(game) > 0) return false;
  const hand = game.players[playerIndex]?.hand || [];
  if (!hand.length || !hand.every((card) => card.suit === game.trump || card.rank === 14)) return false;
  const opponents = game.players.filter((_, index) => index !== playerIndex);
  if (opponents.some((player) => player.hand.some((card) => card.suit === game.trump))) return false;
  return opponents.every((player) => player.hand.length === hand.length);
}

export function takeRestOfPinochleTricks(game, playerIndex) {
  if (!canTakeRestOfPinochleTricks(game, playerIndex)) {
    throw new Error("The remaining tricks are not guaranteed.");
  }
  const remainingTricks = game.players[playerIndex].hand.length;
  const remainingCounterPoints = game.players
    .flatMap((player) => player.hand)
    .reduce((sum, card) => sum + ([14, 10, 13].includes(card.rank) ? PINOCHLE_SCORE_SCALE : 0), 0);
  const claimedPoints = remainingCounterPoints + PINOCHLE_SCORE_SCALE;
  const players = game.players.map((player, index) => ({
    ...player,
    hand: [],
    roundTrickPoints: player.roundTrickPoints + (index === playerIndex ? claimedPoints : 0),
    tricksWon: player.tricksWon + (index === playerIndex ? remainingTricks : 0),
  }));
  const finished = finishPinochleRound({
    ...game,
    players,
    trick: [],
    trickNumber: game.trickNumber + remainingTricks,
    pendingRoundEnd: false,
    stock: [],
    stockTrumpCard: null,
  });
  return {
    ...finished,
    tookRestPlayerIndex: playerIndex,
    tookRestTrickCount: remainingTricks,
    tookRestPoints: claimedPoints,
    message: `${game.players[playerIndex].name} took the remaining ${remainingTricks} trick${remainingTricks === 1 ? "" : "s"} for ${claimedPoints} points. ${finished.message}`,
  };
}

export function playPinochleCard(game, playerIndex, cardId) {
  requirePhaseAndTurn(game, "playing", playerIndex);
  const card = game.players[playerIndex].hand.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error("That card is not in your hand.");
  if (!getLegalPinochleCards(game, playerIndex).some((candidate) => candidate.id === cardId)) {
    throw new Error("You must follow suit, head the trick, or play trump when able.");
  }
  const players = game.players.map((player, index) => index === playerIndex
    ? { ...player, hand: player.hand.filter((candidate) => candidate.id !== cardId) }
    : player);
  const trick = [...game.trick, { playerIndex, card }];
  const revealedContractPlayerIndexes = game.playerCount === 5
    && card.suit === game.trump
    && card.rank === 11
    && game.contractPlayerIndexes.includes(playerIndex)
    ? [...new Set([...(game.revealedContractPlayerIndexes || []), playerIndex])]
    : game.revealedContractPlayerIndexes || [];
  if (trick.length < game.playerCount) {
    const nextPlayerIndex = (playerIndex + 1) % game.playerCount;
    return { ...game, players, trick, revealedContractPlayerIndexes, currentPlayerIndex: nextPlayerIndex, message: `${game.players[nextPlayerIndex].name} plays next.` };
  }
  return collectPinochleTrick({ ...game, players, trick, revealedContractPlayerIndexes });
}

export function winningPinochlePlay(trick, trump) {
  if (!trick.length) return null;
  const leadSuit = trick[0].card.suit;
  return trick.slice(1).reduce((winner, play) => cardBeats(play.card, winner.card, leadSuit, trump) ? play : winner, trick[0]);
}

function cardBeats(challenger, incumbent, leadSuit, trump) {
  if (challenger.suit === incumbent.suit) return RANK_STRENGTH.get(challenger.rank) > RANK_STRENGTH.get(incumbent.rank);
  if (challenger.suit === trump) return true;
  if (incumbent.suit === trump) return false;
  return challenger.suit === leadSuit && incumbent.suit !== leadSuit;
}

function collectPinochleTrick(game) {
  const winner = winningPinochlePlay(game.trick, game.trump);
  const trickPoints = game.trick.reduce((sum, play) => sum + ([14, 10, 13].includes(play.card.rank) ? PINOCHLE_SCORE_SCALE : 0), 0);
  const players = game.players.map((player, index) => index === winner.playerIndex
    ? { ...player, roundTrickPoints: player.roundTrickPoints + trickPoints, tricksWon: player.tricksWon + 1 }
    : player);
  const lastTrick = { cards: game.trick, winnerPlayerIndex: winner.playerIndex, points: trickPoints };
  const pendingRoundEnd = players.every((player) => player.hand.length === 0);
  if (pendingRoundEnd) {
    players[winner.playerIndex] = {
      ...players[winner.playerIndex],
      roundTrickPoints: players[winner.playerIndex].roundTrickPoints + PINOCHLE_SCORE_SCALE,
    };
  }
  return {
    ...game,
    players,
    lastTrick,
    phase: "trick-complete",
    trickNumber: game.trickNumber + 1,
    leadPlayerIndex: winner.playerIndex,
    currentPlayerIndex: winner.playerIndex,
    pendingRoundEnd,
    message: `${game.players[winner.playerIndex].name} won the trick. Review the cards, then clear the trick.`,
  };
}

export function clearPinochleTrick(game) {
  if (game.phase !== "trick-complete") throw new Error("There is no completed trick to clear.");
  const cleared = {
    ...game,
    trick: [],
    pendingRoundEnd: false,
  };
  if (game.pendingRoundEnd) return finishPinochleRound(cleared);
  if (game.playerCount === 2 && twoPlayerStockCount(game) > 0) {
    const winnerPlayerIndex = game.lastTrick.winnerPlayerIndex;
    return {
      ...cleared,
      phase: "two-player-melding",
      currentPlayerIndex: winnerPlayerIndex,
      leadPlayerIndex: winnerPlayerIndex,
      message: `${game.players[winnerPlayerIndex].name} may lay down one meld before drawing.`,
    };
  }
  return {
    ...cleared,
    phase: "playing",
    currentPlayerIndex: game.lastTrick.winnerPlayerIndex,
    leadPlayerIndex: game.lastTrick.winnerPlayerIndex,
    message: `${game.players[game.lastTrick.winnerPlayerIndex].name} leads the next trick.`,
  };
}

export function getAvailableTwoPlayerMelds(game, playerIndex) {
  if (game.playerCount !== 2 || game.phase !== "two-player-melding" || game.currentPlayerIndex !== playerIndex) return [];
  const declaredPoints = game.twoPlayerDeclaredMeldPoints?.[playerIndex] || {};
  return calculatePinochleMeld(game.players[playerIndex].hand, game.trump).items
    .map((item) => {
      const key = item.name.replace(/ ×\d+$/, "");
      const previousPoints = declaredPoints[key] || 0;
      return { ...item, key, points: item.points - previousPoints, cumulativePoints: item.points };
    })
    .filter((item) => item.points > 0);
}

export function declareTwoPlayerPinochleMeld(game, playerIndex, meldKey) {
  requirePhaseAndTurn(game, "two-player-melding", playerIndex);
  const meld = getAvailableTwoPlayerMelds(game, playerIndex).find((item) => item.key === meldKey);
  if (!meld) throw new Error("Choose one available meld.");
  const melds = game.melds.map((playerMeld, index) => index === playerIndex
    ? { total: playerMeld.total + meld.points, items: [...playerMeld.items, meld] }
    : playerMeld);
  const teamMeldPoints = game.teamMeldPoints.map((points, teamId) => teamId === game.players[playerIndex].teamId
    ? points + meld.points
    : points);
  const twoPlayerDeclaredMeldPoints = game.twoPlayerDeclaredMeldPoints.map((points, index) => index === playerIndex
    ? { ...points, [meld.key]: meld.cumulativePoints }
    : points);
  return drawTwoPlayerStockCards({ ...game, melds, teamMeldPoints, twoPlayerDeclaredMeldPoints }, `${game.players[playerIndex].name} laid down ${meld.name} for ${meld.points}.`);
}

export function skipTwoPlayerPinochleMeld(game, playerIndex) {
  requirePhaseAndTurn(game, "two-player-melding", playerIndex);
  return drawTwoPlayerStockCards(game, `${game.players[playerIndex].name} did not lay down meld.`);
}

function drawTwoPlayerStockCards(game, prefix) {
  let stock = [...game.stock];
  let stockTrumpCard = game.stockTrumpCard;
  const draw = () => {
    if (stock.length) return stock.shift();
    const card = stockTrumpCard;
    stockTrumpCard = null;
    return card;
  };
  const winnerPlayerIndex = game.currentPlayerIndex;
  const otherPlayerIndex = (winnerPlayerIndex + 1) % 2;
  const winnerCard = draw();
  const otherCard = draw();
  const players = game.players.map((player, index) => {
    const card = index === winnerPlayerIndex ? winnerCard : index === otherPlayerIndex ? otherCard : null;
    return card ? { ...player, hand: sortPinochleCards([...player.hand, card], game.trump) } : player;
  });
  return {
    ...game,
    players,
    stock,
    stockTrumpCard,
    phase: "playing",
    trick: [],
    currentPlayerIndex: winnerPlayerIndex,
    leadPlayerIndex: winnerPlayerIndex,
    message: `${prefix} ${game.players[winnerPlayerIndex].name} drew first and leads.`,
  };
}

function twoPlayerStockCount(game) {
  return (game.stock?.length || 0) + (game.stockTrumpCard ? 1 : 0);
}

function finishPinochleRound(game) {
  if (game.playerCount === 2 && game.highBidderIndex === null) return finishTwoPlayerPinochleRound(game);
  if (game.playerCount === 5) return finishFivePlayerPinochleRound(game);
  const teamTrickPoints = game.teams.map((team) => team.memberIds.reduce((sum, index) => sum + game.players[index].roundTrickPoints, 0));
  const scoringPoints = game.teams.map((team, teamId) => {
    const tricksWon = team.memberIds.reduce((sum, index) => sum + game.players[index].tricksWon, 0);
    return teamTrickPoints[teamId] + (tricksWon > 0 ? game.teamMeldPoints[teamId] : 0);
  });
  const biddingTeamId = game.players[game.highBidderIndex].teamId;
  const madeContract = scoringPoints[biddingTeamId] >= game.highBid;
  const roundDeltas = scoringPoints.map((points, teamId) => teamId === biddingTeamId && !madeContract ? -game.highBid : points);
  const teams = game.teams.map((team, teamId) => ({ ...team, score: team.score + roundDeltas[teamId] }));
  const topScore = Math.max(...teams.map((team) => team.score));
  const winnerTeamIds = topScore >= game.targetScore ? teams.filter((team) => team.score === topScore).map((team) => team.id) : [];
  return {
    ...game,
    teams,
    phase: winnerTeamIds.length ? "game-over" : "round-over",
    winnerTeamIds,
    roundSummary: { biddingTeamId, madeContract, teamTrickPoints, teamMeldPoints: game.teamMeldPoints, scoringPoints, roundDeltas },
    message: madeContract
      ? `${teamName(game, biddingTeamId)} made the ${game.highBid} bid.`
      : `${teamName(game, biddingTeamId)} was set ${game.highBid}.`,
  };
}

function finishTwoPlayerPinochleRound(game) {
  const teamTrickPoints = game.players.map((player) => player.roundTrickPoints);
  const scoringPoints = game.teams.map((team, teamId) => teamTrickPoints[teamId] + game.teamMeldPoints[teamId]);
  const roundDeltas = scoringPoints;
  const teams = game.teams.map((team, teamId) => ({ ...team, score: team.score + roundDeltas[teamId] }));
  const topScore = Math.max(...teams.map((team) => team.score));
  const winnerTeamIds = topScore >= game.targetScore ? teams.filter((team) => team.score === topScore).map((team) => team.id) : [];
  return {
    ...game,
    teams,
    phase: winnerTeamIds.length ? "game-over" : "round-over",
    winnerTeamIds,
    roundSummary: {
      biddingTeamId: null,
      madeContract: true,
      teamTrickPoints,
      teamMeldPoints: game.teamMeldPoints,
      scoringPoints,
      roundDeltas,
    },
    message: `${game.players[0].name} scored ${roundDeltas[0]}; ${game.players[1].name} scored ${roundDeltas[1]}.`,
  };
}

function finishFivePlayerPinochleRound(game) {
  const teamTrickPoints = game.players.map((player) => player.roundTrickPoints);
  const scoringPoints = game.players.map((player, index) => player.roundTrickPoints
    + (player.tricksWon > 0 ? game.melds[index].total : 0));
  const contractPlayerIndexes = game.contractPlayerIndexes || [game.highBidderIndex];
  const contractTrickPoints = contractPlayerIndexes.reduce((sum, index) => sum + teamTrickPoints[index], 0);
  const contractTricksWon = contractPlayerIndexes.reduce((sum, index) => sum + game.players[index].tricksWon, 0);
  const bidderMeldPoints = contractTricksWon > 0 ? game.melds[game.highBidderIndex].total : 0;
  const contractPoints = bidderMeldPoints + contractTrickPoints;
  const madeContract = contractPoints >= game.highBid;
  const roundDeltas = scoringPoints.map((points, index) => contractPlayerIndexes.includes(index)
    ? madeContract ? contractPoints : -game.highBid
    : points);
  const teams = game.teams.map((team, teamId) => ({ ...team, score: team.score + roundDeltas[teamId] }));
  const topScore = Math.max(...teams.map((team) => team.score));
  const winnerTeamIds = topScore >= game.targetScore ? teams.filter((team) => team.score === topScore).map((team) => team.id) : [];
  const contractNames = contractPlayerIndexes.map((index) => game.players[index].name).join(", ");
  return {
    ...game,
    teams,
    phase: winnerTeamIds.length ? "game-over" : "round-over",
    winnerTeamIds,
    roundSummary: {
      biddingTeamId: game.players[game.highBidderIndex].teamId,
      contractTeamIds: contractPlayerIndexes.map((index) => game.players[index].teamId),
      madeContract,
      contractPoints,
      bidderMeldPoints,
      contractTrickPoints,
      teamTrickPoints,
      teamMeldPoints: game.teamMeldPoints,
      scoringPoints,
      roundDeltas,
    },
    message: madeContract
      ? `${contractNames} made the ${game.highBid} bid with ${contractPoints} points.`
      : `${contractNames} were set ${game.highBid}.`,
  };
}

export function startNextPinochleRound(game, random = Math.random) {
  if (game.phase !== "round-over") throw new Error("The round is not over.");
  return dealPinochleRound(game, random);
}

export function choosePinochleBotBid(game, playerIndex) {
  const activePlayerIndexes = game.players
    .map((_, index) => index)
    .filter((index) => !game.passedPlayerIndexes.includes(index));
  if (game.highBidderIndex !== null
    && game.players[game.highBidderIndex].teamId === game.players[playerIndex].teamId
    && remainingBiddersAreTeammates(game, activePlayerIndexes)) {
    return null;
  }
  const hand = game.players[playerIndex].hand;
  const bestMeld = Math.max(...PINOCHLE_SUITS.map((suit) => calculatePinochleMeld(hand, suit).total));
  const counters = hand.filter((card) => [14, 10, 13].includes(card.rank)).length;
  const strongestSuit = Math.max(...PINOCHLE_SUITS.map((suit) => hand
    .filter((card) => card.suit === suit)
    .reduce((sum, card) => sum + RANK_STRENGTH.get(card.rank) + 1, 0)));
  const confidence = bestMeld / PINOCHLE_SCORE_SCALE + counters + Math.floor(strongestSuit / 4);
  const maximumRaise = (game.playerCount === 6 ? 24 : 14) * PINOCHLE_SCORE_SCALE;
  const ceiling = game.minimumBid + Math.min(maximumRaise, Math.floor(confidence / 2) * PINOCHLE_SCORE_SCALE);
  const required = game.highBid === null ? game.minimumBid : game.highBid + PINOCHLE_BID_INCREMENT;
  return required <= ceiling ? required : null;
}

export function choosePinochleBotTrump(game, playerIndex) {
  return PINOCHLE_SUITS.reduce((best, suit) => {
    const hand = game.players[playerIndex].hand;
    const score = calculatePinochleMeld(hand, suit).total
      + hand.filter((card) => card.suit === suit).reduce((sum, card) => sum + RANK_STRENGTH.get(card.rank), 0);
    return score > best.score ? { suit, score } : best;
  }, { suit: PINOCHLE_SUITS[0], score: -1 }).suit;
}

export function choosePinochleBotCard(game, playerIndex) {
  let legal = getLegalPinochleCards(game, playerIndex);
  if (game.playerCount === 2 && game.trick.length) {
    const leadSuitCards = legal.filter((card) => card.suit === game.trick[0].card.suit);
    if (leadSuitCards.length) legal = leadSuitCards;
  }
  if (!game.trick.length) {
    return [...legal].sort((left, right) => Number(right.suit === game.trump) - Number(left.suit === game.trump)
      || RANK_STRENGTH.get(right.rank) - RANK_STRENGTH.get(left.rank))[0];
  }
  const winning = legal.filter((card) => cardBeats(card, winningPinochlePlay(game.trick, game.trump).card, game.trick[0].card.suit, game.trump));
  const choices = winning.length ? winning : legal;
  return [...choices].sort((left, right) => RANK_STRENGTH.get(left.rank) - RANK_STRENGTH.get(right.rank))[0];
}

export function choosePinochleBotDiscard(game, playerIndex) {
  return [...game.players[playerIndex].hand]
    .sort((left, right) => Number(left.suit === game.trump) - Number(right.suit === game.trump)
      || RANK_STRENGTH.get(left.rank) - RANK_STRENGTH.get(right.rank))
    .slice(0, game.kittySize)
    .map((card) => card.id);
}

export function choosePinochleBotPartnerPass(game, playerIndex) {
  return [...game.players[playerIndex].hand]
    .sort((left, right) => Number(right.suit === game.trump) - Number(left.suit === game.trump)
      || RANK_STRENGTH.get(right.rank) - RANK_STRENGTH.get(left.rank))
    .slice(0, game.exchangeCount)
    .map((card) => card.id);
}

export function choosePinochleBotPartnerReturn(game, playerIndex) {
  return [...game.players[playerIndex].hand]
    .sort((left, right) => Number(left.suit === game.trump) - Number(right.suit === game.trump)
      || RANK_STRENGTH.get(left.rank) - RANK_STRENGTH.get(right.rank))
    .slice(0, game.exchangeCount)
    .map((card) => card.id);
}

export function pinochleTeamName(game, teamId) {
  return teamName(game, teamId);
}

function teamName(game, teamId) {
  const names = game.teams[teamId].memberIds.map((index) => game.players[index].name);
  return game.partnershipGame ? names.join(" & ") : names[0];
}

function requirePhaseAndTurn(game, phase, playerIndex) {
  if (game.phase !== phase) throw new Error(`That action is only available during ${phase}.`);
  if (game.currentPlayerIndex !== playerIndex) throw new Error("It is not your turn.");
}
