import { shuffled } from "./shuffle.js";

export const GEM_COLORS = ["white", "blue", "green", "red", "black"];

export const GEM_INFO = {
  white: { name: "Diamond", short: "D", hex: "#f4f1e8" },
  blue: { name: "Sapphire", short: "S", hex: "#2877b8" },
  green: { name: "Emerald", short: "E", hex: "#29935d" },
  red: { name: "Ruby", short: "R", hex: "#c84449" },
  black: { name: "Onyx", short: "O", hex: "#272b34" },
  gold: { name: "Gold", short: "G", hex: "#d4a73e" },
};

export const PLAYER_COLORS = ["#d49d37", "#2e7f8f", "#9f4d62", "#687b43"];

const COMPUTER_NAMES = ["Lady Ada", "Marco", "Saffron", "The Goldsmith"];

// Each row is [prestige, black, white, red, blue, green]. The first eight
// rows for a bonus color are level 1, the next six level 2, and the last four level 3.
const CLASSIC_CARD_DATA = {
  black: [
    [0, 0, 1, 1, 1, 1], [0, 0, 0, 1, 0, 2], [0, 0, 2, 0, 0, 2], [0, 1, 0, 3, 0, 1],
    [0, 0, 0, 0, 0, 3], [0, 0, 1, 1, 2, 1], [0, 0, 2, 1, 2, 0], [1, 0, 0, 0, 4, 0],
    [1, 0, 3, 0, 2, 2], [1, 2, 3, 0, 0, 3], [2, 0, 0, 2, 1, 4], [2, 0, 5, 0, 0, 0],
    [2, 0, 0, 3, 0, 5], [3, 6, 0, 0, 0, 0],
    [3, 0, 3, 3, 3, 5], [4, 0, 0, 7, 0, 0], [4, 3, 0, 6, 0, 3], [5, 3, 0, 7, 0, 0],
  ],
  blue: [
    [0, 2, 1, 0, 0, 0], [0, 1, 1, 2, 0, 1], [0, 1, 1, 1, 0, 1], [0, 0, 0, 1, 1, 3],
    [0, 3, 0, 0, 0, 0], [0, 0, 1, 2, 0, 2], [0, 2, 0, 0, 0, 2], [1, 0, 0, 4, 0, 0],
    [1, 0, 0, 3, 2, 2], [1, 3, 0, 0, 2, 3], [2, 0, 5, 0, 3, 0], [2, 0, 0, 0, 5, 0],
    [2, 4, 2, 1, 0, 0], [3, 0, 0, 0, 6, 0],
    [3, 5, 3, 3, 0, 3], [4, 0, 7, 0, 0, 0], [4, 3, 6, 0, 3, 0], [5, 0, 7, 0, 3, 0],
  ],
  green: [
    [0, 0, 2, 0, 1, 0], [0, 0, 0, 2, 2, 0], [0, 0, 1, 0, 3, 1], [0, 1, 1, 1, 1, 0],
    [0, 2, 1, 1, 1, 0], [0, 2, 0, 2, 1, 0], [0, 0, 0, 3, 0, 0], [1, 4, 0, 0, 0, 0],
    [1, 0, 3, 3, 0, 2], [1, 2, 2, 0, 3, 0], [2, 1, 4, 0, 2, 0], [2, 0, 0, 0, 0, 5],
    [2, 0, 0, 0, 5, 3], [3, 0, 0, 0, 0, 6],
    [3, 3, 5, 3, 3, 0], [4, 0, 3, 0, 6, 3], [4, 0, 0, 0, 7, 0], [5, 0, 0, 0, 7, 3],
  ],
  red: [
    [0, 0, 3, 0, 0, 0], [0, 3, 1, 1, 0, 0], [0, 0, 0, 0, 2, 1], [0, 2, 2, 0, 0, 1],
    [0, 1, 2, 0, 1, 1], [0, 1, 1, 0, 1, 1], [0, 0, 2, 2, 0, 0], [1, 0, 4, 0, 0, 0],
    [1, 3, 0, 2, 3, 0], [1, 3, 2, 2, 0, 0], [2, 0, 1, 0, 4, 2], [2, 5, 3, 0, 0, 0],
    [2, 5, 0, 0, 0, 0], [3, 0, 0, 6, 0, 0],
    [3, 3, 3, 0, 5, 3], [4, 0, 0, 0, 0, 7], [4, 0, 0, 3, 3, 6], [5, 0, 0, 3, 0, 7],
  ],
  white: [
    [0, 1, 0, 0, 2, 2], [0, 1, 0, 2, 0, 0], [0, 1, 0, 1, 1, 1], [0, 0, 0, 0, 3, 0],
    [0, 0, 0, 0, 2, 2], [0, 1, 0, 1, 1, 2], [0, 1, 3, 0, 1, 0], [1, 0, 0, 0, 0, 4],
    [1, 2, 0, 2, 0, 3], [1, 0, 2, 3, 3, 0], [2, 2, 0, 4, 0, 1], [2, 0, 0, 5, 0, 0],
    [2, 3, 0, 5, 0, 0], [3, 0, 6, 0, 0, 0],
    [3, 3, 0, 5, 3, 3], [4, 7, 0, 0, 0, 0], [4, 6, 3, 3, 0, 0], [5, 7, 3, 0, 0, 0],
  ],
};

