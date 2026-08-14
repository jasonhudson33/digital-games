export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 7;

const BOT_NAMES = ["Moxie", "Pip", "Scout", "Dot", "Jinx", "Lucky"];
let computerCounter = 0;

export function createDeck(rng = Math.random) {
  return shuffled(
    Array.from({ length: 33 }, (_, index) => index + 3),
    rng,
  );
}

export function startingChips(playerCount) {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error("No Thanks! needs 3–7 players.");
  }
  if (playerCount === 7) return 7;
  if (playerCount === 6) return 9;
  return 11;
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    roomCode,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    deck: [],
    activeCard: null,
    centerChips: 0,
    currentPlayerIndex: 0,
    winnerIds: [],
    log: [`${player.name} opened a No Thanks! room.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (
    game.phase !== "lobby" ||
    game.players.length >= MAX_PLAYERS ||
    game.players.some((item) => item.id === player.id)
  ) return game;
  const nextPlayer = makePlayer(player);
  return withLog(
    { ...game, players: [...game.players, nextPlayer] },
    `${nextPlayer.name} joined the table.`,
  );
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  computerCounter += 1;
  const usedNames = new Set(game.players.map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) || `Computer ${computerCounter}`;
  const player = makePlayer({
    id: `no-thanks-computer-${Date.now()}-${computerCounter}`,
    name,
    isComputer: true,
  });
  return withLog(
    { ...game, players: [...game.players, player] },
    `${name} took a computer seat.`,
  );
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  return withLog(
    { ...game, players: game.players.filter((item) => item.id !== playerId) },
    `${player.name} left the table.`,
  );
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby") return game;
  const chips = startingChips(game.players.length);
  const shuffledDeck = createDeck(rng);
  const playableCards = shuffledDeck.slice(9);
  const firstPlayerIndex = Math.floor(rng() * game.players.length);
  const players = game.players.map((player) => ({ ...player, chips, cards: [] }));
  return {
    ...game,
    phase: "playing",
    players,
    deck: playableCards.slice(1),
    activeCard: playableCards[0],
    centerChips: 0,
    currentPlayerIndex: firstPlayerIndex,
    winnerIds: [],
    log: [
      `Nine cards were removed unseen. ${players[firstPlayerIndex].name} goes first.`,
      ...game.log,
    ].slice(0, 80),
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function passCard(game, playerId) {
  if (!canAct(game, playerId)) return game;
  const player = currentPlayer(game);
  if (player.chips <= 0) return game;
  const players = game.players.map((item) =>
    item.id === playerId ? { ...item, chips: item.chips - 1 } : item,
  );
  return withLog(
    {
      ...game,
      players,
      centerChips: game.centerChips + 1,
      currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
    },
    `${player.name} said “No thanks” and added a chip to ${game.activeCard}.`,
  );
}

export function takeCard(game, playerId) {
  if (!canAct(game, playerId)) return game;
  const player = currentPlayer(game);
  const collectedChips = game.centerChips;
  const players = game.players.map((item) =>
    item.id === playerId
      ? {
          ...item,
          chips: item.chips + collectedChips,
          cards: [...item.cards, game.activeCard].sort((left, right) => left - right),
        }
      : item,
  );
  const next = withLog(
    {
      ...game,
      players,
      deck: game.deck.slice(1),
      activeCard: game.deck[0] ?? null,
      centerChips: 0,
    },
    `${player.name} took ${game.activeCard}${collectedChips ? ` and ${collectedChips} chip${collectedChips === 1 ? "" : "s"}` : ""}.`,
  );
  return next.activeCard === null ? finishGame(next) : next;
}

export function runComputerStep(game, rng = Math.random) {
  const player = currentPlayer(game);
  if (game.phase !== "playing" || !player?.isComputer) return game;
  if (player.chips <= 0 || shouldComputerTake(game, player, rng)) {
    return takeCard(game, player.id);
  }
  return passCard(game, player.id);
}

export function cardScore(cards) {
  const unique = [...new Set(cards)].sort((left, right) => left - right);
  return unique.reduce((total, card, index) =>
    index === 0 || card !== unique[index - 1] + 1 ? total + card : total,
  0);
}

export function finalScore(player) {
  return cardScore(player.cards) - player.chips;
}

export function groupRuns(cards) {
  return [...new Set(cards)]
    .sort((left, right) => left - right)
    .reduce((runs, card) => {
      const last = runs.at(-1);
      if (last && last.at(-1) + 1 === card) last.push(card);
      else runs.push([card]);
      return runs;
    }, []);
}

function shouldComputerTake(game, player, rng) {
  const before = cardScore(player.cards);
  const after = cardScore([...player.cards, game.activeCard]);
  const netCost = after - before - game.centerChips;
  const fillsGap = player.cards.includes(game.activeCard - 1) && player.cards.includes(game.activeCard + 1);
  const extendsRun = player.cards.includes(game.activeCard - 1) || player.cards.includes(game.activeCard + 1);
  const chipPressure = player.chips <= 2 ? 5 : player.chips <= 4 ? 2 : 0;
  const lateGame = game.deck.length <= 6 ? 2 : 0;
  const threshold = 1 + chipPressure + lateGame + rng() * 3;
  return fillsGap || (extendsRun && netCost <= threshold + 4) || netCost <= threshold;
}

function finishGame(game) {
  const lowest = Math.min(...game.players.map(finalScore));
  const winnerIds = game.players.filter((player) => finalScore(player) === lowest).map((player) => player.id);
  const winners = game.players.filter((player) => winnerIds.includes(player.id)).map((player) => player.name);
  return withLog(
    { ...game, phase: "finished", winnerIds },
    `${winners.join(" and ")} ${winners.length === 1 ? "wins" : "tie"} with ${lowest} points.`,
  );
}

function canAct(game, playerId) {
  return game.phase === "playing" && currentPlayer(game)?.id === playerId;
}

function makePlayer(player) {
  return {
    id: player.id,
    name: String(player.name || "Player").trim().slice(0, 20) || "Player",
    isComputer: Boolean(player.isComputer),
    chips: 0,
    cards: [],
  };
}

function withLog(game, message) {
  return { ...game, log: [message, ...game.log].slice(0, 80) };
}

function shuffled(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
