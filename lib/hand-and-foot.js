export const HAND_FOOT_SUITS = ["clubs", "diamonds", "spades", "hearts"];
export const HAND_FOOT_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const HAND_FOOT_REQUIREMENTS = [50, 90, 120, 150];

export const HAND_FOOT_SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

const BOT_NAMES = ["Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash"];

export function handFootRankLabel(rank) {
  if (rank === "wild") return "Wild";
  return { 11: "J", 12: "Q", 13: "K", 14: "A" }[rank] || String(rank);
}

export function formatHandFootCard(card) {
  if (card.rank === "joker") return "Joker";
  return `${handFootRankLabel(card.rank)}${HAND_FOOT_SUIT_SYMBOLS[card.suit]}`;
}

export function isWildCard(card) {
  return card.rank === 2 || card.rank === "joker";
}

export function isThree(card) {
  return card.rank === 3;
}

export function handFootCardPoints(card) {
  if (card.rank === "joker") return 50;
  if (card.rank === 2 || card.rank === 14) return 20;
  if (card.rank >= 8) return 10;
  if (card.rank >= 4) return 5;
  if (card.rank === 3) return card.suit === "hearts" || card.suit === "diamonds" ? -100 : -300;
  return 0;
}

export function createHandFootDeck(playerCount) {
  const deck = [];
  for (let copy = 0; copy < playerCount; copy += 1) {
    for (const suit of HAND_FOOT_SUITS) {
      for (const rank of HAND_FOOT_RANKS) {
        deck.push({ id: `${copy}-${suit}-${rank}`, copy, suit, rank });
      }
    }
    deck.push({ id: `${copy}-joker-0`, copy, suit: null, rank: "joker" });
    deck.push({ id: `${copy}-joker-1`, copy, suit: null, rank: "joker" });
  }
  return deck;
}

