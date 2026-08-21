import { shuffled } from "./shuffle.js";

export const HAND_FOOT_SUITS = ["clubs", "diamonds", "spades", "hearts"];
export const HAND_FOOT_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const HAND_FOOT_REQUIREMENTS = [50, 90, 120, 150];
export const HAND_FOOT_MAX_PLAYERS = 16;
export const HAND_FOOT_DRAW_PILE_SIZE = 65;

export const HAND_FOOT_SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

const BOT_NAMES = ["Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash", "Sage", "Remy", "Quinn", "Blair", "Drew", "Lane", "Parker", "Sky"];

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
  for (let copy = 0; copy < playerCount + 1; copy += 1) {
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

export const shuffleHandFootDeck = shuffled;

export function sortHandFootCards(cards) {
  return [...cards].sort((left, right) => {
    if (left.rank === "joker") return right.rank === "joker" ? left.copy - right.copy : 1;
    if (right.rank === "joker") return -1;
    return left.rank - right.rank || HAND_FOOT_SUITS.indexOf(left.suit) - HAND_FOOT_SUITS.indexOf(right.suit) || left.copy - right.copy;
  });
}

export function splitHandFootDrawPiles(cards) {
  const piles = [];
  for (let index = 0; index < cards.length; index += HAND_FOOT_DRAW_PILE_SIZE) {
    piles.push(cards.slice(index, index + HAND_FOOT_DRAW_PILE_SIZE));
  }
  return piles.length ? piles : [[]];
}

export function createHandFootMatch({ playerName = "You", playerCount = 4, teammateName = "Vega", startingPlayerIndex = 0, random = Math.random } = {}) {
  if (playerCount < 4 || playerCount % 2 !== 0 || playerCount > HAND_FOOT_MAX_PLAYERS) {
    throw new Error("Hand and Foot requires an even number of players from 4 to 16.");
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

  const seatedPlayers = names.map((name, index) => ({
    playerId: `local-${index}`,
    id: index,
    name,
    isComputer: index !== 0,
    teamId: index < playerCount / 2 ? index : index - playerCount / 2,
  }));
  return createSeatedHandFootMatch(seatedPlayers, random, startingPlayerIndex);
}

export function createHandFootRoomMatch({ teamPairs, startingPlayerIndex = 0, random = Math.random } = {}) {
  if (!Array.isArray(teamPairs) || teamPairs.length < 2 || teamPairs.length > HAND_FOOT_MAX_PLAYERS / 2 || teamPairs.some((pair) => !Array.isArray(pair) || pair.length !== 2)) {
    throw new Error("Hand and Foot requires two to eight teams of two.");
  }
  const seeds = teamPairs.flat();
  if (new Set(seeds.map((seed) => seed.playerId)).size !== seeds.length) {
    throw new Error("Every player must belong to exactly one team.");
  }
  const seatedPlayers = [
    ...teamPairs.map((pair) => pair[0]),
    ...teamPairs.map((pair) => pair[1]),
  ].map((seed, index) => ({
    id: index,
    playerId: seed.playerId,
    name: seed.name,
    isComputer: Boolean(seed.isComputer),
    teamId: index < teamPairs.length ? index : index - teamPairs.length,
  }));
  return createSeatedHandFootMatch(seatedPlayers, random, startingPlayerIndex);
}

function createSeatedHandFootMatch(seatedPlayers, random, startingPlayerIndex) {
  const playerCount = seatedPlayers.length;
  const normalizedStartingPlayerIndex = ((startingPlayerIndex % playerCount) + playerCount) % playerCount;
  const players = seatedPlayers.map((player) => ({
    ...player,
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
    startingPlayerIndex: normalizedStartingPlayerIndex,
    dealerIndex: (normalizedStartingPlayerIndex - 1 + playerCount) % playerCount,
    history: [],
    phase: "playing",
  }, random);
}

export function dealHandFootRound(match, random = Math.random) {
  const deck = shuffleHandFootDeck(createHandFootDeck(match.playerCount), random);
  const players = match.players.map((player) => ({ ...player, hand: [], foot: [], pendingDraw: [], usingFoot: false }));
  let deckIndex = 0;
  for (let cardIndex = 0; cardIndex < 13; cardIndex += 1) {
    for (const player of players) player.hand.push(deck[deckIndex++]);
  }
  for (let cardIndex = 0; cardIndex < 13; cardIndex += 1) {
    for (const player of players) player.foot.push(deck[deckIndex++]);
  }
  for (const player of players) player.hand = sortHandFootCards(player.hand);

  const teams = match.teams.map((team) => ({ ...team, opened: false, roundScore: 0, melds: {} }));
  const drawPile = deck.slice(deckIndex);
  return {
    ...match,
    players,
    teams,
    drawPile,
    drawPiles: splitHandFootDrawPiles(drawPile),
    discardPile: [],
    cardsDrawnThisTurn: 0,
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

export function toggleHandFootCardSelection(cards, selectedIds, cardId, teamMelds = {}) {
  const clickedCard = cards.find((card) => card.id === cardId);
  if (!clickedCard) return selectedIds;
  const selected = new Set(selectedIds);
  if (isWildCard(clickedCard) || isThree(clickedCard)) {
    if (selected.has(cardId)) selected.delete(cardId);
    else selected.add(cardId);
    return [...selected];
  }
  const matchingIds = cards.filter((card) => card.rank === clickedCard.rank).map((card) => card.id);
  if (matchingIds.length === 2 && !teamMelds[String(clickedCard.rank)]) {
    if (selected.has(cardId)) selected.delete(cardId);
    else selected.add(cardId);
    return [...selected];
  }
  if (selected.has(cardId)) {
    const selectedMatchingIds = matchingIds.filter((id) => selected.has(id));
    matchingIds.forEach((id) => selected.delete(id));
    if (selectedMatchingIds.length > 1) selected.add(cardId);
  } else {
    matchingIds.forEach((id) => selected.add(id));
  }
  return [...selected];
}

export function getHandFootGoOutBlockReason(state, playerIndex) {
  const player = state.players[playerIndex];
  if (!player?.usingFoot) return "";
  const team = state.teams[player.teamId];
  const teammateId = team?.memberIds.find((id) => id !== playerIndex);
  const teammate = state.players[teammateId];
  if (!teammate?.usingFoot) return "your teammate has not reached their foot";
  const teammateHasThree = state.viewerPlayerIndex === playerIndex && typeof state.viewerTeammateHasThree === "boolean"
    ? state.viewerTeammateHasThree
    : activeCardsFor(state, teammateId).some(isThree);
  return teammateHasThree ? "your teammate still holds a 3 in their foot" : "";
}

export function drawHandFootCards(state, playerIndex, pileIndex = null, cardCount = null) {
  if (state.phase !== "playing") throw new Error("The round is not currently being played.");
  const drawingAhead = playerIndex !== state.currentPlayerIndex;
  if (drawingAhead) {
    const precedingPlayerIndex = (playerIndex - 1 + state.playerCount) % state.playerCount;
    const precedingPlayerHasDrawn = precedingPlayerIndex === state.currentPlayerIndex
      ? state.turnStage === "play" && (state.cardsDrawnThisTurn || 0) >= 2
      : (state.players[precedingPlayerIndex].pendingDraw || []).length >= 2;
    if (!precedingPlayerHasDrawn) {
      throw new Error("You may draw ahead only after the player before you has drawn two cards.");
    }
  } else if (state.turnStage !== "draw") {
    throw new Error("You have already drawn two cards.");
  }

  const cardsAlreadyDrawn = drawingAhead
    ? (state.players[playerIndex].pendingDraw || []).length
    : (state.cardsDrawnThisTurn || 0);
  const cardsStillNeeded = 2 - cardsAlreadyDrawn;
  if (cardsStillNeeded <= 0) {
    throw new Error(drawingAhead ? "You have already drawn two cards ahead." : "You have already drawn two cards.");
  }
  const drawPiles = handFootDrawPilesFor(state);
  const cardsAvailable = drawPiles.reduce((sum, pile) => sum + pile.length, 0);
  if (cardsAvailable < cardsStillNeeded) {
    return finishHandFootRound({
      ...state,
      message: "The draw pile ran out. The round is over and all cards are being scored.",
    }, null, "draw-pile-empty");
  }
  const requestedCount = pileIndex === null
    ? cardsStillNeeded
    : Math.min(cardCount === null ? 1 : cardCount, cardsStillNeeded);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) throw new Error("Draw at least one card.");
  if (pileIndex !== null && (!Number.isInteger(pileIndex) || !drawPiles[pileIndex]?.length)) {
    throw new Error("That draw pile is empty.");
  }
  const drawn = [];
  for (let drawIndex = 0; drawIndex < requestedCount; drawIndex += 1) {
    const selectedPileIndex = pileIndex === null
      ? drawPiles.findLastIndex((pile) => pile.length > 0)
      : pileIndex;
    if (selectedPileIndex < 0 || !drawPiles[selectedPileIndex]?.length) throw new Error("That draw pile is empty.");
    drawn.push(drawPiles[selectedPileIndex].pop());
  }
  const remainingDrawPiles = drawPiles.filter((pile) => pile.length > 0);
  const drawPile = remainingDrawPiles.flat();
  const nextCardsDrawn = cardsAlreadyDrawn + drawn.length;
  const players = state.players.map((player, index) => index === playerIndex
    ? drawingAhead
      ? { ...player, pendingDraw: sortHandFootCards([...(player.pendingDraw || []), ...drawn]) }
      : {
          ...player,
          [player.usingFoot ? "foot" : "hand"]: sortHandFootCards([...activeCardsFor(state, playerIndex), ...drawn]),
        }
    : player);
  return {
    ...state,
    players,
    drawPile,
    drawPiles: remainingDrawPiles.length ? remainingDrawPiles : [[]],
    cardsDrawnThisTurn: drawingAhead ? state.cardsDrawnThisTurn : nextCardsDrawn,
    turnStage: drawingAhead ? state.turnStage : nextCardsDrawn === 2 ? "play" : "draw",
    message: drawingAhead
      ? nextCardsDrawn === 2
        ? `${state.players[playerIndex].name} drew two cards ahead for their next turn.`
        : `${state.players[playerIndex].name} drew one card ahead and may draw one more.`
      : nextCardsDrawn === 2
        ? `${state.players[playerIndex].name} drew two cards and may meld or discard.`
        : `${state.players[playerIndex].name} drew one card and must draw one more.`,
  };
}

export function playHandFootCards(state, playerIndex, cardIds, targetRank = null) {
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
  const goOutBlockReason = getHandFootGoOutBlockReason(state, playerIndex);
  if (player.usingFoot && goOutBlockReason && activeCards.length - selected.length < 2) {
    throw new Error(`You cannot go out because ${goOutBlockReason}. Keep at least two cards in your foot before discarding.`);
  }
  const additions = buildMeldAdditions(team, selected, targetRank);
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
    const enteringFoot = pileKey === "hand" && pile.length === 0;
    return {
      ...candidate,
      [pileKey]: pile,
      ...(enteringFoot ? { foot: sortHandFootCards(candidate.foot) } : {}),
      usingFoot: candidate.usingFoot || enteringFoot,
    };
  });
  const teams = state.teams.map((candidate) => candidate.id === team.id ? nextTeam : candidate);
  const updatedPlayer = players[playerIndex];
  const pickedUpFoot = !player.usingFoot && updatedPlayer.usingFoot;

  if (updatedPlayer.usingFoot && updatedPlayer.foot.length === 0) {
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

export function canPlayHandFootCards(state, playerIndex, cardIds, targetRank = null) {
  if (!cardIds.length) return false;
  try {
    playHandFootCards(state, playerIndex, cardIds, targetRank);
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
    const goOutBlockReason = getHandFootGoOutBlockReason(state, playerIndex);
    if (goOutBlockReason) throw new Error(`You cannot go out because ${goOutBlockReason}.`);
    const players = state.players.map((candidate, index) => index === playerIndex
      ? { ...candidate, foot: [] }
      : candidate);
    return finishHandFootRound({
      ...state,
      players,
      discardPile: [...state.discardPile, card],
      message: `${player.name} went out by discarding ${formatHandFootCard(card)}!`,
    }, playerIndex);
  }
  const pileKey = player.usingFoot ? "foot" : "hand";
  const remaining = activeCards.filter((candidate) => candidate.id !== cardId);
  let players = state.players.map((candidate, index) => {
    if (index !== playerIndex) return candidate;
    const enteringFoot = pileKey === "hand" && remaining.length === 0;
    return {
      ...candidate,
      [pileKey]: remaining,
      ...(enteringFoot ? { foot: sortHandFootCards(candidate.foot) } : {}),
      usingFoot: candidate.usingFoot || enteringFoot,
    };
  });
  const nextPlayerIndex = (playerIndex + 1) % state.playerCount;
  const pendingDraw = players[nextPlayerIndex].pendingDraw || [];
  if (pendingDraw.length) {
    players = players.map((candidate, index) => {
      if (index !== nextPlayerIndex) return candidate;
      const pileKey = candidate.usingFoot ? "foot" : "hand";
      return {
        ...candidate,
        [pileKey]: sortHandFootCards([...candidate[pileKey], ...pendingDraw]),
        pendingDraw: [],
      };
    });
  }
  const nextTurnStage = pendingDraw.length === 2 ? "play" : "draw";
  const nextTurnMessage = pendingDraw.length === 2
    ? `${players[nextPlayerIndex].name} already drew and may play.`
    : pendingDraw.length === 1
      ? `${players[nextPlayerIndex].name} must draw one more card.`
      : `${players[nextPlayerIndex].name} draws next.`;
  return {
    ...state,
    players,
    discardPile: [...state.discardPile, card],
    currentPlayerIndex: nextPlayerIndex,
    turnStage: nextTurnStage,
    cardsDrawnThisTurn: pendingDraw.length,
    message: `${player.name} discarded ${formatHandFootCard(card)}. ${nextTurnMessage}`,
  };
}

function handFootDrawPilesFor(state) {
  if (Array.isArray(state.drawPiles)) {
    const pileCardCount = state.drawPiles.reduce((sum, pile) => sum + pile.length, 0);
    if (pileCardCount === state.drawPile.length) return state.drawPiles.map((pile) => [...pile]);
  }
  return splitHandFootDrawPiles(state.drawPile);
}

function buildMeldAdditions(team, selected, targetRank = null) {
  const wilds = selected.filter(isWildCard);
  const naturalGroups = selected.filter((card) => !isWildCard(card)).reduce((groups, card) => {
    const key = String(card.rank);
    groups[key] = [...(groups[key] || []), card];
    return groups;
  }, {});
  const additions = {};
  let wildIndex = 0;
  const keys = Object.keys(naturalGroups);
  const hasExplicitWildTarget = targetRank !== null && targetRank !== undefined && selected.every(isWildCard);

  if (hasExplicitWildTarget) {
    const targetKey = String(targetRank);
    if (targetKey !== "wild" && !team.melds[targetKey]) {
      throw new Error("Choose an existing pile for the wild card.");
    }
    additions[targetKey] = selected;
  }

  for (const key of hasExplicitWildTarget ? [] : keys) {
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

  const unusedWilds = hasExplicitWildTarget ? [] : wilds.slice(wildIndex);
  if (unusedWilds.length) {
    if (keys.length === 0) additions.wild = unusedWilds;
    else if (!team.opened && unusedWilds.length >= 3) additions.wild = unusedWilds;
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
    if (combinedWilds.length >= naturals.length) throw new Error("A meld must contain more natural cards than wild cards.");
  }
  return additions;
}

export function handFootMeldBonus(rank, cards) {
  if (cards.length < 7) return 0;
  if (String(rank) === "7") return cards.some(isWildCard) ? 300 : 3000;
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

function finishHandFootRound(state, wentOutPlayerId, endReason = "went-out") {
  const breakdowns = state.teams.map((team) => ({ teamId: team.id, ...scoreHandFootTeam(team, state.players) }));
  const teams = state.teams.map((team) => {
    const breakdown = breakdowns[team.id];
    return { ...team, roundScore: breakdown.total, score: team.score + breakdown.total };
  });
  const history = [...state.history, { roundNumber: state.roundNumber, wentOutPlayerId, endReason, breakdowns }];
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

export function chooseHandFootBotMove(state, playerIndex) {
  const player = state.players[playerIndex];
  const team = state.teams[player.teamId];
  const cards = activeCardsFor(state, playerIndex);
  const groups = cards.filter((card) => !isWildCard(card) && !isThree(card)).reduce((result, card) => {
    const key = String(card.rank);
    result[key] = [...(result[key] || []), card];
    return result;
  }, {});
  const wilds = cards.filter(isWildCard);
  const options = [];
  for (const [rank, group] of Object.entries(groups)) {
    if (team.melds[rank]) {
      options.push({ cards: group, targetRank: null });
      if (wilds.length) options.push({ cards: [...group, wilds[0]], targetRank: null });
    } else if (group.length >= 3) {
      options.push({ cards: group, targetRank: null });
    } else if (group.length === 2 && wilds.length) {
      options.push({ cards: [...group, wilds[0]], targetRank: null });
    }
  }
  if (wilds.length >= 3 || (team.melds.wild && wilds.length)) options.push({ cards: wilds, targetRank: null });
  if (team.opened && wilds.length) {
    for (const [rank, meld] of Object.entries(team.melds)) {
      if (rank !== "wild" && meld.length === 6) {
        options.push({ cards: [wilds[0]], targetRank: rank });
      }
    }
  }

  const playableOptions = team.opened
    ? options
    : combineHandFootMeldOptions(options.map((option) => option.cards), cards.length)
      .map((combinedCards) => ({ cards: combinedCards, targetRank: null }));
  const candidates = playableOptions
    .filter((candidate) => candidate.cards.length && canPlayHandFootCards(state, playerIndex, candidate.cards.map((card) => card.id), candidate.targetRank))
    .filter((candidate) => team.opened || candidate.cards.reduce((sum, card) => sum + handFootCardPoints(card), 0) >= state.roundRequirement)
    .map((candidate) => ({
      ...candidate,
      regularWildAdditions: describeHandFootBotWildAdditions(team, candidate.cards, candidate.targetRank),
    }));
  const cleanEndPlayAvailable = candidates.some(({ cards: candidateCards, regularWildAdditions }) => (
    regularWildAdditions.length === 0 && cards.length - candidateCards.length <= 1
  ));
  const nearRoundEnd = isHandFootBotNearRoundEnd(state, playerIndex);

  return candidates
    .filter(({ cards: candidateCards, regularWildAdditions }) => {
      if (regularWildAdditions.length === 0) return true;
      if (cleanEndPlayAvailable) return false;
      const closeToClearingPile = cards.length - candidateCards.length <= 1;
      return regularWildAdditions.every(({ rank, existingLength, combinedLength }) => {
        const completesBook = existingLength < 7 && combinedLength >= 7;
        if (completesBook) return closeToClearingPile || nearRoundEnd;
        const opensDirtyMeld = existingLength === 0 && rank !== "7" && combinedLength >= 3;
        return opensDirtyMeld && closeToClearingPile;
      });
    })
    .sort((left, right) => scoreHandFootBotMeld(right.cards, team, right.targetRank) - scoreHandFootBotMeld(left.cards, team, left.targetRank))
    .map((candidate) => ({ cardIds: candidate.cards.map((card) => card.id), targetRank: candidate.targetRank }))[0] ?? null;
}

export function chooseHandFootBotPlay(state, playerIndex) {
  return chooseHandFootBotMove(state, playerIndex)?.cardIds ?? [];
}

export function chooseHandFootBotDiscard(state, playerIndex) {
  const cards = activeCardsFor(state, playerIndex);
  const team = state.teams[state.players[playerIndex].teamId];
  const rankCounts = cards.reduce((counts, card) => ({
    ...counts,
    [card.rank]: (counts[card.rank] || 0) + 1,
  }), {});
  return [...cards].sort((left, right) => (
    handFootDiscardCost(left, team, rankCounts) - handFootDiscardCost(right, team, rankCounts)
  ))[0];
}

function combineHandFootMeldOptions(options, cardCount) {
  const results = [];
  const visit = (index, selected, selectedIds) => {
    if (index === options.length) {
      if (selected.length) results.push(selected);
      return;
    }
    visit(index + 1, selected, selectedIds);
    const option = options[index];
    if (option.some((card) => selectedIds.has(card.id))) return;
    const nextIds = new Set(selectedIds);
    option.forEach((card) => nextIds.add(card.id));
    if (nextIds.size <= cardCount) visit(index + 1, [...selected, ...option], nextIds);
  };
  visit(0, [], new Set());
  return results;
}

function scoreHandFootBotMeld(cards, team, targetRank = null) {
  const additions = buildMeldAdditions(team, cards, targetRank);
  const completedBookBonus = Object.entries(additions).reduce((total, [rank, addedCards]) => {
    const existing = team.melds[rank] || [];
    const combined = [...existing, ...addedCards];
    return total + (existing.length < 7 && combined.length >= 7 ? handFootMeldBonus(rank, combined) : 0);
  }, 0);
  return cards.length * 100
    + cards.reduce((sum, card) => sum + handFootCardPoints(card), 0)
    + completedBookBonus
    - cards.filter(isWildCard).length * 15;
}

function describeHandFootBotWildAdditions(team, cards, targetRank = null) {
  const additions = buildMeldAdditions(team, cards, targetRank);
  return Object.entries(additions)
    .filter(([rank, addedCards]) => rank !== "wild" && addedCards.some(isWildCard))
    .map(([rank, addedCards]) => ({
      rank,
      existingLength: team.melds[rank]?.length || 0,
      combinedLength: (team.melds[rank]?.length || 0) + addedCards.length,
    }));
}

function isHandFootBotNearRoundEnd(state, playerIndex) {
  if ((state.drawPile?.length ?? Number.POSITIVE_INFINITY) <= state.playerCount * 2) return true;
  const team = state.teams[state.players[playerIndex].teamId];
  return team.memberIds.some((memberId) => {
    const member = state.players[memberId];
    return member.usingFoot && activeCardsFor(state, memberId).length <= 5;
  });
}

function handFootDiscardCost(card, team, rankCounts) {
  if (isThree(card)) return -10_000;
  if (isWildCard(card)) return 10_000;
  const meldLength = team.melds[String(card.rank)]?.length || 0;
  return (rankCounts[card.rank] || 0) * 400
    + (meldLength ? 700 + Math.min(meldLength, 6) * 50 : 0)
    + handFootCardPoints(card);
}

function requireTurn(state, playerIndex, stage) {
  if (state.phase !== "playing") throw new Error("The round is not currently being played.");
  if (state.currentPlayerIndex !== playerIndex) throw new Error("It is not that player's turn.");
  if (state.turnStage !== stage) throw new Error(stage === "draw" ? "Draw before playing." : "Draw two cards first.");
}
