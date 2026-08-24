import { shuffled } from "./shuffle.js";

export const BOARD_SIZE = 10;

export const STRATEGO_PIECE_TYPES = [
  { kind: "marshal", label: "Marshal", rank: 1, mark: "1", count: 1, icon: "★" },
  { kind: "general", label: "General", rank: 2, mark: "2", count: 1, icon: "✦" },
  { kind: "colonel", label: "Colonel", rank: 3, mark: "3", count: 2, icon: "◆" },
  { kind: "major", label: "Major", rank: 4, mark: "4", count: 3, icon: "◇" },
  { kind: "captain", label: "Captain", rank: 5, mark: "5", count: 4, icon: "▲" },
  { kind: "lieutenant", label: "Lieutenant", rank: 6, mark: "6", count: 4, icon: "△" },
  { kind: "sergeant", label: "Sergeant", rank: 7, mark: "7", count: 4, icon: "●" },
  { kind: "miner", label: "Miner", rank: 8, mark: "8", count: 5, icon: "⛏" },
  { kind: "scout", label: "Scout", rank: 9, mark: "9", count: 8, icon: "⌁" },
  { kind: "spy", label: "Spy", rank: 10, mark: "S", count: 1, icon: "◉" },
  { kind: "bomb", label: "Bomb", rank: null, mark: "B", count: 6, icon: "✹", immobile: true },
  { kind: "flag", label: "Flag", rank: null, mark: "F", count: 1, icon: "⚑", immobile: true },
];

export const STRATEGO_ARMY_SIZE = STRATEGO_PIECE_TYPES.reduce((sum, type) => sum + type.count, 0);
export const LAKE_KEYS = new Set([
  "4:2", "4:3", "5:2", "5:3",
  "4:6", "4:7", "5:6", "5:7",
]);

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export const positionKey = (row, column) => `${row}:${column}`;
export const isLake = (row, column) => LAKE_KEYS.has(positionKey(row, column));
export const isOnBoard = (row, column) => row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;

export function createStrategoLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host, "red");
  const pieces = createArmy(player.id, player.color);
  return {
    version: 1,
    roomCode,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    pieces,
    board: {},
    captured: [],
    currentPlayerIndex: 0,
    moveHistory: [],
    lastBattle: null,
    winnerId: null,
    winReason: null,
    log: [`${player.name} raised the Red standard.`],
    createdAt: now,
    updatedAt: now,
  };
}

export function addStrategoPlayer(game, entrant) {
  if (game.phase !== "lobby" || game.players.length >= 2 || game.players.some((player) => player.id === entrant.id)) return game;
  const player = makePlayer(entrant, "blue");
  return {
    ...game,
    phase: "setup",
    players: [...game.players, player],
    pieces: { ...game.pieces, ...createArmy(player.id, player.color) },
    log: [`${player.name} joined the Blue army. Secret deployment begins.`, ...game.log].slice(0, 60),
  };
}

export function addStrategoComputer(game, options = {}) {
  if (game.phase !== "lobby" || game.players.length >= 2) return game;
  const computer = {
    id: options.id ?? `computer-${Date.now()}`,
    name: options.name ?? "Iron Fox",
    isComputer: true,
  };
  let next = addStrategoPlayer(game, computer);
  next = autoPlaceStrategoArmy(next, computer.id, options.rng ?? Math.random);
  next = setStrategoReady(next, computer.id);
  return {
    ...next,
    log: [`${computer.name} assembled a computer-controlled Blue army.`, ...next.log].slice(0, 60),
  };
}

export function currentStrategoPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function pieceAt(game, row, column) {
  const pieceId = game.board[positionKey(row, column)];
  return pieceId ? game.pieces[pieceId] ?? null : null;
}

export function piecePosition(game, pieceId) {
  const entry = Object.entries(game.board).find(([, id]) => id === pieceId);
  if (!entry) return null;
  const [row, column] = entry[0].split(":").map(Number);
  return { row, column };
}

export function deploymentRows(color) {
  return color === "red" ? [6, 7, 8, 9] : [0, 1, 2, 3];
}