export function shuffleHandFootDeck(deck, random = Math.random) {
  const result = [...deck];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function sortHandFootCards(cards) {
  return [...cards].sort((left, right) => {
    if (left.rank === "joker") return right.rank === "joker" ? left.copy - right.copy : 1;
    if (right.rank === "joker") return -1;
    return left.rank - right.rank || HAND_FOOT_SUITS.indexOf(left.suit) - HAND_FOOT_SUITS.indexOf(right.suit) || left.copy - right.copy;
  });
}

export function createHandFootMatch({ playerName = "You", playerCount = 4, teammateName = "Vega", random = Math.random } = {}) {
  if (playerCount < 4 || playerCount % 2 !== 0 || playerCount > 8) {
    throw new Error("Hand and Foot requires an even number of players from 4 to 8.");
  }

  const availableBots = BOT_NAMES.slice(0, playerCount - 1);
  const selectedTeammate = availableBots.includes(teammateName) ? teammateName : availableBots[0];
  const others = availableBots.filter((name) => name !== selectedTeammate);
  const names = Array(playerCount).fill(null);
  names[0] = playerName.trim() || "You";
  names[playerCount / 2] = selectedTeammate;
  let nextOther = 0;
  for (let index = 1; index < names.length; index += 1) {
    if (!names[index]) names[index] = others[nextOther++];
  }

  const players = names.map((name, index) => ({
    id: index,
    name,
    teamId: index < playerCount / 2 ? index : index - playerCount / 2,
    hand: [],
    foot: [],
    usingFoot: false,
  }));
  const teams = Array.from({ length: playerCount / 2 }, (_, id) => ({
    id,
    memberIds: [id, id + playerCount / 2],
    score: 0,
    roundScore: 0,
    opened: false,
    melds: {},
  }));

  return dealHandFootRound({
    playerCount,
    players,
    teams,
    roundNumber: 1,
    dealerIndex: playerCount - 1,
    history: [],
    phase: "playing",
  }, random);
}

export function dealHandFootRound(match, random = Math.random) {
  const deck = shuffleHandFootDeck(createHandFootDeck(match.playerCount), random);
  const players = match.players.map((player) => ({ ...player, hand: [], foot: [], usingFoot: false }));
  let deckIndex = 0;
  for (let cardIndex = 0; cardIndex < 13; cardIndex += 1) {
    for (const player of players) player.hand.push(deck[deckIndex++]);
  }
  for (let cardIndex = 0; cardIndex < 13; cardIndex += 1) {
    for (const player of players) player.foot.push(deck[deckIndex++]);
  }
  for (const player of players) player.hand = sortHandFootCards(player.hand);

  const teams = match.teams.map((team) => ({ ...team, opened: false, roundScore: 0, melds: {} }));
  return {
    ...match,
    players,
    teams,
    drawPile: deck.slice(deckIndex),
    discardPile: [],
    currentPlayerIndex: (match.dealerIndex + 1) % match.playerCount,
    turnStage: "draw",
    roundRequirement: HAND_FOOT_REQUIREMENTS[match.roundNumber - 1],
    phase: "playing",
    roundSummary: null,
    winnerTeamId: null,
    message: `${players[(match.dealerIndex + 1) % match.playerCount].name} draws first.`,
  };
}

export function activeCardsFor(state, playerIndex) {
  const player = state.players[playerIndex];
  return player.usingFoot ? player.foot : player.hand;
}

export function drawHandFootCards(state, playerIndex) {
  requireTurn(state, playerIndex, "draw");
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  if (drawPile.length < 2 && discardPile.length > 1) {
    const top = discardPile.at(-1);
    drawPile = shuffleHandFootDeck(discardPile.slice(0, -1));
    discardPile = [top];
  }
  if (drawPile.length < 2) throw new Error("There are not enough cards left to draw two.");
  const drawn = drawPile.splice(-2);
  const players = state.players.map((player, index) => index === playerIndex
    ? {
        ...player,
        [player.usingFoot ? "foot" : "hand"]: sortHandFootCards([...activeCardsFor(state, playerIndex), ...drawn]),
      }
    : player);
  return {
    ...state,
    players,
    drawPile,
    discardPile,
    turnStage: "play",
    message: `${state.players[playerIndex].name} drew two cards and may meld or discard.`,
  };
}

export function playHandFootCards(state, playerIndex, cardIds) {
  requireTurn(state, playerIndex, "play");
  if (!cardIds.length) throw new Error("Select at least one card to play.");
  const activeCards = activeCardsFor(state, playerIndex);
  const selected = cardIds.map((id) => activeCards.find((card) => card.id === id));
  if (selected.some((card) => !card) || new Set(cardIds).size !== cardIds.length) {
    throw new Error("Every selected card must be in your current pile.");
  }
  if (selected.some(isThree)) throw new Error("Threes cannot be melded.");

  const player = state.players[playerIndex];
  const team = state.teams[player.teamId];
  const additions = buildMeldAdditions(team, selected);
  if (!team.opened) {
    const openingPoints = selected.reduce((sum, card) => sum + handFootCardPoints(card), 0);
    if (openingPoints < state.roundRequirement) {
      throw new Error(`Your opening must total at least ${state.roundRequirement} points.`);
    }
  }

  const melds = { ...team.melds };
  for (const [key, cards] of Object.entries(additions)) {
    melds[key] = [...(melds[key] || []), ...cards];
  }
  const nextTeam = { ...team, opened: true, melds };
  const selectedIds = new Set(cardIds);
  const players = state.players.map((candidate, index) => {
    if (index !== playerIndex) return candidate;
    const pileKey = candidate.usingFoot ? "foot" : "hand";
    const pile = candidate[pileKey].filter((card) => !selectedIds.has(card.id));
    return { ...candidate, [pileKey]: pile, usingFoot: candidate.usingFoot || (pileKey === "hand" && pile.length === 0) };
  });
  const teams = state.teams.map((candidate) => candidate.id === team.id ? nextTeam : candidate);
  const updatedPlayer = players[playerIndex];
  const pickedUpFoot = !player.usingFoot && updatedPlayer.usingFoot;

  if (updatedPlayer.usingFoot && updatedPlayer.foot.length === 0) {
    const teammateId = team.memberIds.find((id) => id !== playerIndex);
    if (activeCardsFor({ ...state, players }, teammateId).some(isThree)) {
      throw new Error("You cannot go out while your teammate still holds a 3.");
    }
    return finishHandFootRound({
      ...state,
      players,
      teams,
      message: `${player.name} went out!`,
    }, playerIndex);
  }

  return {
    ...state,
    players,
    teams,
    message: pickedUpFoot
      ? `${player.name} emptied their hand and picked up their foot.`
      : `${player.name} added ${selected.length} card${selected.length === 1 ? "" : "s"} to the table.`,
  };
}

export function canPlayHandFootCards(state, playerIndex, cardIds) {
  if (!cardIds.length) return false;
  try {
    playHandFootCards(state, playerIndex, cardIds);
    return true;
  } catch {
    return false;
  }
}

export function discardHandFootCard(state, playerIndex, cardId) {
  requireTurn(state, playerIndex, "play");
  const player = state.players[playerIndex];
  const activeCards = activeCardsFor(state, playerIndex);
  const card = activeCards.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error("That card is not in your current pile.");
  if (player.usingFoot && activeCards.length === 1) {
    throw new Error("The last card in your foot must be played, not discarded.");
  }
  const pileKey = player.usingFoot ? "foot" : "hand";
  const remaining = activeCards.filter((candidate) => candidate.id !== cardId);
  const players = state.players.map((candidate, index) => index === playerIndex
    ? { ...candidate, [pileKey]: remaining, usingFoot: candidate.usingFoot || (pileKey === "hand" && remaining.length === 0) }
    : candidate);
  const nextPlayerIndex = (playerIndex + 1) % state.playerCount;
  return {
    ...state,
    players,
    discardPile: [...state.discardPile, card],
    currentPlayerIndex: nextPlayerIndex,
    turnStage: "draw",
    message: `${player.name} discarded ${formatHandFootCard(card)}. ${players[nextPlayerIndex].name} draws next.`,
  };
}

function buildMeldAdditions(team, selected) {
  const wilds = selected.filter(isWildCard);
  const naturalGroups = selected.filter((card) => !isWildCard(card)).reduce((groups, card) => {
    const key = String(card.rank);
    groups[key] = [...(groups[key] || []), card];
    return groups;
  }, {});
  const additions = {};
  let wildIndex = 0;
  const keys = Object.keys(naturalGroups);

  for (const key of keys) {
    const existing = team.melds[key] || [];
    const naturals = naturalGroups[key];
    let neededWilds = 0;
    if (!existing.length && naturals.length < 3) neededWilds = 3 - naturals.length;
    if (neededWilds > 0) {
      if (naturals.length < 2 || wilds.length - wildIndex < neededWilds) {
        throw new Error(`A new ${handFootRankLabel(Number(key))} meld needs at least three cards and enough natural cards.`);
      }
    }
    additions[key] = [...naturals, ...wilds.slice(wildIndex, wildIndex + neededWilds)];
    wildIndex += neededWilds;
  }

  const unusedWilds = wilds.slice(wildIndex);
  if (unusedWilds.length) {
    if (keys.length === 0) additions.wild = unusedWilds;
    else if (keys.length === 1) additions[keys[0]].push(...unusedWilds);
    else throw new Error("Play extra wild cards with one rank at a time.");
  }
  if (!Object.keys(additions).length) throw new Error("Those cards do not form a meld.");

  for (const [key, cards] of Object.entries(additions)) {
    const existing = team.melds[key] || [];
    const combined = [...existing, ...cards];
    if (!existing.length && combined.length < 3) {
      throw new Error(`A new ${handFootRankLabel(key === "wild" ? key : Number(key))} meld needs at least three cards.`);
    }
    if (key === "wild") {
      if (combined.some((card) => !isWildCard(card))) throw new Error("Only twos and jokers belong in the wild meld.");
      continue;
    }
    const naturals = combined.filter((card) => !isWildCard(card));
    const combinedWilds = combined.filter(isWildCard);
    if (naturals.some((card) => String(card.rank) !== key)) throw new Error("All natural cards in a meld must have the same rank.");
    if (combinedWilds.length > 2) throw new Error("A regular meld cannot contain more than two wild cards.");
    if (combinedWilds.length > naturals.length) throw new Error("A meld cannot contain more wild cards than natural cards.");
  }
  return additions;
}

export function handFootMeldBonus(rank, cards) {
  if (cards.length < 7) return 0;
  if (String(rank) === "7") return 3000;
  if (rank === "wild") return 2500;
  return cards.some(isWildCard) ? 300 : 500;
}

export function scoreHandFootTeam(team, players) {
  const meldCards = Object.values(team.melds).flat();
  const laidPoints = meldCards.reduce((sum, card) => sum + handFootCardPoints(card), 0);
  const bookBonus = Object.entries(team.melds).reduce((sum, [rank, cards]) => sum + handFootMeldBonus(rank, cards), 0);
  const leftoverPoints = team.memberIds.reduce((teamTotal, playerId) => {
    const player = players[playerId];
    return teamTotal + [...player.hand, ...player.foot].reduce((sum, card) => {
      const points = handFootCardPoints(card);
      return sum + (isThree(card) ? points : -points);
    }, 0);
  }, 0);
  return { laidPoints, bookBonus, leftoverPoints, total: laidPoints + bookBonus + leftoverPoints };
}

function finishHandFootRound(state, wentOutPlayerId) {
  const breakdowns = state.teams.map((team) => ({ teamId: team.id, ...scoreHandFootTeam(team, state.players) }));
  const teams = state.teams.map((team) => {
    const breakdown = breakdowns[team.id];
    return { ...team, roundScore: breakdown.total, score: team.score + breakdown.total };
  });
  const history = [...state.history, { roundNumber: state.roundNumber, wentOutPlayerId, breakdowns }];
  if (state.roundNumber === 4) {
    const winnerTeamId = [...teams].sort((left, right) => right.score - left.score)[0].id;
    return { ...state, teams, history, phase: "game-over", winnerTeamId, roundSummary: history.at(-1) };
  }
  return { ...state, teams, history, phase: "round-over", roundSummary: history.at(-1) };
}

export function startNextHandFootRound(state, random = Math.random) {
  if (state.phase !== "round-over") throw new Error("The current round is not over.");
  return dealHandFootRound({
    ...state,
    roundNumber: state.roundNumber + 1,
    dealerIndex: (state.dealerIndex + 1) % state.playerCount,
    roundSummary: null,
  }, random);
}

export function chooseHandFootBotPlay(state, playerIndex) {
  const player = state.players[playerIndex];
  const team = state.teams[player.teamId];
  const cards = activeCardsFor(state, playerIndex);
  const groups = cards.filter((card) => !isWildCard(card) && !isThree(card)).reduce((result, card) => {
    const key = String(card.rank);
    result[key] = [...(result[key] || []), card];
    return result;
  }, {});
  const wilds = cards.filter(isWildCard);

  if (!team.opened) {
    const candidate = [];
    let wildIndex = 0;
    for (const group of Object.values(groups).sort((a, b) => b.length - a.length)) {
      if (group.length >= 3) candidate.push(...group);
      else if (group.length === 2 && wildIndex < wilds.length) candidate.push(...group, wilds[wildIndex++]);
    }
    if (!candidate.length && wilds.length - wildIndex >= 3) candidate.push(...wilds.slice(wildIndex));
    if (candidate.reduce((sum, card) => sum + handFootCardPoints(card), 0) >= state.roundRequirement) return candidate.map((card) => card.id);
    return [];
  }

  for (const [key, group] of Object.entries(groups)) {
    if (team.melds[key]) return group.map((card) => card.id);
    if (group.length >= 3) return group.map((card) => card.id);
    if (group.length === 2 && wilds.length) return [...group, wilds[0]].map((card) => card.id);
  }
  if (wilds.length >= 3 || (team.melds.wild && wilds.length)) return wilds.map((card) => card.id);
  return [];
}

export function chooseHandFootBotDiscard(state, playerIndex) {
  const cards = activeCardsFor(state, playerIndex);
  return [...cards].sort((left, right) => {
    if (isThree(left) !== isThree(right)) return isThree(left) ? -1 : 1;
    if (isWildCard(left) !== isWildCard(right)) return isWildCard(left) ? 1 : -1;
    return handFootCardPoints(left) - handFootCardPoints(right);
  })[0];
}

function requireTurn(state, playerIndex, stage) {
  if (state.phase !== "playing") throw new Error("The round is not currently being played.");
  if (state.currentPlayerIndex !== playerIndex) throw new Error("It is not that player's turn.");
  if (state.turnStage !== stage) throw new Error(stage === "draw" ? "Draw before playing." : "Draw two cards first.");
}
