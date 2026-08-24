import { shuffled } from "./shuffle.js";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 7;
export const LAST_ROUND = 11;
export const SUITS = ["stars", "hearts", "clubs", "spades", "diamonds"];
export const SUIT_SYMBOLS = { stars: "★", hearts: "♥", clubs: "♣", spades: "♠", diamonds: "♦" };
export const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const RANK_LABELS = { 11: "J", 12: "Q", 13: "K" };

let botCounter = 0;

export function createDeck(rng = Math.random) {
  const cards = [];
  for (let copy = 0; copy < 2; copy += 1) {
    for (const suit of SUITS) for (const rank of RANKS) {
      cards.push({ id: `${suit}-${rank}-${copy}`, suit, rank, type: "normal" });
    }
    for (let joker = 0; joker < 3; joker += 1) cards.push({ id: `joker-${copy}-${joker}`, type: "joker", rank: null, suit: null });
  }
  return shuffled(cards, rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    roomCode, hostId: player.id, phase: "lobby", round: 0, dealerIndex: 0, currentPlayerIndex: 0,
    players: [player], deck: [], discard: [], wildRank: null, turnDrawn: false, outPlayerId: null, finalTurnIds: [],
    roundScores: {}, totalScores: { [player.id]: 0 }, log: [`${player.name} opened a Five Crowns room.`], updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const next = makePlayer(player);
  return withLog({ ...game, players: [...game.players, next], totalScores: { ...game.totalScores, [next.id]: 0 } }, `${next.name} joined the table.`);
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  botCounter += 1;
  const name = `Computer ${botCounter}`;
  return addPlayer(game, { id: `five-crowns-computer-${Date.now()}-${botCounter}`, name, isComputer: true });
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  const players = game.players.filter((item) => item.id !== playerId);
  const totalScores = { ...game.totalScores };
  delete totalScores[playerId];
  return withLog({ ...game, players, totalScores }, `${player.name} left the table.`);
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) throw new Error("Five Crowns needs 2–7 players.");
  return dealRound({ ...game, round: 1, dealerIndex: Math.floor(rng() * game.players.length) }, rng);
}

export function startNextRound(game, playerId, rng = Math.random) {
  if (game.phase !== "roundEnd" || game.hostId !== playerId) return game;
  return dealRound({ ...game, round: game.round + 1, dealerIndex: (game.dealerIndex + 1) % game.players.length }, rng);
}

export function currentPlayer(game) { return game.players[game.currentPlayerIndex] ?? null; }
export function wildLabel(rank) { return rank === 11 ? "Jacks" : rank === 12 ? "Queens" : rank === 13 ? "Kings" : `${rank}s`; }
export function cardLabel(card) { return card.type === "joker" ? "Joker" : `${RANK_LABELS[card.rank] || card.rank}${SUIT_SYMBOLS[card.suit]}`; }
export function isWild(game, card) { return card.type === "joker" || card.rank === game.wildRank; }
export function cardPoints(game, card) { return card.type === "joker" ? 50 : card.rank === game.wildRank ? 20 : card.rank; }

export function drawCard(game, playerId, rng = Math.random) {
  if (!canDraw(game, playerId)) return game;
  let prepared = game;
  if (!prepared.deck.length && prepared.discard.length > 1) {
    const topDiscard = prepared.discard.at(-1);
    prepared = {
      ...prepared,
      deck: shuffled(prepared.discard.slice(0, -1), rng),
      discard: [topDiscard],
    };
  }
  if (!prepared.deck.length) return game;
  const card = prepared.deck[0];
  return updatePlayer({ ...prepared, deck: prepared.deck.slice(1), turnDrawn: true }, playerId, (player) => ({ ...player, hand: [...player.hand, card] }));
}

export function takeDiscard(game, playerId) {
  if (!canDraw(game, playerId) || !game.discard.length) return game;
  const card = game.discard[game.discard.length - 1];
  return updatePlayer({ ...game, discard: game.discard.slice(0, -1), turnDrawn: true }, playerId, (player) => ({ ...player, hand: [...player.hand, card] }));
}

export function layDownMeld(game, playerId, cardIds) {
  if (!game.outPlayerId || !canAct(game, playerId) || !game.turnDrawn || !Array.isArray(cardIds) || cardIds.length < 3) return game;
  const player = game.players.find((item) => item.id === playerId);
  const cards = player?.hand.filter((card) => cardIds.includes(card.id)) || [];
  if (cards.length !== cardIds.length || player.hand.length - cards.length < 1 || !isValidMeld(game, cards)) return game;
  return updatePlayer(game, playerId, (current) => ({
    ...current,
    hand: current.hand.filter((card) => !cardIds.includes(card.id)),
    melds: [...(current.melds || []), cards],
  }));
}

