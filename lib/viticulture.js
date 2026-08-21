export const PLAYER_COLORS = ["#a84d3f", "#2f6f70", "#d3a33f", "#506c3d", "#4e5e91", "#9a5a78"];

export const BUILDINGS = {
  trellis: { id: "trellis", name: "Trellis", cost: 2, note: "Required by climbing vines." },
  irrigation: { id: "irrigation", name: "Irrigation", cost: 3, note: "Required by thirsty vines." },
  yoke: { id: "yoke", name: "Yoke", cost: 2, note: "Earn 1 coin whenever you harvest." },
  cottage: { id: "cottage", name: "Cottage", cost: 4, note: "Draw both visitor colors in autumn, then keep one." },
  windmill: { id: "windmill", name: "Windmill", cost: 5, note: "Gain 1 VP when you plant, once each year." },
  tastingRoom: { id: "tastingRoom", name: "Tasting Room", cost: 6, note: "Gain 1 VP when giving a tour if you have wine." },
  cellar: { id: "cellar", name: "Medium Cellar", cost: 4, note: "Make wine up to value 6, including rosé." },
  largeCellar: { id: "largeCellar", name: "Large Cellar", cost: 6, note: "Make wine up to value 9, including sparkling." },
};

export const ACTION_SPACES = [
  { id: "draw-vine", season: "summer", name: "Draw vine", detail: "Draw 1 vine card", bonus: "Draw 1 extra" },
  { id: "tour", season: "summer", name: "Give tour", detail: "Gain 2 coins", bonus: "+1 coin" },
  { id: "build", season: "summer", name: "Build structure", detail: "Pay to improve your estate", bonus: "1 coin discount" },
  { id: "plant", season: "summer", name: "Plant vine", detail: "Plant a vine card in a field", bonus: "+1 coin" },
  { id: "sell-grape", season: "summer", name: "Sell grape", detail: "Sell one grape for coins", bonus: "+1 VP" },
  { id: "play-summer", season: "summer", name: "Host summer visitor", detail: "Play a yellow visitor", bonus: "+1 coin" },
  { id: "draw-order", season: "winter", name: "Draw order", detail: "Draw 1 wine order", bonus: "Draw 1 extra" },
  { id: "harvest", season: "winter", name: "Harvest field", detail: "Turn vines into grapes", bonus: "+1 coin" },
  { id: "make-wine", season: "winter", name: "Make wine", detail: "Crush grapes into wine", bonus: "+1 coin" },
  { id: "fill-order", season: "winter", name: "Fill wine order", detail: "Ship wine for VP and income", bonus: "+1 VP" },
  { id: "train-worker", season: "winter", name: "Train worker", detail: "Pay 4 coins for a worker", bonus: "1 coin discount" },
  { id: "play-winter", season: "winter", name: "Host winter visitor", detail: "Play a blue visitor", bonus: "+1 coin" },
];

const COMPUTER_NAMES = ["Luca", "Bianca", "Enzo", "Sofia", "Matteo"];
const FIELD_CAPACITIES = [5, 6, 7];

const VINE_LIBRARY = [
  vine("sangiovese", "Sangiovese", 2, 0), vine("pinot-grigio", "Pinot Grigio", 0, 2),
  vine("merlot", "Merlot", 3, 0, "trellis"), vine("vermentino", "Vermentino", 0, 3, "irrigation"),
  vine("nebbiolo", "Nebbiolo", 4, 0, "irrigation"), vine("malvasia", "Malvasia", 0, 4, "trellis"),
  vine("super-tuscan", "Super Tuscan", 2, 1, "trellis"), vine("vernaccia", "Vernaccia", 1, 2, "irrigation"),
  vine("barbera", "Barbera", 1, 1), vine("trebbiano", "Trebbiano", 0, 1),
  vine("cabernet", "Cabernet", 3, 1, "irrigation"), vine("moscato", "Moscato", 1, 3, "trellis"),
];

