import { shuffled } from "./shuffle.js";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const COLORS = ["red", "blue", "green", "yellow"];

export const PHASES = [
  { number: 1, label: "2 sets of 3", groups: [{ kind: "set", size: 3 }, { kind: "set", size: 3 }] },
  { number: 2, label: "1 set of 3 + 1 run of 4", groups: [{ kind: "set", size: 3 }, { kind: "run", size: 4 }] },
  { number: 3, label: "1 set of 4 + 1 run of 4", groups: [{ kind: "set", size: 4 }, { kind: "run", size: 4 }] },
  { number: 4, label: "1 run of 7", groups: [{ kind: "run", size: 7 }] },
  { number: 5, label: "1 run of 8", groups: [{ kind: "run", size: 8 }] },
  { number: 6, label: "1 run of 9", groups: [{ kind: "run", size: 9 }] },
  { number: 7, label: "2 sets of 4", groups: [{ kind: "set", size: 4 }, { kind: "set", size: 4 }] },
  { number: 8, label: "7 cards of 1 color", groups: [{ kind: "color", size: 7 }] },
  { number: 9, label: "1 set of 5 + 1 set of 2", groups: [{ kind: "set", size: 5 }, { kind: "set", size: 2 }] },
  { number: 10, label: "1 set of 5 + 1 set of 3", groups: [{ kind: "set", size: 5 }, { kind: "set", size: 3 }] },
];

let botCounter = 0;

export function createDeck(rng = Math.random) {
  const cards = [];
  for (const color of COLORS) {
    for (let number = 1; number <= 12; number += 1) {
      for (let copy = 1; copy <= 2; copy += 1) cards.push({ id: `${color}-${number}-${copy}`, type: "number", color, number });
    }
  }
  for (let copy = 1; copy <= 8; copy += 1) cards.push({ id: `wild-${copy}`, type: "wild", color: null, number: null });
  for (let copy = 1; copy <= 4; copy += 1) cards.push({ id: `skip-${copy}`, type: "skip", color: null, number: null });
  return shuffled(cards, rng);
}

export function cardPoints(card) {
  if (card.type === "wild") return 25;
  if (card.type === "skip") return 15;
  return card.number <= 9 ? 5 : 10;
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    game: "phase-10", roomCode, hostId: player.id, phase: "lobby", round: 0,
    dealerIndex: 0, currentPlayerIndex: 0, players: [player], deck: [], discard: [],
    turnDrawn: false, skipPendingIds: [], skipProtectedIds: [], tieBreakerIds: [],
    roundScores: {}, roundWinnerId: null, winners: [], log: [`${player.name} opened a Phase 10 room.`], updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const next = makePlayer(player);
  return withLog({ ...game, players: [...game.players, next] }, `${next.name} joined the race.`);
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  botCounter += 1;
  return addPlayer(game, {
    id: `phase-10-computer-${Date.now()}-${botCounter}`,
    name: `Computer ${botCounter}`,
    isComputer: true,
  });
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  return withLog({ ...game, players: game.players.filter((item) => item.id !== playerId) }, `${player.name} left the table.`);
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) throw new Error("Phase 10 needs 2-6 players.");
  return dealRound({ ...game, round: 1, dealerIndex: Math.floor(rng() * game.players.length) }, rng);
}

export function startNextRound(game, playerId, rng = Math.random) {
  if (game.phase !== "roundEnd" || game.hostId !== playerId) return game;
  const activeIds = game.tieBreakerIds.length ? game.tieBreakerIds : game.players.map((player) => player.id);
  const dealerIndex = nextIndexAmong(game.players, game.dealerIndex, activeIds);
  return dealRound({ ...game, round: game.round + 1, dealerIndex }, rng);
}

export function currentPlayer(game) { return game.players[game.currentPlayerIndex] ?? null; }

export function drawCard(game, playerId, rng = Math.random) {
  if (!canDraw(game, playerId)) return game;
  let next = game;
  if (!next.deck.length && next.discard.length > 1) {
    const top = next.discard.at(-1);
    next = { ...next, deck: shuffled(next.discard.slice(0, -1), rng), discard: [top] };
  }
  if (!next.deck.length) return game;
  const card = next.deck[0];
  return updatePlayer({ ...next, deck: next.deck.slice(1), turnDrawn: true }, playerId, (player) => ({ ...player, hand: [...player.hand, card] }));
}

export function takeDiscard(game, playerId) {
  if (!canDraw(game, playerId) || !game.discard.length || game.discard.at(-1).type === "skip") return game;
  const card = game.discard.at(-1);
  return updatePlayer({ ...game, discard: game.discard.slice(0, -1), turnDrawn: true }, playerId, (player) => ({ ...player, hand: [...player.hand, card] }));
}