export function discardCard(game, playerId, cardId) {
  if (!canAct(game, playerId) || !game.turnDrawn) return game;
  const player = game.players.find((item) => item.id === playerId);
  const card = player?.hand.find((item) => item.id === cardId);
  if (!card) return game;
  const next = updatePlayer({ ...game, discard: [...game.discard, card] }, playerId, (current) => ({ ...current, hand: current.hand.filter((item) => item.id !== cardId) }));
  if (!game.outPlayerId && isFullyMeldable(next, playerId)) return goOut(next, playerId);
  return advanceAfterDiscard(next, playerId);
}

export function goOut(game, playerId) {
  if (game.outPlayerId || !canAct(game, playerId) || !game.turnDrawn || !isFullyMeldable(game, playerId)) return game;
  const player = game.players.find((item) => item.id === playerId);
  const groups = findMeldGroups(game, player.hand);
  const laidDown = updatePlayer(game, playerId, (current) => ({
    ...current,
    hand: [],
    melds: [...(current.melds || []), ...groups],
  }));
  const finalTurnIds = Array.from({ length: game.players.length - 1 }, (_, offset) =>
    game.players[(game.currentPlayerIndex + offset + 1) % game.players.length].id,
  );
  const next = withLog({ ...laidDown, outPlayerId: playerId, finalTurnIds }, `${player.name} went out! Everyone else gets one final turn.`);
  return advanceAfterDiscard(next, playerId);
}

export function canGoOut(game, playerId) { return canAct(game, playerId) && game.turnDrawn && !game.outPlayerId && isFullyMeldable(game, playerId); }
export function canGoOutWithDiscard(game, playerId, cardId) {
  if (!canAct(game, playerId) || game.outPlayerId || !game.turnDrawn || !cardId) return false;
  const hand = game.players.find((item) => item.id === playerId)?.hand || [];
  return hand.some((card) => card.id === cardId)
    && findMeldGroups(game, hand.filter((card) => card.id !== cardId)).length > 0;
}
export function isFullyMeldable(game, playerId) {
  const hand = game.players.find((item) => item.id === playerId)?.hand || [];
  return hand.length === 0 || findMeldGroups(game, hand).length > 0;
}
export function isValidMeld(game, cards) { return cards.length >= 3 && findValidMelds(game, cards).some((group) => group.length === cards.length); }
export function findValidMelds(game, hand) {
  const candidates = [];
  for (let size = 3; size <= hand.length; size += 1) {
    for (const combo of combinations(hand, size)) if (isBook(game, combo) || isRun(game, combo)) candidates.push(combo);
  }
  return candidates;
}

export function runComputerStep(game, rng = Math.random) {
  if (game.phase !== "playing") return game;
  const player = currentPlayer(game);
  if (!player?.isComputer) return game;
  if (game.outPlayerId && !game.finalTurnIds.includes(player.id)) return finishFinalTurn(game, player.id);
  const discard = game.discard.at(-1);
  const handWithDiscard = discard ? [...player.hand, discard] : [];
  const shouldTakeDiscard = Boolean(discard && !game.outPlayerId && handWithDiscard.some((card) =>
    findMeldGroups(game, handWithDiscard.filter((item) => item.id !== card.id)).length > 0,
  ));
  let next = shouldTakeDiscard ? takeDiscard(game, player.id) : drawCard(game, player.id, rng);
  let hand = next.players.find((item) => item.id === player.id)?.hand || [];

  if (!next.outPlayerId) {
    const outDiscard = [...hand]
      .sort((a, b) => cardPoints(next, b) - cardPoints(next, a))
      .find((card) => findMeldGroups(next, hand.filter((item) => item.id !== card.id)).length > 0);
    if (outDiscard) return discardCard(next, player.id, outDiscard.id);
  } else {
    const available = findValidMelds(next, hand).sort((a, b) =>
      b.length - a.length || meldPoints(next, b) - meldPoints(next, a),
    );
    for (const meld of available) {
      hand = next.players.find((item) => item.id === player.id)?.hand || [];
      if (hand.length - meld.length < 1 || !meld.every((card) => hand.some((item) => item.id === card.id))) continue;
      next = layDownMeld(next, player.id, meld.map((card) => card.id));
    }
  }

  const current = next.players.find((item) => item.id === player.id);
  const scored = [...current.hand].sort((a, b) => cardPoints(next, b) - cardPoints(next, a));
  return discardCard(next, player.id, scored[0]?.id);
}

