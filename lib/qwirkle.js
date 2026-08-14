export const QWIRKLE_COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
export const QWIRKLE_SHAPES = ["circle", "square", "diamond", "star", "cross", "clover"];

export const QWIRKLE_COLOR_INFO = {
  red: { name: "Red", hex: "#ef476f" },
  orange: { name: "Orange", hex: "#f68b2c" },
  yellow: { name: "Yellow", hex: "#f4c542" },
  green: { name: "Green", hex: "#35b779" },
  blue: { name: "Blue", hex: "#3a86ff" },
  purple: { name: "Purple", hex: "#a855f7" },
};

export const QWIRKLE_SHAPE_INFO = {
  circle: { name: "Circle" },
  square: { name: "Square" },
  diamond: { name: "Diamond" },
  star: { name: "Star" },
  cross: { name: "Cross" },
  clover: { name: "Clover" },
};

export const PLAYER_COLORS = ["#18a999", "#ef476f", "#5b6ee1", "#e59f28"];

const COMPUTER_NAMES = ["Dot", "Glyph", "Pixel", "Mosaic"];

export const positionKey = (x, y) => `${x},${y}`;

export function shuffled(items, rng = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createTileBag(rng = Math.random) {
  const tiles = [];
  for (const color of QWIRKLE_COLORS) {
    for (const shape of QWIRKLE_SHAPES) {
      for (let copy = 1; copy <= 3; copy += 1) {
        tiles.push({ id: `${color}-${shape}-${copy}`, color, shape });
      }
    }
  }
  return shuffled(tiles, rng);
}

function makePlayer(player, color, isComputer = false) {
  return {
    id: player.id,
    name: String(player.name || (isComputer ? "Computer" : "Player")).trim().slice(0, 24) || "Player",
    color,
    isComputer,
    hand: [],
    score: 0,
  };
}

export function createLobby(host, roomCode, now = Date.now()) {
  const first = makePlayer(host, PLAYER_COLORS[0]);
  return {
    game: "qwirkle",
    roomCode: String(roomCode || "").trim().toUpperCase(),
    hostId: first.id,
    phase: "lobby",
    players: [first],
    bag: [],
    board: {},
    currentPlayerIndex: 0,
    openingRequiredCount: 0,
    turnNumber: 0,
    winners: [],
    lastMove: null,
    log: [`${first.name} opened a Qwirkle table.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= 4 || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player, PLAYER_COLORS[game.players.length]);
  return { ...game, players: [...game.players, nextPlayer], log: [`${nextPlayer.name} joined the table.`, ...game.log] };
}

export function addComputerPlayer(game, overrides = {}) {
  if (game.phase !== "lobby" || game.players.length >= 4) return game;
  const usedNames = new Set(game.players.map((player) => player.name));
  const name = overrides.name || COMPUTER_NAMES.find((candidate) => !usedNames.has(candidate)) || `Computer ${game.players.length}`;
  const id = overrides.id || `bot-${Date.now()}-${game.players.length}`;
  const bot = makePlayer({ id, name }, PLAYER_COLORS[game.players.length], true);
  return { ...game, players: [...game.players, bot], log: [`${bot.name} clicked into place.`, ...game.log] };
}

export function removeComputerPlayer(game, computerId) {
  if (game.phase !== "lobby") return game;
  const computer = game.players.find((player) => player.id === computerId && player.isComputer);
  if (!computer) return game;
  const players = game.players.filter((player) => player.id !== computerId).map((player, index) => ({ ...player, color: PLAYER_COLORS[index] }));
  return { ...game, players, log: [`${computer.name} left the table.`, ...game.log] };
}

export function openingGroups(hand) {
  const groups = [];
  for (const color of QWIRKLE_COLORS) {
    const seen = new Set();
    const tiles = hand.filter((tile) => tile.color === color && !seen.has(tile.shape) && seen.add(tile.shape));
    if (tiles.length) groups.push(tiles);
  }
  for (const shape of QWIRKLE_SHAPES) {
    const seen = new Set();
    const tiles = hand.filter((tile) => tile.shape === shape && !seen.has(tile.color) && seen.add(tile.color));
    if (tiles.length) groups.push(tiles);
  }
  const largest = Math.max(1, ...groups.map((group) => group.length));
  return groups.filter((group) => group.length === largest);
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby" || game.players.length < 2 || game.players.length > 4) return game;
  const bag = createTileBag(rng);
  const players = game.players.map((player) => ({ ...makePlayer(player, player.color, player.isComputer), hand: bag.splice(0, 6) }));
  const openingSizes = players.map((player) => openingGroups(player.hand)[0].length);
  const openingRequiredCount = Math.max(...openingSizes);
  const currentPlayerIndex = openingSizes.indexOf(openingRequiredCount);
  return {
    ...game,
    phase: "playing",
    players,
    bag,
    board: {},
    currentPlayerIndex,
    openingRequiredCount,
    turnNumber: 1,
    winners: [],
    lastMove: null,
    log: [`${players[currentPlayerIndex].name} has the largest opening set (${openingRequiredCount}) and goes first.`, ...game.log],
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

function parseKey(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function contiguousLine(board, x, y, dx, dy) {
  let startX = x;
  let startY = y;
  while (board[positionKey(startX - dx, startY - dy)]) {
    startX -= dx;
    startY -= dy;
  }
  const line = [];
  let cursorX = startX;
  let cursorY = startY;
  while (board[positionKey(cursorX, cursorY)]) {
    line.push({ x: cursorX, y: cursorY, tile: board[positionKey(cursorX, cursorY)] });
    cursorX += dx;
    cursorY += dy;
  }
  return line;
}

export function isValidLine(tiles) {
  if (tiles.length <= 1) return true;
  if (tiles.length > 6) return false;
  const colors = new Set(tiles.map((tile) => tile.color));
  const shapes = new Set(tiles.map((tile) => tile.shape));
  return (colors.size === 1 && shapes.size === tiles.length) || (shapes.size === 1 && colors.size === tiles.length);
}

function boardIsConnected(board) {
  const keys = Object.keys(board);
  if (keys.length <= 1) return true;
  const seen = new Set([keys[0]]);
  const queue = [keys[0]];
  while (queue.length) {
    const { x, y } = parseKey(queue.shift());
    for (const [nextX, nextY] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = positionKey(nextX, nextY);
      if (board[key] && !seen.has(key)) {
        seen.add(key);
        queue.push(key);
      }
    }
  }
  return seen.size === keys.length;
}

function normalizedPlacements(game, playerId, placements) {
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !Array.isArray(placements)) return null;
  const hand = new Map(player.hand.map((tile) => [tile.id, tile]));
  const usedTiles = new Set();
  const usedPositions = new Set();
  const result = [];
  for (const placement of placements) {
    const tile = hand.get(placement?.tileId);
    const x = Number(placement?.x);
    const y = Number(placement?.y);
    const key = positionKey(x, y);
    if (!tile || !Number.isInteger(x) || !Number.isInteger(y) || usedTiles.has(tile.id) || usedPositions.has(key) || game.board[key]) return null;
    usedTiles.add(tile.id);
    usedPositions.add(key);
    result.push({ x, y, tile });
  }
  return result;
}

export function validateMove(game, playerId, placements, options = {}) {
  if (game.phase !== "playing" || currentPlayer(game)?.id !== playerId) return { valid: false, reason: "It is not that player's turn." };
  const normalized = normalizedPlacements(game, playerId, placements);
  if (!normalized?.length) return { valid: false, reason: "Choose at least one tile." };

  if (normalized.length > 1) {
    const oneRow = normalized.every((placement) => placement.y === normalized[0].y);
    const oneColumn = normalized.every((placement) => placement.x === normalized[0].x);
    if (!oneRow && !oneColumn) return { valid: false, reason: "Every tile in a turn must be in one row or column." };
    if (!isValidLine(normalized.map((placement) => placement.tile))) return { valid: false, reason: "Played tiles must share one color or one shape without duplicates." };
  }

  if (!Object.keys(game.board).length && !options.partial && normalized.length !== game.openingRequiredCount) {
    return { valid: false, reason: `The opening play must use the largest set of ${game.openingRequiredCount} tiles.` };
  }

  const board = { ...game.board };
  for (const placement of normalized) board[positionKey(placement.x, placement.y)] = placement.tile;
  if (!boardIsConnected(board)) return { valid: false, reason: "The tiles must connect to the grid." };
  if (normalized.length > 1) {
    const horizontal = normalized.every((placement) => placement.y === normalized[0].y);
    const primaryLine = contiguousLine(board, normalized[0].x, normalized[0].y, horizontal ? 1 : 0, horizontal ? 0 : 1);
    const primaryPositions = new Set(primaryLine.map(({ x, y }) => positionKey(x, y)));
    if (normalized.some(({ x, y }) => !primaryPositions.has(positionKey(x, y)))) {
      return { valid: false, reason: "Every played tile must belong to one continuous line." };
    }
  }

  const checked = new Set();
  for (const key of Object.keys(board)) {
    const { x, y } = parseKey(key);
    for (const [axis, dx, dy] of [["h", 1, 0], ["v", 0, 1]]) {
      const line = contiguousLine(board, x, y, dx, dy);
      if (line.length <= 1) continue;
      const id = `${axis}:${line[0].x},${line[0].y}`;
      if (checked.has(id)) continue;
      checked.add(id);
      if (!isValidLine(line.map((item) => item.tile))) return { valid: false, reason: "That placement would create an invalid color or shape line." };
    }
  }
  return { valid: true, board, normalized };
}

export function scoreMove(game, placements) {
  const playerId = currentPlayer(game)?.id;
  const validation = validateMove(game, playerId, placements);
  if (!validation.valid) return { score: 0, qwirkles: 0, lines: [] };
  const lines = new Map();
  for (const placement of validation.normalized) {
    for (const [axis, dx, dy] of [["h", 1, 0], ["v", 0, 1]]) {
      const line = contiguousLine(validation.board, placement.x, placement.y, dx, dy);
      if (line.length <= 1) continue;
      lines.set(`${axis}:${line[0].x},${line[0].y}`, line);
    }
  }
  if (!lines.size) return { score: 1, qwirkles: 0, lines: [] };
  let score = 0;
  let qwirkles = 0;
  for (const line of lines.values()) {
    score += line.length;
    if (line.length === 6) {
      score += 6;
      qwirkles += 1;
    }
  }
  return { score, qwirkles, lines: [...lines.values()] };
}

function finishGame(game) {
  const bestScore = Math.max(...game.players.map((player) => player.score));
  const winners = game.players.filter((player) => player.score === bestScore).map((player) => player.id);
  const winnerNames = game.players.filter((player) => winners.includes(player.id)).map((player) => player.name).join(" and ");
  return { ...game, phase: "finished", winners, log: [`${winnerNames} ${winners.length === 1 ? "wins" : "share the win"} with ${bestScore} points!`, ...game.log].slice(0, 80) };
}

function advanceTurn(game) {
  return { ...game, currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length, turnNumber: game.turnNumber + 1 };
}

export function playTiles(game, playerId, placements) {
  const validation = validateMove(game, playerId, placements);
  if (!validation.valid) return game;
  const result = scoreMove(game, placements);
  const player = currentPlayer(game);
  const playedIds = new Set(validation.normalized.map((placement) => placement.tile.id));
  const remainingHand = player.hand.filter((tile) => !playedIds.has(tile.id));
  const drawCount = Math.min(6 - remainingHand.length, game.bag.length);
  const drawn = game.bag.slice(0, drawCount);
  const bag = game.bag.slice(drawCount);
  const nextHand = [...remainingHand, ...drawn];
  const ended = bag.length === 0 && nextHand.length === 0;
  const points = result.score + (ended ? 6 : 0);
  const players = game.players.map((item) => item.id === playerId ? { ...item, hand: nextHand, score: item.score + points } : item);
  const moveWord = validation.normalized.length === 1 ? "tile" : "tiles";
  const qwirkleText = result.qwirkles ? ` ${"QWIRKLE! ".repeat(result.qwirkles).trim()} +${result.qwirkles * 6} bonus.` : "";
  const endText = ended ? " They emptied their rack for a 6-point bonus." : "";
  const next = {
    ...game,
    board: validation.board,
    bag,
    players,
    lastMove: { playerId, placements: validation.normalized.map(({ x, y, tile }) => ({ x, y, tileId: tile.id })), score: points, qwirkles: result.qwirkles },
    log: [`${player.name} placed ${validation.normalized.length} ${moveWord} for ${points} point${points === 1 ? "" : "s"}.${qwirkleText}${endText}`, ...game.log].slice(0, 80),
  };
  return ended ? finishGame(next) : advanceTurn(next);
}

export function exchangeTiles(game, playerId, tileIds, rng = Math.random) {
  const player = currentPlayer(game);
  const unique = [...new Set(Array.isArray(tileIds) ? tileIds : [])];
  if (game.phase !== "playing" || player?.id !== playerId || !unique.length || game.bag.length < unique.length) return game;
  const selected = player.hand.filter((tile) => unique.includes(tile.id));
  if (selected.length !== unique.length) return game;
  const selectedIds = new Set(unique);
  const drawn = game.bag.slice(0, unique.length);
  const bag = shuffled([...game.bag.slice(unique.length), ...selected], rng);
  const players = game.players.map((item) => item.id === playerId ? { ...item, hand: [...item.hand.filter((tile) => !selectedIds.has(tile.id)), ...drawn] } : item);
  return advanceTurn({ ...game, bag, players, lastMove: null, log: [`${player.name} exchanged ${unique.length} tile${unique.length === 1 ? "" : "s"}.`, ...game.log].slice(0, 80) });
}

export function boardBounds(game, padding = 2) {
  const positions = Object.keys(game.board).map(parseKey);
  if (!positions.length) return { minX: -3, maxX: 3, minY: -3, maxY: 3 };
  return {
    minX: Math.min(...positions.map(({ x }) => x)) - padding,
    maxX: Math.max(...positions.map(({ x }) => x)) + padding,
    minY: Math.min(...positions.map(({ y }) => y)) - padding,
    maxY: Math.max(...positions.map(({ y }) => y)) + padding,
  };
}

export function legalTargetsForTile(game, playerId, tileId, staged = [], bounds = boardBounds(game)) {
  const targets = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!Object.keys(game.board).length && !staged.length && (x !== 0 || y !== 0)) continue;
      const validation = validateMove(game, playerId, [...staged, { tileId, x, y }], { partial: true });
      if (validation.valid) targets.push({ x, y });
    }
  }
  return targets;
}

function candidateSingleMoves(game, player) {
  const bounds = boardBounds(game, 1);
  const moves = [];
  for (const tile of player.hand) {
    for (const target of legalTargetsForTile(game, player.id, tile.id, [], bounds)) {
      const placements = [{ tileId: tile.id, ...target }];
      if (validateMove(game, player.id, placements).valid) moves.push({ placements, ...scoreMove(game, placements) });
    }
  }
  return moves;
}

export function runComputerTurn(game, rng = Math.random) {
  const bot = currentPlayer(game);
  if (game.phase !== "playing" || !bot?.isComputer) return game;
  if (!Object.keys(game.board).length) {
    const group = openingGroups(bot.hand).find((tiles) => tiles.length === game.openingRequiredCount) || openingGroups(bot.hand)[0];
    const start = -Math.floor(group.length / 2);
    return playTiles(game, bot.id, group.map((tile, index) => ({ tileId: tile.id, x: start + index, y: 0 })));
  }
  const moves = candidateSingleMoves(game, bot).sort((left, right) => right.score - left.score || rng() - 0.5);
  if (moves.length) return playTiles(game, bot.id, moves[0].placements);
  const exchangeCount = Math.min(bot.hand.length, game.bag.length);
  if (exchangeCount) return exchangeTiles(game, bot.id, bot.hand.slice(0, exchangeCount).map((tile) => tile.id), rng);
  return game;
}