export const NOBLES = [
  noble("medici", { white: 3, blue: 3, black: 3 }),
  noble("isabella", { white: 3, blue: 3, green: 3 }),
  noble("charles", { blue: 3, green: 3, red: 3 }),
  noble("catherine", { green: 3, red: 3, black: 3 }),
  noble("suleiman", { white: 3, red: 3, black: 3 }),
  noble("machiavelli", { white: 4, black: 4 }),
  noble("elizabeth", { white: 4, blue: 4 }),
  noble("henry", { blue: 4, green: 4 }),
  noble("anne", { green: 4, red: 4 }),
  noble("francis", { red: 4, black: 4 }),
];

function noble(id, requirements) {
  return { id, name: id[0].toUpperCase() + id.slice(1), points: 3, requirements };
}

export { shuffled };

export function createDevelopmentDecks(rng = Math.random) {
  const decks = { 1: [], 2: [], 3: [] };
  const dataColors = ["black", "white", "red", "blue", "green"];
  for (const bonus of GEM_COLORS) {
    CLASSIC_CARD_DATA[bonus].forEach((row, index) => {
      const level = index < 8 ? 1 : index < 14 ? 2 : 3;
      const cost = {};
      dataColors.forEach((color, colorIndex) => { if (row[colorIndex + 1]) cost[color] = row[colorIndex + 1]; });
      decks[level].push({ id: `l${level}-${bonus}-${index + 1}`, level, bonus, points: row[0], cost });
    });
  }
  for (const level of [1, 2, 3]) decks[level] = shuffled(decks[level], rng);
  return decks;
}

function emptyColorCounts() {
  return Object.fromEntries(GEM_COLORS.map((color) => [color, 0]));
}

function makePlayer(player, color, isComputer = false) {
  return {
    id: player.id,
    name: String(player.name || (isComputer ? "Computer" : "Merchant")).trim().slice(0, 24) || "Merchant",
    color,
    isComputer,
    tokens: { ...emptyColorCounts(), gold: 0 },
    bonuses: emptyColorCounts(),
    developments: [],
    reserved: [],
    nobles: [],
    score: 0,
  };
}

