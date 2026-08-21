import { shuffled } from "./shuffle.js";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const TARGET_SCORE = 200;
export const DOS_COLORS = ["blue", "green", "red", "yellow"];

const BOT_NAMES = ["Deuce", "Sum", "Pip", "Moxie", "Dot"];
let computerCounter = 0;

export function createDeck(rng = Math.random) {
  const cards = [];
  for (const color of DOS_COLORS) {
    for (const value of [1, 3, 4, 5]) {
      for (let copy = 0; copy < 3; copy += 1) cards.push(numberCard(`${color}-${value}-${copy}`, color, value));
    }
    for (const value of [6, 7, 8, 9, 10]) {
      for (let copy = 0; copy < 2; copy += 1) cards.push(numberCard(`${color}-${value}-${copy}`, color, value));
    }
    for (let copy = 0; copy < 2; copy += 1) cards.push({ id: `${color}-wild-number-${copy}`, type: "wildNumber", color, value: null });
  }
  for (let copy = 0; copy < 12; copy += 1) cards.push({ id: `wild-dos-${copy}`, type: "wildDos", color: null, value: 2 });
  return shuffled(cards, rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    game: "dos",
    roomCode,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    deck: [],
    discard: [],
    centerRow: [],
    dealerIndex: 0,
    currentPlayerIndex: 0,
    turn: null,
    round: 0,
    winnerId: null,
    roundWinnerId: null,
    targetScore: TARGET_SCORE,
    missedDosPlayerId: null,
    log: [`${player.name} opened a DOS room.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player);
  return withLog({ ...game, players: [...game.players, nextPlayer] }, `${nextPlayer.name} joined the table.`);
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  computerCounter += 1;
  const used = new Set(game.players.map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !used.has(candidate)) || `Computer ${computerCounter}`;
  const player = makePlayer({ id: `dos-computer-${Date.now()}-${computerCounter}`, name, isComputer: true });
  return withLog({ ...game, players: [...game.players, player] }, `${name} took a computer seat.`);
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  return withLog({ ...game, players: game.players.filter((item) => item.id !== playerId) }, `${player.name} left the table.`);
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) throw new Error("DOS needs 2–4 players.");
  return dealRound({ ...game, round: 1, dealerIndex: Math.floor(rng() * game.players.length) }, rng);
}

export function startNextRound(game, playerId, rng = Math.random) {
  if (game.phase !== "roundEnd" || game.hostId !== playerId) return game;
  const dealerIndex = game.players.findIndex((player) => player.id === game.roundWinnerId);
  return dealRound({ ...game, round: game.round + 1, dealerIndex: dealerIndex < 0 ? game.dealerIndex : dealerIndex }, rng);
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function matchOptions(game, playerId) {
  if (!canAct(game, playerId) || game.turn?.placementRemaining) return [];
  const player = playerById(game, playerId);
  const options = [];
  for (const center of game.centerRow) {
    for (const held of player.cards) {
      const result = evaluateMatch(center, [held]);
      if (result) options.push(makeOption(center, [held], result));
    }
    for (let left = 0; left < player.cards.length; left += 1) {
      for (let right = left + 1; right < player.cards.length; right += 1) {
        const held = [player.cards[left], player.cards[right]];
        const result = evaluateMatch(center, held);
        if (result) options.push(makeOption(center, held, result));
      }
    }
  }
  return options;
}

export function playMatch(game, playerId, optionId, rng = Math.random) {
  if (!canAct(game, playerId) || game.turn?.placementRemaining) return game;
  const option = matchOptions(game, playerId).find((candidate) => candidate.id === optionId);
  if (!option) return game;
  const player = playerById(game, playerId);
  const ids = new Set(option.handCardIds);
  const played = player.cards.filter((held) => ids.has(held.id));
  let next = clearMissedWindow(game);
  next = updatePlayer(next, playerId, (current) => ({ ...current, cards: current.cards.filter((held) => !ids.has(held.id)) }));
  next = {
    ...next,
    centerRow: next.centerRow.filter((center) => center.id !== option.centerCardId),
    discard: [...next.discard, next.centerRow.find((center) => center.id === option.centerCardId), ...played],
    turn: {
      ...next.turn,
      matchedCount: next.turn.matchedCount + 1,
      bonusCount: next.turn.bonusCount + (option.colorBonus ? 1 : 0),
    },
  };
  if (option.colorBonus === "double") {
    for (const opponent of next.players.filter((candidate) => candidate.id !== playerId)) next = drawMany(next, opponent.id, 1, rng);
  }
  next = refreshDosStatus(next, playerId);
  next = withLog(next, `${player.name} made a ${option.handCardIds.length === 2 ? "double" : "single"} match${option.colorBonus ? ` with a ${option.colorBonus} color bonus` : ""}.`);
  if (!playerById(next, playerId).cards.length) return finishRound(next, playerId);
  return next;
}

export function drawCard(game, playerId, rng = Math.random) {
  if (!canAct(game, playerId) || game.turn.drawn || game.turn.matchedCount || game.turn.placementRemaining) return game;
  let next = clearMissedWindow(ensureDeck(game, rng));
  if (!next.deck.length) return next;
  const [drawn, ...deck] = next.deck;
  next = updatePlayer({ ...next, deck, turn: { ...next.turn, drawn: true } }, playerId, (player) => ({ ...player, cards: [...player.cards, drawn] }));
  next = refreshDosStatus(next, playerId);
  return withLog(next, `${playerById(next, playerId).name} drew a card.`);
}

export function endTurn(game, playerId, rng = Math.random) {
  if (!canAct(game, playerId) || game.turn.placementRemaining) return game;
  if (!game.turn.matchedCount && !game.turn.drawn) return game;
  let next = clearMissedWindow(game);
  next = refillCenter(next, rng);
  const placementRemaining = game.turn.matchedCount ? game.turn.bonusCount : 1;
  if (placementRemaining > 0) return { ...next, turn: { ...next.turn, placementRemaining } };
  return advanceTurn(next);
}

export function placeCenterCard(game, playerId, cardId) {
  if (!canAct(game, playerId) || !game.turn.placementRemaining) return game;
  const player = playerById(game, playerId);
  const placed = player.cards.find((held) => held.id === cardId);
  if (!placed) return game;
  let next = updatePlayer(clearMissedWindow(game), playerId, (current) => ({ ...current, cards: current.cards.filter((held) => held.id !== cardId) }));
  next = {
    ...next,
    centerRow: [...next.centerRow, placed],
    turn: { ...next.turn, placementRemaining: next.turn.placementRemaining - 1 },
  };
  next = refreshDosStatus(next, playerId);
  next = withLog(next, `${player.name} added a card to the center row.`);
  if (!playerById(next, playerId).cards.length) return finishRound(next, playerId);
  return next.turn.placementRemaining ? next : advanceTurn(next);
}

export function callDos(game, playerId) {
  const player = playerById(game, playerId);
  if (game.phase !== "playing" || !player || player.cards.length !== 2) return game;
  return withLog({ ...game, missedDosPlayerId: game.missedDosPlayerId === playerId ? null : game.missedDosPlayerId, players: game.players.map((item) => item.id === playerId ? { ...item, dosSafe: true } : item) }, `${player.name} called DOS!`);
}

export function catchDos(game, callerId, rng = Math.random) {
  const targetId = game.missedDosPlayerId;
  if (!targetId || callerId === targetId || !playerById(game, callerId)) return game;
  const target = playerById(game, targetId);
  if (!target || target.cards.length !== 2 || target.dosSafe) return { ...game, missedDosPlayerId: null };
  let next = drawMany(game, targetId, 2, rng);
  next = updatePlayer(next, targetId, (player) => ({ ...player, dosSafe: false }));
  return withLog({ ...next, missedDosPlayerId: null }, `${playerById(game, callerId).name} caught ${target.name}—draw 2!`);
}

export function cardPoints(held) {
  if (held.type === "wildDos") return 20;
  if (held.type === "wildNumber") return 40;
  return held.value;
}

export function runComputerStep(game, rng = Math.random) {
  if (game.phase !== "playing") return game;
  if (game.missedDosPlayerId) {
    const missed = playerById(game, game.missedDosPlayerId);
    if (missed?.isComputer && missed.cards.length === 2) return callDos(game, missed.id);
    const catcher = game.players.find((player) => player.isComputer && player.id !== game.missedDosPlayerId);
    if (catcher) return catchDos(game, catcher.id, rng);
  }
  const player = currentPlayer(game);
  if (!player?.isComputer) return game;
  if (player.cards.length === 2 && !player.dosSafe) return callDos(game, player.id);
  if (game.turn.placementRemaining) {
    const placed = [...player.cards].sort((a, b) => cardPoints(a) - cardPoints(b))[0];
    return placeCenterCard(game, player.id, placed.id);
  }
  const options = matchOptions(game, player.id);
  if (options.length) {
    const best = [...options].sort((a, b) => (b.handCardIds.length + (b.colorBonus ? 2 : 0)) - (a.handCardIds.length + (a.colorBonus ? 2 : 0)))[0];
    return playMatch(game, player.id, best.id, rng);
  }
  if (game.turn.matchedCount || game.turn.drawn) return endTurn(game, player.id, rng);
  return drawCard(game, player.id, rng);
}

function evaluateMatch(center, heldCards) {
  const centerValues = possibleValues(center);
  for (const centerValue of centerValues) {
    const assignments = assignValues(heldCards, centerValue);
    if (!assignments) continue;
    const centerColors = center.type === "wildDos" ? DOS_COLORS : [center.color];
    let colorBonus = null;
    for (const centerColor of centerColors) {
      const colorsMatch = heldCards.every((held) => held.type === "wildDos" || held.color === centerColor);
      if (colorsMatch) {
        colorBonus = heldCards.length === 2 ? "double" : "single";
        break;
      }
    }
    return { centerValue, assignments, colorBonus };
  }
  return null;
}

function assignValues(cards, target) {
  if (cards.length === 1) {
    const values = possibleValues(cards[0]);
    return values.includes(target) ? [target] : null;
  }
  for (const left of possibleValues(cards[0])) {
    for (const right of possibleValues(cards[1])) if (left + right === target) return [left, right];
  }
  return null;
}

function possibleValues(held) {
  if (held.type === "wildNumber") return Array.from({ length: 10 }, (_, index) => index + 1);
  return [held.value];
}

function makeOption(center, cards, result) {
  return {
    id: `${center.id}:${cards.map((held) => held.id).join("+")}:${result.assignments.join("+")}`,
    centerCardId: center.id,
    handCardIds: cards.map((held) => held.id),
    values: result.assignments,
    centerValue: result.centerValue,
    colorBonus: result.colorBonus,
  };
}

function dealRound(game, rng) {
  let deck = createDeck(rng);
  let players = game.players.map((player) => ({ ...player, cards: [], dosSafe: false }));
  for (let deal = 0; deal < 7; deal += 1) players = players.map((player) => ({ ...player, cards: [...player.cards, deck.shift()] }));
  const centerRow = [deck.shift(), deck.shift()];
  const currentPlayerIndex = (game.dealerIndex + 1) % players.length;
  return {
    ...game,
    phase: "playing",
    players,
    deck,
    discard: [],
    centerRow,
    currentPlayerIndex,
    turn: freshTurn(players[currentPlayerIndex].id),
    winnerId: null,
    roundWinnerId: null,
    missedDosPlayerId: null,
    log: [`Round ${game.round} begins. ${players[game.dealerIndex].name} deals.`, ...game.log].slice(0, 80),
  };
}

function refillCenter(game, rng) {
  let next = game;
  while (next.centerRow.length < 2) {
    next = ensureDeck(next, rng);
    if (!next.deck.length) break;
    next = { ...next, centerRow: [...next.centerRow, next.deck[0]], deck: next.deck.slice(1) };
  }
  return next;
}

function advanceTurn(game) {
  const currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  return { ...game, currentPlayerIndex, turn: freshTurn(game.players[currentPlayerIndex].id) };
}

function freshTurn(playerId) {
  return { playerId, matchedCount: 0, bonusCount: 0, drawn: false, placementRemaining: 0 };
}

function finishRound(game, winnerId) {
  const points = game.players.filter((player) => player.id !== winnerId).flatMap((player) => player.cards).reduce((sum, held) => sum + cardPoints(held), 0);
  const players = game.players.map((player) => player.id === winnerId ? { ...player, score: player.score + points } : player);
  const winner = players.find((player) => player.id === winnerId);
  return withLog({ ...game, phase: winner.score >= game.targetScore ? "finished" : "roundEnd", players, roundWinnerId: winnerId, winnerId: winner.score >= game.targetScore ? winnerId : null, missedDosPlayerId: null }, `${winner.name} went out and scored ${points} points.`);
}

function refreshDosStatus(game, playerId) {
  const player = playerById(game, playerId);
  const hasTwo = player.cards.length === 2;
  return {
    ...game,
    missedDosPlayerId: hasTwo ? playerId : game.missedDosPlayerId === playerId ? null : game.missedDosPlayerId,
    players: game.players.map((item) => item.id === playerId ? { ...item, dosSafe: hasTwo ? false : item.dosSafe } : item),
  };
}

function clearMissedWindow(game) {
  return game.missedDosPlayerId && game.missedDosPlayerId !== currentPlayer(game)?.id ? { ...game, missedDosPlayerId: null } : game;
}

function drawMany(game, playerId, count, rng = Math.random) {
  let next = game;
  for (let index = 0; index < count; index += 1) {
    next = ensureDeck(next, rng);
    if (!next.deck.length) break;
    const [drawn, ...deck] = next.deck;
    next = updatePlayer({ ...next, deck }, playerId, (player) => ({ ...player, cards: [...player.cards, drawn] }));
  }
  return next;
}

function ensureDeck(game, rng) {
  if (game.deck.length || !game.discard.length) return game;
  return { ...game, deck: shuffled(game.discard, rng), discard: [] };
}

function canAct(game, playerId) {
  return game.phase === "playing" && currentPlayer(game)?.id === playerId && game.turn?.playerId === playerId;
}

function updatePlayer(game, playerId, updater) {
  return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) };
}

function playerById(game, playerId) {
  return game.players.find((player) => player.id === playerId) ?? null;
}

function makePlayer(player) {
  return { id: player.id, name: cleanName(player.name), isComputer: Boolean(player.isComputer), cards: [], score: 0, dosSafe: false };
}

function numberCard(id, color, value) {
  return { id, type: "number", color, value };
}

function cleanName(name) {
  return String(name || "Player").trim().slice(0, 20) || "Player";
}

function withLog(game, line) {
  return { ...game, log: [line, ...(game.log || [])].slice(0, 80) };
}