export function findPhaseLayout(phaseNumber, cards) {
  const phase = PHASES[phaseNumber - 1];
  if (!phase || !Array.isArray(cards) || cards.some((card) => card.type === "skip") || !cards.some((card) => card.type === "number")) return null;
  const required = phase.groups.reduce((sum, group) => sum + group.size, 0);
  if (cards.length !== required || new Set(cards.map((card) => card.id)).size !== cards.length) return null;
  return assignGroups(cards, phase.groups);
}

export function findPhaseCards(phaseNumber, hand) {
  const phase = PHASES[phaseNumber - 1];
  if (!phase) return null;
  const count = phase.groups.reduce((sum, group) => sum + group.size, 0);
  for (const cards of combinations(hand.filter((card) => card.type !== "skip"), count)) {
    const groups = findPhaseLayout(phaseNumber, cards);
    if (groups) return { cardIds: cards.map((card) => card.id), groups };
  }
  return null;
}

export function layPhase(game, playerId, cardIds) {
  if (!canAct(game, playerId) || !game.turnDrawn || !Array.isArray(cardIds)) return game;
  const player = currentPlayer(game);
  if (player.phaseLaid) return game;
  const selected = cardIds.map((id) => player.hand.find((card) => card.id === id)).filter(Boolean);
  if (selected.length !== cardIds.length) return game;
  const groups = findPhaseLayout(player.phaseNumber, selected);
  if (!groups) return game;
  const ids = new Set(cardIds);
  return withLog(updatePlayer(game, playerId, (item) => ({
    ...item,
    hand: item.hand.filter((card) => !ids.has(card.id)),
    phaseLaid: true,
    laidGroups: groups,
  })), `${player.name} completed Phase ${player.phaseNumber}.`);
}

export function hitCard(game, playerId, cardId, targetPlayerId, groupIndex, side = null) {
  if (!canAct(game, playerId) || !game.turnDrawn) return game;
  const player = currentPlayer(game);
  if (!player.phaseLaid) return game;
  const card = player.hand.find((item) => item.id === cardId);
  const target = game.players.find((item) => item.id === targetPlayerId);
  const group = target?.laidGroups?.[groupIndex];
  if (!card || card.type === "skip" || !group) return game;
  const extended = extendGroup(group, card, side);
  if (!extended) return game;
  let next = updatePlayer(game, targetPlayerId, (item) => ({
    ...item,
    laidGroups: item.laidGroups.map((entry, index) => index === groupIndex ? extended : entry),
  }));
  next = updatePlayer(next, playerId, (item) => ({ ...item, hand: item.hand.filter((entry) => entry.id !== cardId) }));
  next = withLog(next, `${player.name} hit ${target.name}'s phase.`);
  return next.players.find((item) => item.id === playerId).hand.length ? next : finishRound(next, playerId);
}

export function canHitGroup(group, card, side = null) { return Boolean(extendGroup(group, card, side)); }

export function discardCard(game, playerId, cardId, skipPlayerId = null) {
  if (!canAct(game, playerId) || !game.turnDrawn) return game;
  const player = currentPlayer(game);
  const card = player.hand.find((item) => item.id === cardId);
  if (!card) return game;
  let skipPendingIds = game.skipPendingIds;
  if (card.type === "skip") {
    const eligible = eligibleSkipTargets(game, playerId);
    if (!eligible.some((target) => target.id === skipPlayerId)) return game;
    skipPendingIds = [...skipPendingIds, skipPlayerId];
  }
  let next = updatePlayer({ ...game, discard: [...game.discard, card], skipPendingIds }, playerId, (item) => ({
    ...item,
    hand: item.hand.filter((entry) => entry.id !== cardId),
  }));
  next = withLog(next, card.type === "skip"
    ? `${player.name} skipped ${game.players.find((item) => item.id === skipPlayerId).name}.`
    : `${player.name} discarded a card.`);
  if (!next.players.find((item) => item.id === playerId).hand.length) return finishRound(next, playerId);
  return advanceTurn(next);
}

export function eligibleSkipTargets(game, playerId) {
  const active = new Set(activePlayerIds(game));
  return game.players.filter((player) => player.id !== playerId
    && active.has(player.id)
    && !game.skipPendingIds.includes(player.id)
    && !game.skipProtectedIds.includes(player.id));
}