export function canDeployAt(game, playerId, row, column) {
  const player = game.players.find((entry) => entry.id === playerId);
  return Boolean(player && game.phase === "setup" && !player.ready && deploymentRows(player.color).includes(row) && isOnBoard(row, column) && !isLake(row, column));
}

export function deploymentCount(game, playerId) {
  return Object.values(game.board).filter((pieceId) => game.pieces[pieceId]?.ownerId === playerId).length;
}

export function unplacedPieces(game, playerId) {
  const placed = new Set(Object.values(game.board));
  return Object.values(game.pieces).filter((piece) => piece.ownerId === playerId && !placed.has(piece.id) && !game.captured.includes(piece.id));
}

export function placeStrategoPiece(game, playerId, pieceId, row, column) {
  const piece = game.pieces[pieceId];
  if (!piece || piece.ownerId !== playerId || !canDeployAt(game, playerId, row, column)) return game;

  const targetKey = positionKey(row, column);
  const targetPiece = pieceAt(game, row, column);
  if (targetPiece && targetPiece.ownerId !== playerId) return game;

  const from = piecePosition(game, pieceId);
  const board = { ...game.board };
  if (from) delete board[positionKey(from.row, from.column)];

  if (targetPiece) {
    if (!from) return game;
    board[positionKey(from.row, from.column)] = targetPiece.id;
  }
  board[targetKey] = pieceId;
  return { ...game, board };
}

export function clearStrategoDeployment(game, playerId) {
  const player = game.players.find((entry) => entry.id === playerId);
  if (game.phase !== "setup" || !player || player.ready) return game;
  return {
    ...game,
    board: Object.fromEntries(Object.entries(game.board).filter(([, pieceId]) => game.pieces[pieceId]?.ownerId !== playerId)),
  };
}

export function autoPlaceStrategoArmy(game, playerId, rng = Math.random) {
  const player = game.players.find((entry) => entry.id === playerId);
  if (game.phase !== "setup" || !player || player.ready) return game;
  const cleared = clearStrategoDeployment(game, playerId);
  const spaces = shuffled(deploymentRows(player.color).flatMap((row) => Array.from({ length: BOARD_SIZE }, (_, column) => positionKey(row, column))), rng);
  const army = Object.values(cleared.pieces).filter((piece) => piece.ownerId === playerId);
  const board = { ...cleared.board };
  army.forEach((piece, index) => { board[spaces[index]] = piece.id; });
  return { ...cleared, board };
}

export function setStrategoReady(game, playerId, ready = true) {
  if (game.phase !== "setup") return game;
  const player = game.players.find((entry) => entry.id === playerId);
  if (!player || (ready && deploymentCount(game, playerId) !== STRATEGO_ARMY_SIZE)) return game;
  const players = game.players.map((entry) => entry.id === playerId ? { ...entry, ready: Boolean(ready) } : entry);
  const next = {
    ...game,
    players,
    log: [`${player.name} is ${ready ? "ready for battle" : "adjusting their deployment"}.`, ...game.log].slice(0, 60),
  };
  if (players.length === 2 && players.every((entry) => entry.ready)) {
    return {
      ...next,
      phase: "playing",
      currentPlayerIndex: players.findIndex((entry) => entry.color === "red"),
      log: [`Both armies are ready. ${players.find((entry) => entry.color === "red").name} moves first as Red.`, ...next.log].slice(0, 60),
    };
  }
  return next;
}

export function legalStrategoMoves(game, playerId, pieceId) {
  if (game.phase !== "playing" || currentStrategoPlayer(game)?.id !== playerId) return [];
  const piece = game.pieces[pieceId];
  const from = piecePosition(game, pieceId);
  if (!piece || piece.ownerId !== playerId || piece.immobile || !from) return [];
  const moves = [];
  const distanceLimit = piece.kind === "scout" ? BOARD_SIZE : 1;

  for (const [rowStep, columnStep] of DIRECTIONS) {
    for (let distance = 1; distance <= distanceLimit; distance += 1) {
      const row = from.row + rowStep * distance;
      const column = from.column + columnStep * distance;
      if (!isOnBoard(row, column) || isLake(row, column)) break;
      const occupant = pieceAt(game, row, column);
      if (occupant?.ownerId === playerId) break;
      if (!violatesTwoSquareRule(game, playerId, pieceId, from, { row, column })) {
        moves.push({ row, column, attack: Boolean(occupant) });
      }
      if (occupant) break;
    }
  }
  return moves;
}