export function findMeldGroups(game, hand) {
  if (!hand.length) return [];
  const candidates = findValidMelds(game, hand);
  return partition(hand, candidates) || [];
}

function isBook(game, cards) {
  const normal = cards.filter((card) => !isWild(game, card));
  return normal.every((card) => card.rank === normal[0]?.rank) && normal.length + cards.length - normal.length >= 3;
}

function isRun(game, cards) {
  const normal = cards.filter((card) => !isWild(game, card));
  if (!normal.length || !normal.every((card) => card.suit === normal[0].suit) || new Set(normal.map((card) => card.rank)).size !== normal.length) return false;
  for (let start = 3; start <= 13 - cards.length + 1; start += 1) {
    const expected = new Set(Array.from({ length: cards.length }, (_, index) => start + index));
    if (normal.every((card) => expected.has(card.rank))) return true;
  }
  return false;
}

function partition(hand, candidates, used = new Set()) {
  if (used.size === hand.length) return [];
  const first = hand.find((card) => !used.has(card.id));
  for (const candidate of candidates.filter((group) => group.some((card) => card.id === first.id))) {
    if (candidate.some((card) => used.has(card.id))) continue;
    const rest = partition(hand, candidates, new Set([...used, ...candidate.map((card) => card.id)]));
    if (rest) return [candidate, ...rest];
  }
  return null;
}

function combinations(items, size, start = 0, chosen = []) {
  if (chosen.length === size) return [chosen];
  const result = [];
  for (let index = start; index <= items.length - (size - chosen.length); index += 1) result.push(...combinations(items, size, index + 1, [...chosen, items[index]]));
  return result;
}

function dealRound(game, rng) {
  const handSize = game.round + 2;
  const deck = createDeck(rng);
  const players = game.players.map((player) => ({ ...player, hand: [], melds: [], roundScore: null }));
  let cursor = 0;
  for (let count = 0; count < handSize; count += 1) for (const player of players) player.hand.push(deck[cursor++]);
  const first = (game.dealerIndex + 1) % players.length;
  return { ...game, phase: "playing", players, deck: deck.slice(cursor), discard: [deck[cursor]], wildRank: handSize, turnDrawn: false, currentPlayerIndex: first, outPlayerId: null, finalTurnIds: [], roundScores: {}, log: [`Round ${game.round}: ${handSize} cards dealt. ${wildLabel(handSize)} are wild.`, ...game.log].slice(0, 60) };
}

function canAct(game, playerId) {
  return game.phase === "playing" && currentPlayer(game)?.id === playerId
    && (!game.outPlayerId || game.finalTurnIds.includes(playerId));
}

function canDraw(game, playerId) {
  const player = game.players.find((item) => item.id === playerId);
  return canAct(game, playerId) && !game.turnDrawn && player.hand.length < game.wildRank + 1;
}

function meldPoints(game, cards) {
  return cards.reduce((sum, card) => sum + cardPoints(game, card), 0);
}

function advanceAfterDiscard(game, playerId) {
  if (game.outPlayerId) return finishFinalTurn(game, playerId);
  const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
  return { ...game, currentPlayerIndex: nextIndex, turnDrawn: false };
}

function finishFinalTurn(game, playerId) {
  const remaining = game.finalTurnIds.filter((id) => id !== playerId);
  const player = game.players.find((item) => item.id === playerId);
  const score = player.hand.reduce((sum, card) => sum + cardPoints(game, card), 0);
  const roundScores = { ...game.roundScores, [playerId]: score, [game.outPlayerId]: 0 };
  const totalScores = { ...game.totalScores, [playerId]: (game.totalScores[playerId] || 0) + score };
  if (!remaining.length) {
    const phase = game.round === LAST_ROUND ? "finished" : "roundEnd";
    return withLog({ ...game, phase, roundScores, totalScores, finalTurnIds: [], turnDrawn: false, currentPlayerIndex: 0 }, `Round ${game.round} scored.`);
  }
  const nextIndex = game.players.findIndex((item) => item.id === remaining[0]);
  return { ...game, finalTurnIds: remaining, roundScores, totalScores, turnDrawn: false, currentPlayerIndex: nextIndex };
}

function updatePlayer(game, playerId, updater) { return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) }; }
function makePlayer(seed) { return { id: seed.id, name: String(seed.name || "Player").trim().slice(0, 18) || "Player", isComputer: Boolean(seed.isComputer), hand: [], melds: [], roundScore: null }; }
function withLog(game, line) { return { ...game, log: [line, ...game.log].slice(0, 60) }; }