const ORDER_LIBRARY = [
  order("cellar-red", "Cellar Red", [{ type: "red", min: 3 }], 2, 1),
  order("bright-white", "Bright White", [{ type: "white", min: 3 }], 2, 1),
  order("estate-pair", "Estate Pair", [{ type: "red", min: 4 }, { type: "white", min: 2 }], 3, 1),
  order("hill-country", "Hill Country", [{ type: "red", min: 5 }, { type: "white", min: 4 }], 4, 2),
  order("rose-table", "Rosé Table", [{ type: "rose", min: 4 }], 3, 1),
  order("reserve-rose", "Reserve Rosé", [{ type: "rose", min: 6 }], 4, 2),
  order("sparkling-toast", "Sparkling Toast", [{ type: "sparkling", min: 7 }], 5, 2),
  order("grand-cellar", "Grand Cellar", [{ type: "red", min: 6 }, { type: "white", min: 6 }], 5, 2),
  order("terrace-selection", "Terrace Selection", [{ type: "red", min: 7 }, { type: "rose", min: 5 }], 6, 3),
  order("festival-case", "Festival Case", [{ type: "white", min: 5 }, { type: "sparkling", min: 8 }], 6, 3),
];

const SUMMER_VISITORS = [
  visitor("surveyor", "Surveyor", "summer", "Gain 2 coins.", "coins"),
  visitor("botanist", "Botanist", "summer", "Draw 2 vine cards.", "vines"),
  visitor("merchant", "Merchant", "summer", "Gain 1 coin and draw an order.", "merchant"),
  visitor("promoter", "Promoter", "summer", "Pay 1 coin to gain 1 VP.", "promoter"),
  visitor("caretaker", "Caretaker", "summer", "Gain 1 coin for each planted field, up to 3.", "caretaker"),
  visitor("architect", "Architect", "summer", "Gain 2 coins if you own at least 3 structures.", "architect"),
];

const WINTER_VISITORS = [
  visitor("broker", "Broker", "winter", "Gain 2 coins.", "coins"),
  visitor("critic", "Critic", "winter", "Gain 1 VP if your cellar holds wine.", "critic"),
  visitor("steward", "Steward", "winter", "Train a worker for 2 coins, if possible.", "steward"),
  visitor("sommelier", "Sommelier", "winter", "Age every wine once.", "sommelier"),
  visitor("cooper", "Cooper", "winter", "Gain 1 coin for each cellar you own.", "cooper"),
  visitor("innkeeper", "Innkeeper", "winter", "Draw a summer visitor and gain 1 coin.", "innkeeper"),
];

function vine(id, name, red, white, requirement = null) { return { id, name, red, white, requirement }; }
function order(id, name, requirements, vp, income) { return { id, name, requirements, vp, income }; }
function visitor(id, name, season, text, effect) { return { id, name, season, text, effect }; }