export function runComputerTurn(game, rng = Math.random) {
  if (game.phase !== "playing" || !currentPlayer(game)?.isComputer) return game;
  const playerId = currentPlayer(game).id;
  let next = game;
  if (!next.turnDrawn) {
    const player = currentPlayer(next);
    const top = next.discard.at(-1);
    const take = top?.type !== "skip" && (
      (!player.phaseLaid && Boolean(findPhaseCards(player.phaseNumber, [...player.hand, top])))
      || (player.phaseLaid && Boolean(findHit(next, [...player.hand, top], playerId, top.id)))
    );
    next = take ? takeDiscard(next, playerId) : drawCard(next, playerId, rng);
  }
  if (next === game || next.phase !== "playing") return next;
  let player = currentPlayer(next);
  if (!player.phaseLaid) {
    const phase = findPhaseCards(player.phaseNumber, player.hand);
    if (phase) next = layPhase(next, playerId, phase.cardIds);
  }
  let hit = findHit(next, currentPlayer(next).hand, playerId);
  while (hit && next.phase === "playing") {
    const before = currentPlayer(next).hand.length;
    next = hitCard(next, playerId, hit.cardId, hit.targetPlayerId, hit.groupIndex, hit.side);
    if (next.phase !== "playing") return next;
    if (currentPlayer(next).hand.length >= before) break;
    hit = findHit(next, currentPlayer(next).hand, playerId);
  }
  player = currentPlayer(next);
  const skip = player.hand.find((card) => card.type === "skip");
  const targets = eligibleSkipTargets(next, playerId).sort((a, b) => b.phaseNumber - a.phaseNumber || a.score - b.score);
  if (skip && targets.length) return discardCard(next, playerId, skip.id, targets[0].id);
  const discard = [...player.hand].sort((a, b) => cardPoints(b) - cardPoints(a))[0];
  return discard ? discardCard(next, playerId, discard.id) : next;
}

function makePlayer(player) {
  return {
    id: player.id,
    name: String(player.name || "Player").trim().slice(0, 20) || "Player",
    isComputer: Boolean(player.isComputer),
    hand: [], phaseNumber: 1, phaseLaid: false, laidGroups: [], score: 0, roundScore: null,
  };
}

function dealRound(game, rng) {
  const deck = createDeck(rng);
  const activeIds = game.tieBreakerIds.length ? game.tieBreakerIds : game.players.map((player) => player.id);
  const activeSet = new Set(activeIds);
  const players = game.players.map((player) => ({ ...player, hand: [], phaseLaid: false, laidGroups: [], roundScore: null }));
  let cursor = 0;
  for (let card = 0; card < 10; card += 1) {
    for (const player of players) if (activeSet.has(player.id)) player.hand.push(deck[cursor++]);
  }
  const firstIndex = nextIndexAmong(players, game.dealerIndex, activeIds);
  const opening = deck[cursor];
  let currentPlayerIndex = firstIndex;
  let skipProtectedIds = [];
  if (opening.type === "skip") {
    skipProtectedIds = [players[firstIndex].id];
    currentPlayerIndex = nextIndexAmong(players, firstIndex, activeIds);
  }
  return {
    ...game,
    phase: "playing", players, deck: deck.slice(cursor + 1), discard: [opening], currentPlayerIndex,
    turnDrawn: false, skipPendingIds: [], skipProtectedIds, roundScores: {}, roundWinnerId: null, winners: [],
    log: [`Round ${game.round}: ${activeIds.length} player${activeIds.length === 1 ? "" : "s"} race for their next phase.`, ...game.log].slice(0, 80),
  };
}

function assignGroups(cards, requirements, index = 0) {
  if (index === requirements.length) return cards.length ? null : [];
  const requirement = requirements[index];
  for (const chosen of combinations(cards, requirement.size)) {
    const group = makeGroup(requirement.kind, chosen);
    if (!group) continue;
    const ids = new Set(chosen.map((card) => card.id));
    const remaining = cards.filter((card) => !ids.has(card.id));
    const rest = assignGroups(remaining, requirements, index + 1);
    if (rest) return [group, ...rest];
  }
  return null;
}

function makeGroup(kind, cards) {
  const numbers = cards.filter((card) => card.type === "number");
  if (kind === "set") {
    if (!numbers.every((card) => card.number === numbers[0]?.number)) return null;
    return { kind, rank: numbers[0]?.number || 1, cards: [...cards] };
  }
  if (kind === "color") {
    if (!numbers.every((card) => card.color === numbers[0]?.color)) return null;
    return { kind, color: numbers[0]?.color || COLORS[0], cards: [...cards] };
  }
  if (kind === "run") {
    if (new Set(numbers.map((card) => card.number)).size !== numbers.length) return null;
    for (let start = 1; start <= 13 - cards.length; start += 1) {
      const end = start + cards.length - 1;
      if (numbers.every((card) => card.number >= start && card.number <= end)) return { kind, start, end, cards: [...cards] };
    }
  }
  return null;
}