export function createLobby(host, roomCode, now = Date.now()) {
  const first = makePlayer(host, PLAYER_COLORS[0]);
  return {
    game: "splendor",
    roomCode: String(roomCode || "").toUpperCase(),
    hostId: first.id,
    phase: "lobby",
    players: [first],
    bank: { ...emptyColorCounts(), gold: 5 },
    decks: { 1: [], 2: [], 3: [] },
    market: { 1: [], 2: [], 3: [] },
    nobles: [],
    currentPlayerIndex: 0,
    pendingReturn: null,
    pendingNoble: null,
    finalRoundTriggeredBy: null,
    turnNumber: 0,
    winners: [],
    log: [`${first.name} opened the trading house.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= 4 || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player, PLAYER_COLORS[game.players.length]);
  return { ...game, players: [...game.players, nextPlayer], log: [`${nextPlayer.name} joined the room.`, ...game.log] };
}

export function addComputerPlayer(game, overrides = {}) {
  if (game.phase !== "lobby" || game.players.length >= 4) return game;
  const usedNames = new Set(game.players.map((player) => player.name));
  const name = overrides.name || COMPUTER_NAMES.find((candidate) => !usedNames.has(candidate)) || `Computer ${game.players.length}`;
  const id = overrides.id || `bot-${Date.now()}-${game.players.length}`;
  const bot = makePlayer({ id, name }, PLAYER_COLORS[game.players.length], true);
  return { ...game, players: [...game.players, bot], log: [`${bot.name} took a seat.`, ...game.log] };
}

export function removeComputerPlayer(game, computerId) {
  if (game.phase !== "lobby") return game;
  const computer = game.players.find((player) => player.id === computerId && player.isComputer);
  if (!computer) return game;
  const players = game.players.filter((player) => player.id !== computerId).map((player, index) => ({ ...player, color: PLAYER_COLORS[index] }));
  return { ...game, players, log: [`${computer.name} left the table.`, ...game.log] };
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby" || game.players.length < 2 || game.players.length > 4) return game;
  const decks = createDevelopmentDecks(rng);
  const market = { 1: decks[1].splice(0, 4), 2: decks[2].splice(0, 4), 3: decks[3].splice(0, 4) };
  const coloredTokens = game.players.length === 2 ? 4 : game.players.length === 3 ? 5 : 7;
  const bank = { ...Object.fromEntries(GEM_COLORS.map((color) => [color, coloredTokens])), gold: 5 };
  const nobles = shuffled(NOBLES, rng).slice(0, game.players.length + 1);
  const startingPlayerIndex = Math.floor(rng() * game.players.length);
  return {
    ...game,
    phase: "playing",
    players: game.players.map((player) => ({ ...makePlayer(player, player.color, player.isComputer) })),
    decks,
    market,
    nobles,
    bank,
    startingPlayerIndex,
    currentPlayerIndex: startingPlayerIndex,
    turnNumber: 1,
    log: [`The market is open. ${game.players[startingPlayerIndex].name} goes first.`, ...game.log],
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function tokenCount(player) {
  return [...GEM_COLORS, "gold"].reduce((total, color) => total + Number(player.tokens[color] || 0), 0);
}

function canAct(game, playerId) {
  return game.phase === "playing" && currentPlayer(game)?.id === playerId && !game.pendingReturn && !game.pendingNoble;
}

function withTokensTaken(game, playerId, taken, message) {
  const amount = Object.values(taken).reduce((total, count) => total + count, 0);
  const players = game.players.map((player) => player.id === playerId ? {
    ...player,
    tokens: Object.fromEntries(Object.entries(player.tokens).map(([color, count]) => [color, count + Number(taken[color] || 0)])),
  } : player);
  const bank = Object.fromEntries(Object.entries(game.bank).map(([color, count]) => [color, count - Number(taken[color] || 0)]));
  const next = { ...game, players, bank, log: [message, ...game.log].slice(0, 60) };
  const player = players.find((item) => item.id === playerId);
  const excess = tokenCount(player) - 10;
  if (excess > 0) return { ...next, pendingReturn: { playerId, count: excess } };
  return endAction(next, playerId, amount);
}

export function takeDifferentTokens(game, playerId, colors) {
  if (!canAct(game, playerId) || !Array.isArray(colors)) return game;
  const selected = [...new Set(colors)];
  const available = GEM_COLORS.filter((color) => game.bank[color] > 0);
  const required = Math.min(3, available.length);
  if (selected.length !== required || selected.some((color) => !available.includes(color))) return game;
  const taken = Object.fromEntries(selected.map((color) => [color, 1]));
  return withTokensTaken(game, playerId, taken, `${currentPlayer(game).name} took ${selected.map((color) => GEM_INFO[color].name.toLowerCase()).join(", ")}.`);
}

export function takePairTokens(game, playerId, color) {
  if (!canAct(game, playerId) || !GEM_COLORS.includes(color) || game.bank[color] < 4) return game;
  return withTokensTaken(game, playerId, { [color]: 2 }, `${currentPlayer(game).name} took two ${GEM_INFO[color].name.toLowerCase()}s.`);
}

function refillMarket(game, level, market) {
  const deck = game.decks[level];
  if (!deck.length) return { decks: game.decks, market };
  return {
    decks: { ...game.decks, [level]: deck.slice(1) },
    market: { ...market, [level]: [...market[level], deck[0]] },
  };
}

export function reserveCard(game, playerId, source) {
  if (!canAct(game, playerId)) return game;
  const player = currentPlayer(game);
  if (player.reserved.length >= 3) return game;
  const level = Number(source?.level);
  if (![1, 2, 3].includes(level)) return game;
  let card;
  let decks = game.decks;
  let market = game.market;
  if (source?.kind === "deck") {
    card = decks[level]?.[0];
    if (!card) return game;
    decks = { ...decks, [level]: decks[level].slice(1) };
  } else {
    const index = Number(source?.index);
    card = market[level]?.[index];
    if (!card) return game;
    market = { ...market, [level]: market[level].filter((_, itemIndex) => itemIndex !== index) };
    const refilled = refillMarket({ ...game, decks }, level, market);
    decks = refilled.decks;
    market = refilled.market;
  }
  const gold = game.bank.gold > 0 ? 1 : 0;
  const players = game.players.map((item) => item.id === playerId ? {
    ...item,
    reserved: [...item.reserved, card],
    tokens: { ...item.tokens, gold: item.tokens.gold + gold },
  } : item);
  const next = {
    ...game,
    decks,
    market,
    bank: { ...game.bank, gold: game.bank.gold - gold },
    players,
    log: [`${player.name} reserved a level ${level} development${gold ? " and took gold" : ""}.`, ...game.log].slice(0, 60),
  };
  const excess = tokenCount(players.find((item) => item.id === playerId)) - 10;
  if (excess > 0) return { ...next, pendingReturn: { playerId, count: excess } };
  return endAction(next, playerId);
}

export function paymentForCard(player, card) {
  const colored = {};
  let gold = 0;
  for (const color of GEM_COLORS) {
    const remainingCost = Math.max(0, Number(card.cost[color] || 0) - Number(player.bonuses[color] || 0));
    colored[color] = Math.min(remainingCost, Number(player.tokens[color] || 0));
    gold += remainingCost - colored[color];
  }
  return { colored, gold, affordable: gold <= player.tokens.gold };
}

export function canPurchase(player, card) {
  return Boolean(card && paymentForCard(player, card).affordable);
}

export function purchaseCard(game, playerId, source) {
  if (!canAct(game, playerId)) return game;
  const player = currentPlayer(game);
  const kind = source?.kind;
  const level = Number(source?.level);
  const index = Number(source?.index);
  const collection = kind === "reserved" ? player.reserved : game.market[level];
  const card = collection?.[index];
  if (!card || (kind !== "reserved" && ![1, 2, 3].includes(level))) return game;
  const payment = paymentForCard(player, card);
  if (!payment.affordable) return game;
  const tokens = { ...player.tokens, gold: player.tokens.gold - payment.gold };
  const bank = { ...game.bank, gold: game.bank.gold + payment.gold };
  for (const color of GEM_COLORS) {
    tokens[color] -= payment.colored[color];
    bank[color] += payment.colored[color];
  }
  let market = game.market;
  let decks = game.decks;
  if (kind !== "reserved") {
    market = { ...market, [level]: market[level].filter((_, itemIndex) => itemIndex !== index) };
    const refilled = refillMarket({ ...game, decks }, level, market);
    market = refilled.market;
    decks = refilled.decks;
  }
  const players = game.players.map((item) => item.id === playerId ? {
    ...item,
    tokens,
    bonuses: { ...item.bonuses, [card.bonus]: item.bonuses[card.bonus] + 1 },
    developments: [...item.developments, card],
    reserved: kind === "reserved" ? item.reserved.filter((_, itemIndex) => itemIndex !== index) : item.reserved,
    score: item.score + card.points,
  } : item);
  const next = {
    ...game,
    decks,
    market,
    bank,
    players,
    log: [`${player.name} purchased a ${GEM_INFO[card.bonus].name.toLowerCase()} development${card.points ? ` worth ${card.points} prestige` : ""}.`, ...game.log].slice(0, 60),
  };
  return endAction(next, playerId);
}

export function returnTokens(game, playerId, returned) {
  if (game.phase !== "playing" || game.pendingReturn?.playerId !== playerId) return game;
  const player = game.players.find((item) => item.id === playerId);
  const normalized = Object.fromEntries([...GEM_COLORS, "gold"].map((color) => [color, Math.max(0, Math.floor(Number(returned?.[color] || 0)))]));
  const total = Object.values(normalized).reduce((sum, count) => sum + count, 0);
  if (total !== game.pendingReturn.count || Object.entries(normalized).some(([color, count]) => count > player.tokens[color])) return game;
  const players = game.players.map((item) => item.id === playerId ? {
    ...item,
    tokens: Object.fromEntries(Object.entries(item.tokens).map(([color, count]) => [color, count - normalized[color]])),
  } : item);
  const bank = Object.fromEntries(Object.entries(game.bank).map(([color, count]) => [color, count + normalized[color]]));
  return endAction({ ...game, players, bank, pendingReturn: null, log: [`${player.name} returned ${total} token${total === 1 ? "" : "s"} to the supply.`, ...game.log] }, playerId);
}

function eligibleNobles(game, playerId) {
  const player = game.players.find((item) => item.id === playerId);
  return game.nobles.filter((nobleTile) => Object.entries(nobleTile.requirements).every(([color, amount]) => player.bonuses[color] >= amount));
}

function endAction(game, playerId) {
  const eligible = eligibleNobles(game, playerId);
  if (eligible.length > 1) return { ...game, pendingNoble: { playerId, nobleIds: eligible.map((nobleTile) => nobleTile.id) } };
  if (eligible.length === 1) return finishTurn(awardNoble(game, playerId, eligible[0].id, false), playerId);
  return finishTurn(game, playerId);
}

function awardNoble(game, playerId, nobleId, addLog = true) {
  const nobleTile = game.nobles.find((item) => item.id === nobleId);
  if (!nobleTile) return game;
  const player = game.players.find((item) => item.id === playerId);
  return {
    ...game,
    nobles: game.nobles.filter((item) => item.id !== nobleId),
    players: game.players.map((item) => item.id === playerId ? { ...item, nobles: [...item.nobles, nobleTile], score: item.score + nobleTile.points } : item),
    pendingNoble: null,
    log: addLog ? [`${nobleTile.name} visited ${player.name}, granting 3 prestige.`, ...game.log].slice(0, 60) : [`${nobleTile.name} visited ${player.name}, granting 3 prestige.`, ...game.log].slice(0, 60),
  };
}

export function chooseNoble(game, playerId, nobleId) {
  if (game.pendingNoble?.playerId !== playerId || !game.pendingNoble.nobleIds.includes(nobleId)) return game;
  return finishTurn(awardNoble(game, playerId, nobleId), playerId);
}

function finishTurn(game, playerId) {
  if (currentPlayer(game)?.id !== playerId) return game;
  const player = game.players.find((item) => item.id === playerId);
  const isLastSeat = (game.currentPlayerIndex + 1) % game.players.length === (game.startingPlayerIndex ?? 0);
  const finalRoundTriggeredBy = game.finalRoundTriggeredBy || (player.score >= 15 ? playerId : null);
  if (finalRoundTriggeredBy && isLastSeat) return finishGame({ ...game, finalRoundTriggeredBy });
  return {
    ...game,
    finalRoundTriggeredBy,
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
    turnNumber: game.turnNumber + 1,
  };
}

export function finishGame(game) {
  const ranked = [...game.players].sort((first, second) => second.score - first.score || first.developments.length - second.developments.length);
  const best = ranked[0];
  const winners = ranked.filter((player) => player.score === best.score && player.developments.length === best.developments.length).map((player) => player.id);
  return { ...game, phase: "finished", winners, pendingNoble: null, pendingReturn: null, log: [`The trading day is complete. ${ranked.filter((player) => winners.includes(player.id)).map((player) => player.name).join(" and ")} ${winners.length === 1 ? "wins" : "share the victory"}!`, ...game.log] };
}

function desiredCard(game, player) {
  const candidates = [
    ...player.reserved.map((card) => ({ card, reserved: true })),
    ...[3, 2, 1].flatMap((level) => game.market[level].map((card) => ({ card, reserved: false }))),
  ];
  return candidates.sort((a, b) => cardValue(b.card, player) - cardValue(a.card, player))[0]?.card ?? null;
}

function cardValue(card, player) {
  const payment = paymentForCard(player, card);
  const missing = payment.gold;
  return card.points * 12 + card.level * 2 + (player.bonuses[card.bonus] < 3 ? 3 : 0) - missing * 2;
}

export function runComputerTurn(game, rng = Math.random) {
  const bot = currentPlayer(game);
  if (game.phase !== "playing" || !bot?.isComputer) return game;
  if (game.pendingNoble?.playerId === bot.id) return chooseNoble(game, bot.id, game.pendingNoble.nobleIds[0]);
  if (game.pendingReturn?.playerId === bot.id) {
    let remaining = game.pendingReturn.count;
    const returned = Object.fromEntries([...GEM_COLORS, "gold"].map((color) => [color, 0]));
    const target = desiredCard(game, bot);
    const order = GEM_COLORS.slice().sort((a, b) => Number(target?.cost[a] || 0) - Number(target?.cost[b] || 0));
    for (const color of [...order, "gold"]) {
      const amount = Math.min(remaining, bot.tokens[color]);
      returned[color] = amount;
      remaining -= amount;
      if (!remaining) break;
    }
    return returnTokens(game, bot.id, returned);
  }

  const purchases = [
    ...bot.reserved.map((card, index) => ({ card, source: { kind: "reserved", index } })),
    ...[3, 2, 1].flatMap((level) => game.market[level].map((card, index) => ({ card, source: { kind: "market", level, index } }))),
  ].filter(({ card }) => canPurchase(bot, card)).sort((a, b) => cardValue(b.card, bot) - cardValue(a.card, bot));
  if (purchases.length) return purchaseCard(game, bot.id, purchases[0].source);

  const target = desiredCard(game, bot);
  const deficits = GEM_COLORS.map((color) => ({
    color,
    amount: Math.max(0, Number(target?.cost[color] || 0) - bot.bonuses[color] - bot.tokens[color]),
  })).sort((a, b) => b.amount - a.amount || game.bank[b.color] - game.bank[a.color]);

  const pair = deficits.find(({ color, amount }) => amount >= 2 && game.bank[color] >= 4);
  if (pair) return takePairTokens(game, bot.id, pair.color);

  const available = deficits.filter(({ color }) => game.bank[color] > 0).slice(0, Math.min(3, GEM_COLORS.filter((color) => game.bank[color] > 0).length)).map(({ color }) => color);
  if (available.length) return takeDifferentTokens(game, bot.id, available);

  if (bot.reserved.length < 3) {
    const highCard = [3, 2, 1].flatMap((level) => game.market[level].map((card, index) => ({ card, level, index }))).sort((a, b) => cardValue(b.card, bot) - cardValue(a.card, bot))[0];
    if (highCard) return reserveCard(game, bot.id, { kind: "market", level: highCard.level, index: highCard.index });
  }
  return game;
}
