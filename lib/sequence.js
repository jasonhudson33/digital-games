export const TEAM_COLORS = [
  { name: "Blue", color: "#255da8", light: "#dbeafe" },
  { name: "Green", color: "#27805b", light: "#d9f4e7" },
  { name: "Red", color: "#bb3e47", light: "#fde2e4" },
];

export const VALID_PLAYER_COUNTS = [2, 3, 4, 6, 8, 9, 10, 12];

const PORTRAIT_BOARD = [
  ["FREE", "6D", "7D", "8D", "9D", "10D", "QD", "KD", "AD", "FREE"],
  ["5D", "3H", "2H", "2S", "3S", "4S", "5S", "6S", "7S", "AC"],
  ["4D", "4H", "KD", "AD", "AC", "KC", "QC", "10C", "8S", "KC"],
  ["3D", "5H", "QD", "QH", "10H", "9H", "8H", "9C", "9S", "QC"],
  ["2D", "6H", "10D", "KH", "3H", "2H", "7H", "8C", "10S", "10C"],
  ["AS", "7H", "9D", "AH", "4H", "5H", "6H", "7C", "QS", "9C"],
  ["KS", "8H", "8D", "2C", "3C", "4C", "5C", "6C", "KS", "8C"],
  ["QS", "9H", "7D", "6D", "5D", "4D", "3D", "2D", "AS", "7C"],
  ["10S", "10H", "QH", "KH", "AH", "2C", "3C", "4C", "5C", "6C"],
  ["FREE", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S", "FREE"],
];

// The printed board's diamond and spade runs sit at its portrait top and bottom.
// The digital table is landscape, so rotate the complete board clockwise—the
// same direction the card artwork is rotated in the UI—to preserve all spatial
// relationships while moving those runs to the right and left edges.
export const BOARD = PORTRAIT_BOARD[0].map((_, column) =>
  PORTRAIT_BOARD.map((row) => row[column]).reverse(),
);

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export const cardLabel = (code) => code === "FREE" ? "Free" : `${code.slice(0, -1)}${{ S: "♠", H: "♥", D: "♦", C: "♣" }[code.slice(-1)]}`;
export const cardIsRed = (code) => code.endsWith("H") || code.endsWith("D");
export const isTwoEyedJack = (code) => code === "JC" || code === "JD";
export const isOneEyedJack = (code) => code === "JH" || code === "JS";
export const positionKey = (row, column) => `${row}:${column}`;

export function createDeck(rng = Math.random) {
  return shuffled(Array.from({ length: 2 }, (_, deck) => SUITS.flatMap((suit) => RANKS.map((rank) => ({
    id: `${deck}-${rank}${suit}`,
    code: `${rank}${suit}`,
  })))).flat(), rng);
}

export function shuffled(items, rng = Math.random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function handSizeFor(playerCount) {
  return ({ 2: 7, 3: 6, 4: 6, 6: 5, 8: 4, 9: 4, 10: 3, 12: 3 })[playerCount] ?? 0;
}

export function compatibleTeamCounts(playerCount) {
  if (playerCount === 2) return [2];
  if (playerCount === 3) return [3];
  return [2, 3].filter((count) => playerCount > 3 && playerCount % count === 0);
}

export function createLobby(host, roomCode, now = Date.now()) {
  return {
    roomCode,
    hostId: host.id,
    phase: "lobby",
    teamCount: 2,
    players: [createPlayer(host)],
    createdAt: now,
    updatedAt: now,
    log: [`${safeName(host.name)} opened the table.`],
  };
}

function createPlayer(player, isComputer = false) {
  return {
    id: player.id,
    name: safeName(player.name),
    isComputer,
    teamIndex: null,
    hand: [],
  };
}

function safeName(name) {
  return String(name || "Player").trim().slice(0, 20) || "Player";
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= 12 || game.players.some((item) => item.id === player.id)) return game;
  const next = createPlayer(player);
  return { ...game, players: [...game.players, next], log: [`${next.name} joined the room.`, ...game.log].slice(0, 50) };
}

export function addComputerPlayer(game, options = {}) {
  if (game.phase !== "lobby" || game.players.length >= 12) return game;
  let number = 1;
  while (game.players.some((player) => player.name === `Computer ${number}`)) number += 1;
  const player = createPlayer({
    id: options.id ?? `computer-${Date.now()}-${number}`,
    name: options.name ?? `Computer ${number}`,
  }, true);
  if (game.players.some((item) => item.id === player.id)) return game;
  return { ...game, players: [...game.players, player], log: [`${player.name} took a seat.`, ...game.log].slice(0, 50) };
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const computer = game.players.find((player) => player.id === playerId && player.isComputer);
  if (!computer) return game;
  return { ...game, players: game.players.filter((player) => player.id !== playerId), log: [`${computer.name} left the table.`, ...game.log].slice(0, 50) };
}

export function setTeamCount(game, teamCount) {
  if (game.phase !== "lobby" || ![2, 3].includes(teamCount)) return game;
  return { ...game, teamCount };
}

export function startGame(lobby, rng = Math.random) {
  const playerCount = lobby.players.length;
  if (!VALID_PLAYER_COUNTS.includes(playerCount)) {
    throw new Error("Sequence supports 2, 3, 4, 6, 8, 9, 10, or 12 players.");
  }
  const teamOptions = compatibleTeamCounts(playerCount);
  const teamCount = teamOptions.includes(lobby.teamCount) ? lobby.teamCount : teamOptions[0];
  if (!teamCount) throw new Error("Players must divide evenly into two or three teams.");
  let deck = createDeck(rng);
  const handSize = handSizeFor(playerCount);
  const players = lobby.players.map((player, index) => {
    const hand = deck.slice(0, handSize);
    deck = deck.slice(handSize);
    return { ...player, teamIndex: index % teamCount, hand };
  });
  const startingPlayerIndex = Math.floor(rng() * players.length);
  return {
    ...lobby,
    phase: "playing",
    teamCount,
    players,
    deck,
    discard: [],
    chips: {},
    completedSequences: [],
    currentPlayerIndex: startingPlayerIndex,
    deadCardExchanged: false,
    winnerTeamIndex: null,
    log: [`${players[startingPlayerIndex].name} plays first.`, ...lobby.log].slice(0, 50),
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function teamPlayers(game, teamIndex) {
  return game.players.filter((player) => player.teamIndex === teamIndex);
}

export function sequencesRequired(game) {
  return game.teamCount === 3 ? 1 : 2;
}

export function completedForTeam(game, teamIndex) {
  return game.completedSequences.filter((sequence) => sequence.teamIndex === teamIndex);
}

export function boardPositionsForCard(code) {
  const positions = [];
  BOARD.forEach((row, rowIndex) => row.forEach((card, columnIndex) => {
    if (card === code) positions.push({ row: rowIndex, column: columnIndex });
  }));
  return positions;
}

export function isProtectedChip(game, row, column) {
  const key = positionKey(row, column);
  return game.completedSequences.some((sequence) => sequence.positions.includes(key));
}

export function legalTargetsForCard(game, card, playerId = currentPlayer(game)?.id) {
  const player = game.players.find((item) => item.id === playerId);
  if (!player) return [];
  if (isTwoEyedJack(card.code)) return openPositions(game);
  if (isOneEyedJack(card.code)) {
    return Object.entries(game.chips)
      .filter(([key, chip]) => chip.teamIndex !== player.teamIndex && !isProtectedChipByKey(game, key))
      .map(([key]) => keyToPosition(key));
  }
  return boardPositionsForCard(card.code).filter(({ row, column }) => !game.chips[positionKey(row, column)]);
}

export function isDeadCard(game, card) {
  return !isOneEyedJack(card.code) && !isTwoEyedJack(card.code) && legalTargetsForCard(game, card).length === 0;
}

export function exchangeDeadCard(game, playerId, cardId, rng = Math.random) {
  if (game.phase !== "playing" || currentPlayer(game)?.id !== playerId || game.deadCardExchanged) return game;
  const player = currentPlayer(game);
  const card = player.hand.find((item) => item.id === cardId);
  if (!card || !isDeadCard(game, card)) return game;
  const prepared = replenishDeck(game, rng);
  const replacement = prepared.deck[0];
  if (!replacement) return game;
  return {
    ...prepared,
    deck: prepared.deck.slice(1),
    discard: [...prepared.discard, card],
    deadCardExchanged: true,
    players: prepared.players.map((item) => item.id === playerId ? { ...item, hand: item.hand.map((held) => held.id === cardId ? replacement : held) } : item),
    log: [`${player.name} exchanged a dead card.`, ...prepared.log].slice(0, 50),
  };
}

export function playCard(game, playerId, cardId, row, column, rng = Math.random) {
  if (game.phase !== "playing" || currentPlayer(game)?.id !== playerId) return game;
  const player = currentPlayer(game);
  const card = player.hand.find((item) => item.id === cardId);
  if (!card || !legalTargetsForCard(game, card, playerId).some((target) => target.row === row && target.column === column)) return game;

  const targetKey = positionKey(row, column);
  const removing = isOneEyedJack(card.code);
  let chips = { ...game.chips };
  if (removing) delete chips[targetKey];
  else chips[targetKey] = { teamIndex: player.teamIndex, playerId };

  let next = {
    ...game,
    chips,
    discard: [...game.discard, card],
    players: game.players.map((item) => item.id === playerId ? { ...item, hand: item.hand.filter((held) => held.id !== cardId) } : item),
  };

  const newSequences = removing ? [] : findNewSequences(next, player.teamIndex, row, column);
  if (newSequences.length) next = { ...next, completedSequences: [...next.completedSequences, ...newSequences] };

  const teamSequenceCount = completedForTeam(next, player.teamIndex).length;
  const action = removing
    ? `${player.name} used a one-eyed Jack to remove a ${TEAM_COLORS[game.chips[targetKey].teamIndex].name} chip.`
    : `${player.name} played ${cardLabel(card.code)}${newSequences.length ? " and completed a sequence!" : "."}`;

  if (teamSequenceCount >= sequencesRequired(next)) {
    return { ...next, phase: "finished", winnerTeamIndex: player.teamIndex, log: [`Team ${TEAM_COLORS[player.teamIndex].name} wins!`, action, ...game.log].slice(0, 50) };
  }

  next = drawAfterTurn(next, playerId, rng);
  return {
    ...next,
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
    deadCardExchanged: false,
    log: [action, ...game.log].slice(0, 50),
  };
}

function drawAfterTurn(game, playerId, rng) {
  const prepared = replenishDeck(game, rng);
  const drawn = prepared.deck[0];
  if (!drawn) return prepared;
  return {
    ...prepared,
    deck: prepared.deck.slice(1),
    players: prepared.players.map((player) => player.id === playerId ? { ...player, hand: [...player.hand, drawn] } : player),
  };
}

function replenishDeck(game, rng) {
  if (game.deck.length || !game.discard.length) return game;
  return { ...game, deck: shuffled(game.discard, rng), discard: [] };
}

function openPositions(game) {
  const result = [];
  BOARD.forEach((row, rowIndex) => row.forEach((card, columnIndex) => {
    if (card !== "FREE" && !game.chips[positionKey(rowIndex, columnIndex)]) result.push({ row: rowIndex, column: columnIndex });
  }));
  return result;
}

function isProtectedChipByKey(game, key) {
  return game.completedSequences.some((sequence) => sequence.positions.includes(key));
}

function keyToPosition(key) {
  const [row, column] = key.split(":").map(Number);
  return { row, column };
}

function belongsToTeam(game, row, column, teamIndex) {
  if (row < 0 || row > 9 || column < 0 || column > 9) return false;
  if (BOARD[row][column] === "FREE") return true;
  return game.chips[positionKey(row, column)]?.teamIndex === teamIndex;
}

function findNewSequences(game, teamIndex, playedRow, playedColumn) {
  const existing = completedForTeam(game, teamIndex);
  const found = [];
  for (const [rowStep, columnStep] of DIRECTIONS) {
    for (let offset = -4; offset <= 0; offset += 1) {
      const positions = Array.from({ length: 5 }, (_, index) => ({
        row: playedRow + (offset + index) * rowStep,
        column: playedColumn + (offset + index) * columnStep,
      }));
      if (!positions.every(({ row, column }) => belongsToTeam(game, row, column, teamIndex))) continue;
      const keys = positions.map(({ row, column }) => positionKey(row, column));
      if ([...existing, ...found].some((sequence) => overlapCount(sequence.positions, keys) > 1)) continue;
      found.push({ id: `${teamIndex}-${keys.join("_")}`, teamIndex, positions: keys });
      if (existing.length + found.length >= sequencesRequired(game)) return found;
    }
  }
  return found;
}

function overlapCount(first, second) {
  const other = new Set(second);
  return first.filter((key) => other.has(key)).length;
}

export function runComputerTurn(game, rng = Math.random) {
  if (game.phase !== "playing" || !currentPlayer(game)?.isComputer) return game;
  let prepared = game;
  const dead = currentPlayer(prepared).hand.find((card) => isDeadCard(prepared, card));
  if (dead) prepared = exchangeDeadCard(prepared, currentPlayer(prepared).id, dead.id, rng);
  const player = currentPlayer(prepared);
  const actions = player.hand.flatMap((card) => legalTargetsForCard(prepared, card, player.id).map((target) => ({ card, ...target })));
  if (!actions.length) return { ...prepared, phase: "finished", winnerTeamIndex: null, log: ["No legal moves remain. The game is a draw.", ...prepared.log] };
  const scored = actions.map((action) => ({ action, score: scoreComputerAction(prepared, player, action) + rng() * 0.2 }));
  scored.sort((first, second) => second.score - first.score);
  const choice = scored[0].action;
  return playCard(prepared, player.id, choice.card.id, choice.row, choice.column, rng);
}

function scoreComputerAction(game, player, action) {
  const key = positionKey(action.row, action.column);
  if (isOneEyedJack(action.card.code)) {
    const removedTeam = game.chips[key]?.teamIndex;
    return 15 + linePotential(game, removedTeam, action.row, action.column, true) * 5;
  }
  let score = 2 + linePotential(game, player.teamIndex, action.row, action.column, false) * 7;
  for (let teamIndex = 0; teamIndex < game.teamCount; teamIndex += 1) {
    if (teamIndex !== player.teamIndex) score += linePotential(game, teamIndex, action.row, action.column, true) * 3;
  }
  if (isTwoEyedJack(action.card.code)) score -= 1;
  if ([0, 9].includes(action.row) && [0, 9].includes(action.column)) score += 2;
  return score;
}

function linePotential(game, teamIndex, row, column, treatTargetAsOwned) {
  let best = 0;
  for (const [rowStep, columnStep] of DIRECTIONS) {
    for (let offset = -4; offset <= 0; offset += 1) {
      let count = 0;
      let blocked = false;
      for (let index = 0; index < 5; index += 1) {
        const nextRow = row + (offset + index) * rowStep;
        const nextColumn = column + (offset + index) * columnStep;
        if (nextRow < 0 || nextRow > 9 || nextColumn < 0 || nextColumn > 9) { blocked = true; break; }
        if (nextRow === row && nextColumn === column && treatTargetAsOwned) count += 1;
        else if (BOARD[nextRow][nextColumn] === "FREE" || game.chips[positionKey(nextRow, nextColumn)]?.teamIndex === teamIndex) count += 1;
        else if (game.chips[positionKey(nextRow, nextColumn)]) blocked = true;
      }
      if (!blocked) best = Math.max(best, count);
    }
  }
  return best;
}