function extendGroup(group, card, side) {
  if (group.kind === "set") return card.type === "wild" || card.number === group.rank ? { ...group, cards: [...group.cards, card] } : null;
  if (group.kind === "color") return card.type === "wild" || card.color === group.color ? { ...group, cards: [...group.cards, card] } : null;
  if (group.kind !== "run") return null;
  if (card.type === "number") {
    if (card.number === group.start - 1) return { ...group, start: card.number, cards: [card, ...group.cards] };
    if (card.number === group.end + 1) return { ...group, end: card.number, cards: [...group.cards, card] };
    return null;
  }
  const chosen = side || (group.start > 1 ? "start" : "end");
  if (chosen === "start" && group.start > 1) return { ...group, start: group.start - 1, cards: [card, ...group.cards] };
  if (chosen === "end" && group.end < 12) return { ...group, end: group.end + 1, cards: [...group.cards, card] };
  return null;
}

function findHit(game, hand, playerId, onlyCardId = null) {
  const own = game.players.find((player) => player.id === playerId);
  if (!own?.phaseLaid) return null;
  for (const card of hand) {
    if (onlyCardId && card.id !== onlyCardId) continue;
    for (const target of game.players) {
      for (let groupIndex = 0; groupIndex < target.laidGroups.length; groupIndex += 1) {
        for (const side of [null, "start", "end"]) {
          if (extendGroup(target.laidGroups[groupIndex], card, side)) return { cardId: card.id, targetPlayerId: target.id, groupIndex, side };
        }
      }
    }
  }
  return null;
}

function finishRound(game, winnerId) {
  const roundScores = Object.fromEntries(game.players.map((player) => [
    player.id,
    player.id === winnerId ? 0 : player.hand.reduce((sum, card) => sum + cardPoints(card), 0),
  ]));
  const players = game.players.map((player) => ({
    ...player,
    score: player.score + roundScores[player.id],
    roundScore: roundScores[player.id],
    phaseNumber: player.phaseLaid ? Math.min(10, player.phaseNumber + 1) : player.phaseNumber,
  }));
  if (game.tieBreakerIds.length) {
    return withLog({ ...game, phase: "finished", players, roundScores, roundWinnerId: winnerId, winners: [winnerId] }, `${players.find((player) => player.id === winnerId).name} won the Phase 10 tiebreaker.`);
  }
  const completedTen = game.players.filter((player) => player.phaseNumber === 10 && player.phaseLaid).map((player) => player.id);
  if (completedTen.length) {
    const lowest = Math.min(...players.filter((player) => completedTen.includes(player.id)).map((player) => player.score));
    const leaders = players.filter((player) => completedTen.includes(player.id) && player.score === lowest).map((player) => player.id);
    if (leaders.length === 1) return withLog({ ...game, phase: "finished", players, roundScores, roundWinnerId: winnerId, winners: leaders }, `${players.find((player) => player.id === leaders[0]).name} completed Phase 10 with the lowest score.`);
    return withLog({ ...game, phase: "roundEnd", players, roundScores, roundWinnerId: winnerId, tieBreakerIds: leaders }, `${leaders.length} players tied and will replay Phase 10.`);
  }
  return withLog({ ...game, phase: "roundEnd", players, roundScores, roundWinnerId: winnerId }, `${players.find((player) => player.id === winnerId).name} went out. The round is scored.`);
}

function advanceTurn(game) {
  const activeIds = activePlayerIds(game);
  const currentId = currentPlayer(game).id;
  let skipProtectedIds = game.skipProtectedIds.filter((id) => id !== currentId);
  let skipPendingIds = [...game.skipPendingIds];
  let currentPlayerIndex = nextIndexAmong(game.players, game.currentPlayerIndex, activeIds);
  while (skipPendingIds.includes(game.players[currentPlayerIndex].id)) {
    const skippedId = game.players[currentPlayerIndex].id;
    skipPendingIds = skipPendingIds.filter((id) => id !== skippedId);
    skipProtectedIds = [...new Set([...skipProtectedIds, skippedId])];
    currentPlayerIndex = nextIndexAmong(game.players, currentPlayerIndex, activeIds);
  }
  return { ...game, currentPlayerIndex, turnDrawn: false, skipPendingIds, skipProtectedIds };
}

function activePlayerIds(game) { return game.tieBreakerIds.length ? game.tieBreakerIds : game.players.map((player) => player.id); }
function canAct(game, playerId) { return game.phase === "playing" && currentPlayer(game)?.id === playerId; }
function canDraw(game, playerId) { return canAct(game, playerId) && !game.turnDrawn; }
function nextIndexAmong(players, fromIndex, ids) {
  const allowed = new Set(ids);
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (fromIndex + offset) % players.length;
    if (allowed.has(players[index].id)) return index;
  }
  return fromIndex;
}
function updatePlayer(game, playerId, updater) { return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) }; }
function withLog(game, message) { return { ...game, log: [message, ...game.log].slice(0, 80) }; }
function combinations(items, size, start = 0, chosen = []) {
  if (chosen.length === size) return [chosen];
  const result = [];
  for (let index = start; index <= items.length - (size - chosen.length); index += 1) result.push(...combinations(items, size, index + 1, [...chosen, items[index]]));
  return result;
}