export function moveStrategoPiece(game, playerId, pieceId, row, column) {
  const target = legalStrategoMoves(game, playerId, pieceId).find((move) => move.row === row && move.column === column);
  if (!target) return game;
  const player = currentStrategoPlayer(game);
  const attacker = game.pieces[pieceId];
  const from = piecePosition(game, pieceId);
  const defender = pieceAt(game, row, column);
  const fromKey = positionKey(from.row, from.column);
  const toKey = positionKey(row, column);
  const board = { ...game.board };
  const captured = [...game.captured];
  delete board[fromKey];

  let winnerId = null;
  let winReason = null;
  let lastBattle = game.lastBattle;
  let action = `${player.name} advanced a piece.`;

  if (!defender) {
    board[toKey] = attacker.id;
  } else {
    const result = resolveStrategoCombat(attacker, defender);
    const defenderPlayer = game.players.find((entry) => entry.id === defender.ownerId);
    if (result.attackerSurvives) board[toKey] = attacker.id;
    else if (result.defenderSurvives) board[toKey] = defender.id;
    if (!result.attackerSurvives) captured.push(attacker.id);
    if (!result.defenderSurvives) captured.push(defender.id);
    lastBattle = {
      attacker: battlePiece(attacker),
      defender: battlePiece(defender),
      attackerPlayerId: attacker.ownerId,
      defenderPlayerId: defender.ownerId,
      attackerName: player.name,
      defenderName: defenderPlayer?.name ?? "Defender",
      attackerColor: attacker.color,
      defenderColor: defender.color,
      attackerSurvives: result.attackerSurvives,
      defenderSurvives: result.defenderSurvives,
      result: result.result,
      row,
      column,
      at: Date.now(),
    };
    action = `Battle: ${player.name}'s ${attacker.label} ${result.result}.`;
    if (defender.kind === "flag") {
      winnerId = playerId;
      winReason = "captured the enemy Flag";
    }
  }

  let next = {
    ...game,
    board,
    captured,
    lastBattle,
    winnerId,
    winReason,
    moveHistory: [...game.moveHistory, { playerId, pieceId, from: fromKey, to: toKey }].slice(-30),
    log: [action, ...game.log].slice(0, 60),
  };

  if (winnerId) return finishStratego(next, winnerId, winReason);
  next = { ...next, currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length };
  const nextPlayer = currentStrategoPlayer(next);
  if (!hasAnyLegalMove(next, nextPlayer.id)) {
    return finishStratego(next, playerId, `${nextPlayer.name} had no legal move`);
  }
  return next;
}

export function runStrategoComputerTurn(game, rng = Math.random) {
  const computer = currentStrategoPlayer(game);
  if (game.phase !== "playing" || !computer?.isComputer) return game;
  const choices = Object.values(game.pieces).flatMap((piece) => {
    if (piece.ownerId !== computer.id) return [];
    return legalStrategoMoves(game, computer.id, piece.id).map((move) => ({ piece, move }));
  });
  if (!choices.length) {
    const opponent = game.players.find((player) => player.id !== computer.id);
    return finishStratego(game, opponent.id, `${computer.name} had no legal move`);
  }

  // The computer may use public facts—occupied squares and travel distance—but
  // never reads an enemy's concealed type or rank while choosing an attack.
  const attacks = choices.filter((choice) => choice.move.attack);
  const pool = attacks.length && rng() < 0.72 ? attacks : choices;
  const forward = computer.color === "blue" ? 1 : -1;
  const ranked = pool.map((choice) => ({
    ...choice,
    score: (choice.move.attack ? 30 : 0)
      + (choice.move.row - piecePosition(game, choice.piece.id).row) * forward * 2
      + rng() * 12,
  })).sort((first, second) => second.score - first.score);
  const choice = ranked[0];
  return moveStrategoPiece(game, computer.id, choice.piece.id, choice.move.row, choice.move.column);
}