export function shuffled(items, rng = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function makeDeck(library, copies, rng) {
  return shuffled(Array.from({ length: copies }, (_, copy) => library.map((card) => ({ ...card, uid: `${card.id}-${copy + 1}` }))).flat(), rng);
}

function makePlayer(player, color, isComputer = false) {
  return {
    id: player.id,
    name: String(player.name || (isComputer ? "Computer" : "Vintner")).trim().slice(0, 24) || "Vintner",
    color,
    isComputer,
    coins: 5,
    score: 0,
    residualIncome: 0,
    regularWorkers: 2,
    regularAvailable: 2,
    grandeAvailable: true,
    temporaryWorker: false,
    wakeRow: null,
    structures: [],
    fields: FIELD_CAPACITIES.map((capacity) => ({ id: `field-${capacity}`, capacity, vines: [] })),
    grapes: { red: [], white: [] },
    wines: { red: [], white: [], rose: [], sparkling: [] },
    cards: { vines: [], orders: [], summer: [], winter: [] },
    windmillScoredYear: 0,
  };
}

export function createLobby(host, roomCode, now = Date.now()) {
  const first = makePlayer(host, PLAYER_COLORS[0]);
  return {
    game: "viticulture",
    roomCode: String(roomCode || "").toUpperCase(),
    hostId: first.id,
    phase: "lobby",
    season: "spring",
    year: 0,
    players: [first],
    decks: { vines: [], orders: [], summer: [], winter: [] },
    discard: { vines: [], orders: [], summer: [], winter: [] },
    placements: {},
    wakeChoices: {},
    turnOrder: [],
    turnCursor: 0,
    passedSeason: [],
    startingPlayerId: first.id,
    winners: [],
    log: [`${first.name} opened the estate.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= 6 || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player, PLAYER_COLORS[game.players.length]);
  return { ...game, players: [...game.players, nextPlayer], log: [`${nextPlayer.name} arrived at the estate.`, ...game.log] };
}

export function addComputerPlayer(game, overrides = {}) {
  if (game.phase !== "lobby" || game.players.length >= 6) return game;
  const usedNames = new Set(game.players.map((player) => player.name));
  const name = overrides.name || COMPUTER_NAMES.find((candidate) => !usedNames.has(candidate)) || `Vintner ${game.players.length}`;
  const id = overrides.id || `bot-${Date.now()}-${game.players.length}`;
  const bot = makePlayer({ id, name }, PLAYER_COLORS[game.players.length], true);
  return { ...game, players: [...game.players, bot], log: [`${bot.name} joined the vintage.`, ...game.log] };
}

export function removeComputerPlayer(game, computerId) {
  if (game.phase !== "lobby") return game;
  const computer = game.players.find((player) => player.id === computerId && player.isComputer);
  if (!computer) return game;
  const players = game.players.filter((player) => player.id !== computerId).map((player, index) => ({ ...player, color: PLAYER_COLORS[index] }));
  return { ...game, players, log: [`${computer.name} left the estate.`, ...game.log] };
}

function drawFrom(game, deckName, count) {
  const cards = game.decks[deckName].slice(0, count);
  return { cards, decks: { ...game.decks, [deckName]: game.decks[deckName].slice(cards.length) } };
}

function dealStartingHands(game) {
  let next = game;
  const players = [];
  for (const player of game.players) {
    const vines = drawFrom(next, "vines", 3); next = { ...next, decks: vines.decks };
    const orders = drawFrom(next, "orders", 1); next = { ...next, decks: orders.decks };
    const summer = drawFrom(next, "summer", 1); next = { ...next, decks: summer.decks };
    const winter = drawFrom(next, "winter", 1); next = { ...next, decks: winter.decks };
    players.push({ ...makePlayer(player, player.color, player.isComputer), cards: { vines: vines.cards, orders: orders.cards, summer: summer.cards, winter: winter.cards } });
  }
  return { ...next, players };
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby" || game.players.length < 2 || game.players.length > 6) return game;
  const startingPlayerIndex = Math.floor(rng() * game.players.length);
  let next = {
    ...game,
    phase: "playing",
    season: "spring",
    year: 1,
    decks: {
      vines: makeDeck(VINE_LIBRARY, 3, rng),
      orders: makeDeck(ORDER_LIBRARY, 3, rng),
      summer: makeDeck(SUMMER_VISITORS, 4, rng),
      winter: makeDeck(WINTER_VISITORS, 4, rng),
    },
    startingPlayerId: game.players[startingPlayerIndex].id,
    turnOrder: rotateIds(game.players, startingPlayerIndex),
    turnCursor: 0,
    wakeChoices: {},
    placements: {},
    passedSeason: [],
    log: [`Year 1 begins. Choose a wake-up time.`, ...game.log],
  };
  return dealStartingHands(next);
}

function rotateIds(players, startIndex) {
  return Array.from({ length: players.length }, (_, offset) => players[(startIndex + offset) % players.length].id);
}

export function currentPlayer(game) {
  const id = game.turnOrder?.[game.turnCursor];
  return game.players.find((player) => player.id === id) ?? null;
}

function updatePlayer(game, playerId, updater) {
  return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) };
}

function addCards(game, playerId, deckName, count) {
  const drawn = drawFrom(game, deckName, count);
  return updatePlayer({ ...game, decks: drawn.decks }, playerId, (player) => ({
    ...player,
    cards: { ...player.cards, [deckName]: [...player.cards[deckName], ...drawn.cards] },
  }));
}

export function chooseWakeUp(game, playerId, row) {
  const numericRow = Number(row);
  if (game.phase !== "playing" || game.season !== "spring" || currentPlayer(game)?.id !== playerId) return game;
  if (numericRow < 1 || numericRow > 7 || Object.values(game.wakeChoices).includes(numericRow)) return game;
  const player = currentPlayer(game);
  let next = updatePlayer({ ...game, wakeChoices: { ...game.wakeChoices, [playerId]: numericRow } }, playerId, (item) => ({ ...item, wakeRow: numericRow }));
  next = applyWakeBonus(next, playerId, numericRow);
  const remaining = next.turnOrder.filter((id) => !next.wakeChoices[id]);
  if (remaining.length) {
    const nextIndex = next.turnOrder.findIndex((id) => id === remaining[0]);
    return { ...next, turnCursor: nextIndex, log: [`${player.name} chose row ${numericRow}.`, ...next.log].slice(0, 80) };
  }
  const turnOrder = [...next.players].sort((a, b) => a.wakeRow - b.wakeRow).map((item) => item.id);
  return { ...next, season: "summer", turnOrder, turnCursor: 0, passedSeason: [], log: [`Summer begins. ${next.players.find((item) => item.id === turnOrder[0]).name} acts first.`, `${player.name} chose row ${numericRow}.`, ...next.log].slice(0, 80) };
}

function applyWakeBonus(game, playerId, row) {
  if (row === 2) return addCards(game, playerId, "vines", 1);
  if (row === 3) return updatePlayer(game, playerId, (player) => ({ ...player, coins: player.coins + 1 }));
  if (row === 4) return addCards(game, playerId, "orders", 1);
  if (row === 5) return updatePlayer(game, playerId, (player) => ({ ...player, regularAvailable: player.regularAvailable + 1, temporaryWorker: true }));
  if (row === 6) return updatePlayer(game, playerId, (player) => ({ ...player, score: player.score + 1 }));
  if (row === 7) return updatePlayer({ ...game, startingPlayerId: playerId }, playerId, (player) => ({ ...player, coins: player.coins + 1 }));
  return game;
}

export function actionCapacity(playerCount) {
  return playerCount <= 2 ? 1 : playerCount <= 4 ? 2 : 3;
}

export function canUseAction(game, playerId, actionId, workerType = "regular") {
  const action = ACTION_SPACES.find((item) => item.id === actionId);
  const player = game.players.find((item) => item.id === playerId);
  if (!action || !player || game.phase !== "playing" || action.season !== game.season || currentPlayer(game)?.id !== playerId) return false;
  if (game.passedSeason.includes(playerId)) return false;
  if (workerType === "grande") return player.grandeAvailable;
  if (player.regularAvailable < 1) return false;
  return (game.placements[actionId] || []).filter((placement) => placement.workerType !== "grande").length < actionCapacity(game.players.length);
}

function placeWorker(game, playerId, actionId, workerType) {
  const placements = game.placements[actionId] || [];
  const capacity = actionCapacity(game.players.length);
  const bonus = placements.filter((placement) => placement.workerType !== "grande").length === 0 && placements.length < capacity;
  const next = updatePlayer(game, playerId, (player) => workerType === "grande"
    ? { ...player, grandeAvailable: false }
    : { ...player, regularAvailable: player.regularAvailable - 1 });
  return { game: { ...next, placements: { ...next.placements, [actionId]: [...placements, { playerId, workerType, bonus }] } }, bonus };
}

function fieldTotal(field) { return field.vines.reduce((sum, card) => sum + card.red + card.white, 0); }
function owns(player, buildingId) { return player.structures.includes(buildingId); }
function hasAnyWine(player) { return Object.values(player.wines).some((track) => track.length > 0); }

export function canPlant(player, card, field) {
  return Boolean(card && field && (!card.requirement || owns(player, card.requirement)) && fieldTotal(field) + card.red + card.white <= field.capacity);
}

function resolveAction(game, playerId, actionId, payload, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  if (actionId === "draw-vine") return { game: addCards(game, playerId, "vines", bonus ? 2 : 1), message: `drew ${bonus ? 2 : 1} vine cards` };
  if (actionId === "tour") {
    const vp = owns(player, "tastingRoom") && hasAnyWine(player) ? 1 : 0;
    return { game: updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + 2 + (bonus ? 1 : 0), score: item.score + vp })), message: `gave a tour for ${2 + (bonus ? 1 : 0)} coins${vp ? " and 1 VP" : ""}` };
  }
  if (actionId === "build") return resolveBuild(game, playerId, payload?.buildingId, bonus);
  if (actionId === "plant") return resolvePlant(game, playerId, payload?.cardId, payload?.fieldId, bonus);
  if (actionId === "sell-grape") return resolveSellGrape(game, playerId, payload?.grapeType, bonus);
  if (actionId === "play-summer") return resolveVisitor(game, playerId, payload?.cardId, "summer", bonus);
  if (actionId === "draw-order") return { game: addCards(game, playerId, "orders", bonus ? 2 : 1), message: `drew ${bonus ? 2 : 1} wine orders` };
  if (actionId === "harvest") return resolveHarvest(game, playerId, payload?.fieldId, bonus);
  if (actionId === "make-wine") return resolveMakeWine(game, playerId, payload?.optionId, bonus);
  if (actionId === "fill-order") return resolveFillOrder(game, playerId, payload?.orderId, bonus);
  if (actionId === "train-worker") return resolveTrainWorker(game, playerId, bonus);
  if (actionId === "play-winter") return resolveVisitor(game, playerId, payload?.cardId, "winter", bonus);
  return null;
}

function resolveBuild(game, playerId, buildingId, bonus) {
  const building = BUILDINGS[buildingId];
  const player = game.players.find((item) => item.id === playerId);
  if (!building || owns(player, buildingId) || (buildingId === "largeCellar" && !owns(player, "cellar"))) return null;
  const cost = Math.max(0, building.cost - (bonus ? 1 : 0));
  if (player.coins < cost) return null;
  return { game: updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins - cost, structures: [...item.structures, buildingId] })), message: `built ${building.name} for ${cost} coins` };
}

function resolvePlant(game, playerId, cardId, fieldId, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  const card = player.cards.vines.find((item) => item.uid === cardId);
  const field = player.fields.find((item) => item.id === fieldId);
  if (!canPlant(player, card, field)) return null;
  const windmillPoint = owns(player, "windmill") && player.windmillScoredYear !== game.year ? 1 : 0;
  return {
    game: updatePlayer(game, playerId, (item) => ({
      ...item,
      coins: item.coins + (bonus ? 1 : 0),
      score: item.score + windmillPoint,
      windmillScoredYear: windmillPoint ? game.year : item.windmillScoredYear,
      fields: item.fields.map((current) => current.id === fieldId ? { ...current, vines: [...current.vines, card] } : current),
      cards: { ...item.cards, vines: item.cards.vines.filter((current) => current.uid !== cardId) },
    })),
    message: `planted ${card.name}${windmillPoint ? " and gained 1 VP" : ""}`,
  };
}

function resolveSellGrape(game, playerId, grapeType, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  if (!["red", "white"].includes(grapeType) || !player.grapes[grapeType].length) return null;
  const value = Math.min(...player.grapes[grapeType]);
  return {
    game: updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + Math.min(4, value), score: item.score + (bonus ? 1 : 0), grapes: { ...item.grapes, [grapeType]: item.grapes[grapeType].filter((number) => number !== value) } })),
    message: `sold a value ${value} ${grapeType} grape for ${Math.min(4, value)} coins${bonus ? " and 1 VP" : ""}`,
  };
}

function placeTrackToken(track, target, max = 9) {
  let value = Math.min(max, target);
  while (value > 0 && track.includes(value)) value -= 1;
  return value > 0 ? [...track, value].sort((a, b) => a - b) : track;
}

function resolveHarvest(game, playerId, fieldId, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  const field = player.fields.find((item) => item.id === fieldId);
  if (!field?.vines.length) return null;
  const red = field.vines.reduce((sum, card) => sum + card.red, 0);
  const white = field.vines.reduce((sum, card) => sum + card.white, 0);
  const yokeCoin = owns(player, "yoke") ? 1 : 0;
  return {
    game: updatePlayer(game, playerId, (item) => ({
      ...item,
      coins: item.coins + yokeCoin + (bonus ? 1 : 0),
      grapes: {
        red: red ? placeTrackToken(item.grapes.red, red) : item.grapes.red,
        white: white ? placeTrackToken(item.grapes.white, white) : item.grapes.white,
      },
    })),
    message: `harvested the ${field.capacity}-value field${bonus || yokeCoin ? ` and gained ${bonus + yokeCoin} coin${bonus + yokeCoin === 1 ? "" : "s"}` : ""}`,
  };
}

export function wineOptions(player) {
  const max = owns(player, "largeCellar") ? 9 : owns(player, "cellar") ? 6 : 3;
  const options = [];
  for (const value of player.grapes.red) if (!player.wines.red.includes(Math.min(value, max))) options.push({ id: `red-${value}`, type: "red", label: `Red ${value}`, grapes: [{ type: "red", value }], value: Math.min(value, max) });
  for (const value of player.grapes.white) if (!player.wines.white.includes(Math.min(value, max))) options.push({ id: `white-${value}`, type: "white", label: `White ${value}`, grapes: [{ type: "white", value }], value: Math.min(value, max) });
  if (owns(player, "cellar")) {
    for (const red of player.grapes.red) for (const white of player.grapes.white) {
      const value = Math.min(max, red + white);
      if (!player.wines.rose.includes(value)) options.push({ id: `rose-${red}-${white}`, type: "rose", label: `Rosé ${value}`, grapes: [{ type: "red", value: red }, { type: "white", value: white }], value });
    }
  }
  if (owns(player, "largeCellar")) {
    for (let first = 0; first < player.grapes.red.length; first += 1) for (let second = first + 1; second < player.grapes.red.length; second += 1) for (const white of player.grapes.white) {
      const redA = player.grapes.red[first]; const redB = player.grapes.red[second];
      const value = Math.min(9, redA + redB + white);
      if (!player.wines.sparkling.includes(value)) options.push({ id: `sparkling-${redA}-${redB}-${white}`, type: "sparkling", label: `Sparkling ${value}`, grapes: [{ type: "red", value: redA }, { type: "red", value: redB }, { type: "white", value: white }], value });
    }
  }
  return options;
}

function resolveMakeWine(game, playerId, optionId, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  const option = wineOptions(player).find((item) => item.id === optionId);
  if (!option) return null;
  return {
    game: updatePlayer(game, playerId, (item) => {
      const grapes = { red: [...item.grapes.red], white: [...item.grapes.white] };
      for (const grape of option.grapes) grapes[grape.type].splice(grapes[grape.type].indexOf(grape.value), 1);
      return { ...item, coins: item.coins + (bonus ? 1 : 0), grapes, wines: { ...item.wines, [option.type]: placeTrackToken(item.wines[option.type], option.value, option.value) } };
    }),
    message: `made value ${option.value} ${option.type} wine${bonus ? " and gained 1 coin" : ""}`,
  };
}

export function canFillOrder(player, orderCard) {
  if (!orderCard) return false;
  return orderCard.requirements.every((requirement) => player.wines[requirement.type].some((value) => value >= requirement.min));
}

function resolveFillOrder(game, playerId, orderId, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  const orderCard = player.cards.orders.find((item) => item.uid === orderId);
  if (!canFillOrder(player, orderCard)) return null;
  return {
    game: updatePlayer(game, playerId, (item) => {
      const wines = Object.fromEntries(Object.entries(item.wines).map(([type, track]) => [type, [...track]]));
      for (const requirement of orderCard.requirements) {
        const used = wines[requirement.type].filter((value) => value >= requirement.min).sort((a, b) => a - b)[0];
        wines[requirement.type].splice(wines[requirement.type].indexOf(used), 1);
      }
      return { ...item, score: item.score + orderCard.vp + (bonus ? 1 : 0), residualIncome: Math.min(5, item.residualIncome + orderCard.income), wines, cards: { ...item.cards, orders: item.cards.orders.filter((card) => card.uid !== orderId) } };
    }),
    message: `filled ${orderCard.name} for ${orderCard.vp + (bonus ? 1 : 0)} VP and +${orderCard.income} income`,
  };
}

function resolveTrainWorker(game, playerId, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  const cost = 4 - (bonus ? 1 : 0);
  if (player.regularWorkers >= 5 || player.coins < cost) return null;
  return { game: updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins - cost, regularWorkers: item.regularWorkers + 1 })), message: `trained a worker for ${cost} coins` };
}

function resolveVisitor(game, playerId, cardId, season, bonus) {
  const player = game.players.find((item) => item.id === playerId);
  const card = player.cards[season].find((item) => item.uid === cardId);
  if (!card) return null;
  let next = updatePlayer(game, playerId, (item) => ({ ...item, cards: { ...item.cards, [season]: item.cards[season].filter((current) => current.uid !== cardId) } }));
  next = applyVisitorEffect(next, playerId, card.effect);
  if (bonus) next = updatePlayer(next, playerId, (item) => ({ ...item, coins: item.coins + 1 }));
  return { game: { ...next, discard: { ...next.discard, [season]: [...next.discard[season], card] } }, message: `hosted ${card.name}${bonus ? " and gained 1 coin" : ""}` };
}

function applyVisitorEffect(game, playerId, effect) {
  const player = game.players.find((item) => item.id === playerId);
  if (effect === "coins") return updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + 2 }));
  if (effect === "vines") return addCards(game, playerId, "vines", 2);
  if (effect === "merchant") return addCards(updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + 1 })), playerId, "orders", 1);
  if (effect === "promoter") return player.coins ? updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins - 1, score: item.score + 1 })) : game;
  if (effect === "caretaker") return updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + Math.min(3, item.fields.filter((field) => field.vines.length).length) }));
  if (effect === "architect") return player.structures.length >= 3 ? updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + 2 })) : game;
  if (effect === "critic") return hasAnyWine(player) ? updatePlayer(game, playerId, (item) => ({ ...item, score: item.score + 1 })) : game;
  if (effect === "steward") return player.coins >= 2 && player.regularWorkers < 5 ? updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins - 2, regularWorkers: item.regularWorkers + 1 })) : game;
  if (effect === "sommelier") return updatePlayer(game, playerId, (item) => ({ ...item, wines: ageTracks(item.wines) }));
  if (effect === "cooper") return updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + Number(owns(item, "cellar")) + Number(owns(item, "largeCellar")) }));
  if (effect === "innkeeper") return addCards(updatePlayer(game, playerId, (item) => ({ ...item, coins: item.coins + 1 })), playerId, "summer", 1);
  return game;
}

export function takeAction(game, playerId, actionId, payload = {}, workerType = "regular") {
  if (!canUseAction(game, playerId, actionId, workerType)) return game;
  const placed = placeWorker(game, playerId, actionId, workerType);
  const resolved = resolveAction(placed.game, playerId, actionId, payload, placed.bonus);
  if (!resolved) return game;
  const player = game.players.find((item) => item.id === playerId);
  const action = ACTION_SPACES.find((item) => item.id === actionId);
  return advanceTurn({ ...resolved.game, log: [`${player.name} ${resolved.message} at ${action.name}.`, ...resolved.game.log].slice(0, 80) });
}

function advanceTurn(game) {
  for (let offset = 1; offset <= game.turnOrder.length; offset += 1) {
    const cursor = (game.turnCursor + offset) % game.turnOrder.length;
    if (!game.passedSeason.includes(game.turnOrder[cursor])) return { ...game, turnCursor: cursor };
  }
  return game;
}

export function passSeason(game, playerId) {
  if (game.phase !== "playing" || !["summer", "winter"].includes(game.season) || currentPlayer(game)?.id !== playerId || game.passedSeason.includes(playerId)) return game;
  const player = currentPlayer(game);
  const passedSeason = [...game.passedSeason, playerId];
  let next = { ...game, passedSeason, log: [`${player.name} passed for the rest of ${game.season}.`, ...game.log].slice(0, 80) };
  if (passedSeason.length < game.players.length) return advanceTurn(next);
  if (game.season === "summer") return beginWinter(runAutumn(next));
  return endYear(next);
}

function runAutumn(game) {
  let next = game;
  for (const player of game.players) {
    if (owns(player, "cottage")) {
      const summer = drawFrom(next, "summer", 1); next = { ...next, decks: summer.decks };
      const winter = drawFrom(next, "winter", 1); next = { ...next, decks: winter.decks };
      const keepSummer = player.cards.summer.length <= player.cards.winter.length;
      next = updatePlayer(next, player.id, (item) => ({ ...item, cards: { ...item.cards, [keepSummer ? "summer" : "winter"]: [...item.cards[keepSummer ? "summer" : "winter"], ...(keepSummer ? summer.cards : winter.cards)] } }));
    } else {
      next = addCards(next, player.id, player.wakeRow % 2 ? "summer" : "winter", 1);
    }
  }
  return { ...next, log: ["Autumn visitors arrived at every estate.", ...next.log].slice(0, 80) };
}

function beginWinter(game) {
  return { ...game, season: "winter", passedSeason: [], turnCursor: 0, log: [`Winter begins. ${game.players.find((player) => player.id === game.turnOrder[0]).name} acts first.`, ...game.log].slice(0, 80) };
}

function ageTrack(track, max = 9) {
  const aged = [];
  for (const value of [...track].sort((a, b) => b - a)) {
    let target = Math.min(max, value + 1);
    while (target > value && aged.includes(target)) target -= 1;
    aged.push(target);
  }
  return aged.sort((a, b) => a - b);
}

function ageTracks(tracks) {
  return Object.fromEntries(Object.entries(tracks).map(([type, track]) => [type, ageTrack(track)]));
}

function endYear(game) {
  const players = game.players.map((player) => ({
    ...player,
    coins: player.coins + player.residualIncome,
    regularAvailable: player.regularWorkers,
    grandeAvailable: true,
    temporaryWorker: false,
    wakeRow: null,
    grapes: { red: ageTrack(player.grapes.red), white: ageTrack(player.grapes.white) },
    wines: ageTracks(player.wines),
  }));
  const next = { ...game, players, placements: {}, wakeChoices: {}, passedSeason: [] };
  if (players.some((player) => player.score >= 20)) return finishGame(next);
  const startingIndex = Math.max(0, players.findIndex((player) => player.id === game.startingPlayerId));
  return {
    ...next,
    season: "spring",
    year: game.year + 1,
    turnOrder: rotateIds(players, startingIndex),
    turnCursor: 0,
    log: [`Year ${game.year + 1} begins. Grapes and wine aged; residual income was paid.`, ...next.log].slice(0, 80),
  };
}

export function finishGame(game) {
  const ranked = [...game.players].sort((a, b) => b.score - a.score || b.coins - a.coins || totalWineValue(b) - totalWineValue(a));
  const best = ranked[0];
  const winners = ranked.filter((player) => player.score === best.score && player.coins === best.coins && totalWineValue(player) === totalWineValue(best)).map((player) => player.id);
  return { ...game, phase: "finished", winners, log: [`The final vintage is complete. ${ranked.filter((player) => winners.includes(player.id)).map((player) => player.name).join(" and ")} ${winners.length === 1 ? "wins" : "share the victory"}!`, ...game.log].slice(0, 80) };
}

function totalWineValue(player) { return Object.values(player.wines).flat().reduce((sum, value) => sum + value, 0); }
function availableWorkers(player) { return player.regularAvailable + Number(player.grandeAvailable); }

function firstLegalBuilding(player) {
  return Object.values(BUILDINGS).filter((building) => !owns(player, building.id) && !(building.id === "largeCellar" && !owns(player, "cellar")) && building.cost <= player.coins).sort((a, b) => a.cost - b.cost)[0];
}

function firstPlant(player) {
  for (const card of player.cards.vines) for (const field of player.fields) if (canPlant(player, card, field)) return { cardId: card.uid, fieldId: field.id };
  return null;
}

function firstAvailableAction(game, playerId, actionId) {
  const player = game.players.find((item) => item.id === playerId);
  if (canUseAction(game, playerId, actionId, "regular")) return "regular";
  if (player.grandeAvailable && canUseAction(game, playerId, actionId, "grande")) return "grande";
  return null;
}

export function runComputerTurn(game) {
  const bot = currentPlayer(game);
  if (game.phase !== "playing" || !bot?.isComputer) return game;
  if (game.season === "spring") {
    const row = [4, 3, 2, 6, 1, 5, 7].find((candidate) => !Object.values(game.wakeChoices).includes(candidate));
    return chooseWakeUp(game, bot.id, row);
  }
  if (availableWorkers(bot) === 0) return passSeason(game, bot.id);

  const plans = game.season === "summer"
    ? summerPlans(game, bot)
    : winterPlans(game, bot);
  for (const plan of plans) {
    const workerType = firstAvailableAction(game, bot.id, plan.actionId);
    if (workerType) {
      const next = takeAction(game, bot.id, plan.actionId, plan.payload, workerType);
      if (next !== game) return next;
    }
  }
  return passSeason(game, bot.id);
}

function summerPlans(game, player) {
  const plant = firstPlant(player);
  const building = firstLegalBuilding(player);
  const grapeType = player.grapes.red.length ? "red" : player.grapes.white.length ? "white" : null;
  return [
    plant && { actionId: "plant", payload: plant },
    player.cards.vines.length < 2 && { actionId: "draw-vine", payload: {} },
    building && { actionId: "build", payload: { buildingId: building.id } },
    player.cards.summer[0] && { actionId: "play-summer", payload: { cardId: player.cards.summer[0].uid } },
    { actionId: "tour", payload: {} },
    grapeType && { actionId: "sell-grape", payload: { grapeType } },
  ].filter(Boolean);
}

function winterPlans(game, player) {
  const fillable = player.cards.orders.find((card) => canFillOrder(player, card));
  const field = player.fields.find((item) => item.vines.length);
  const wine = wineOptions(player)[0];
  return [
    fillable && { actionId: "fill-order", payload: { orderId: fillable.uid } },
    field && { actionId: "harvest", payload: { fieldId: field.id } },
    wine && { actionId: "make-wine", payload: { optionId: wine.id } },
    player.cards.orders.length < 2 && { actionId: "draw-order", payload: {} },
    player.coins >= 4 && player.regularWorkers < 5 && { actionId: "train-worker", payload: {} },
    player.cards.winter[0] && { actionId: "play-winter", payload: { cardId: player.cards.winter[0].uid } },
  ].filter(Boolean);
}