export function resolveStrategoCombat(attacker, defender) {
  if (defender.kind === "flag") return { attackerSurvives: true, defenderSurvives: false, result: "captured the Flag" };
  if (defender.kind === "bomb") {
    return attacker.kind === "miner"
      ? { attackerSurvives: true, defenderSurvives: false, result: "defused a Bomb" }
      : { attackerSurvives: false, defenderSurvives: true, result: "was destroyed by a Bomb" };
  }
  if (attacker.kind === "spy" && defender.kind === "marshal") {
    return { attackerSurvives: true, defenderSurvives: false, result: "assassinated the Marshal" };
  }
  if (attacker.rank < defender.rank) return { attackerSurvives: true, defenderSurvives: false, result: `defeated the ${defender.label}` };
  if (attacker.rank > defender.rank) return { attackerSurvives: false, defenderSurvives: true, result: `fell to the ${defender.label}` };
  return { attackerSurvives: false, defenderSurvives: false, result: `tied the ${defender.label}; both were removed` };
}

export function hasAnyLegalMove(game, playerId) {
  return Object.values(game.pieces).some((piece) => piece.ownerId === playerId && legalMovesIgnoringTurn(game, playerId, piece.id).length > 0);
}

export function visibleStrategoPiece(piece, viewerId) {
  if (!piece) return null;
  if (piece.ownerId === viewerId) return { ...piece, hidden: false };
  return { id: piece.id, ownerId: piece.ownerId, color: piece.color, hidden: true, mark: "?", label: "Unknown piece", icon: "?" };
}

export function capturedByPlayer(game, playerId) {
  return game.captured.map((pieceId) => game.pieces[pieceId]).filter((piece) => piece && piece.ownerId !== playerId);
}

function legalMovesIgnoringTurn(game, playerId, pieceId) {
  const acting = game.players.findIndex((player) => player.id === playerId);
  if (acting < 0 || game.phase !== "playing") return [];
  return legalStrategoMoves({ ...game, currentPlayerIndex: acting }, playerId, pieceId);
}

function violatesTwoSquareRule(game, playerId, pieceId, from, to) {
  const prior = game.moveHistory.filter((move) => move.playerId === playerId).slice(-3);
  if (prior.length < 3 || prior.some((move) => move.pieceId !== pieceId)) return false;
  const nextEdge = edgeKey(positionKey(from.row, from.column), positionKey(to.row, to.column));
  return prior.every((move) => edgeKey(move.from, move.to) === nextEdge);
}

function edgeKey(first, second) {
  return [first, second].sort().join("|");
}

function finishStratego(game, winnerId, reason) {
  const winner = game.players.find((player) => player.id === winnerId);
  return {
    ...game,
    phase: "finished",
    winnerId,
    winReason: reason,
    log: [`${winner.name} wins: ${reason}.`, ...game.log].slice(0, 60),
  };
}

function createArmy(ownerId, color) {
  return Object.fromEntries(STRATEGO_PIECE_TYPES.flatMap((type) => Array.from({ length: type.count }, (_, index) => {
    const id = `${color}-${type.kind}-${index + 1}`;
    return [id, { ...type, count: undefined, id, ownerId, color }];
  })));
}

function makePlayer(player, color) {
  return {
    id: player.id,
    name: safeName(player.name),
    color,
    isComputer: Boolean(player.isComputer),
    ready: false,
  };
}

function safeName(name) {
  return String(name || "Commander").trim().slice(0, 20) || "Commander";
}

function battlePiece(piece) {
  return { kind: piece.kind, label: piece.label, rank: piece.rank, mark: piece.mark, icon: piece.icon };
}
