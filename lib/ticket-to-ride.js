export const TRAIN_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "black", "white"];

export const TRAIN_COLOR_INFO = {
  red: { label: "Red", hex: "#cf3f3f", ink: "#fff" },
  orange: { label: "Orange", hex: "#e68128", ink: "#24160b" },
  yellow: { label: "Yellow", hex: "#e5bd35", ink: "#241d08" },
  green: { label: "Green", hex: "#4d8d61", ink: "#fff" },
  blue: { label: "Blue", hex: "#3978aa", ink: "#fff" },
  purple: { label: "Purple", hex: "#8b5a9e", ink: "#fff" },
  black: { label: "Black", hex: "#373a3d", ink: "#fff" },
  white: { label: "White", hex: "#f3eee2", ink: "#2d2925" },
  locomotive: { label: "Locomotive", hex: "#b690ce", ink: "#24152e" },
  gray: { label: "Any color", hex: "#8a8a82", ink: "#fff" },
};

export const PLAYER_COLORS = ["#d1493f", "#3387b5", "#4e9464", "#e0a42b", "#7e55a5"];
export const ROUTE_POINTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };

export const CITIES = {
  vancouver: { name: "Vancouver", x: 8, y: 12 },
  seattle: { name: "Seattle", x: 9, y: 22 },
  portland: { name: "Portland", x: 8, y: 34 },
  sanFrancisco: { name: "San Francisco", x: 9, y: 61 },
  losAngeles: { name: "Los Angeles", x: 15, y: 78 },
  lasVegas: { name: "Las Vegas", x: 23, y: 69 },
  phoenix: { name: "Phoenix", x: 29, y: 81 },
  saltLakeCity: { name: "Salt Lake City", x: 31, y: 55 },
  calgary: { name: "Calgary", x: 25, y: 13 },
  helena: { name: "Helena", x: 35, y: 31 },
  winnipeg: { name: "Winnipeg", x: 50, y: 14 },
  denver: { name: "Denver", x: 44, y: 56 },
  santaFe: { name: "Santa Fe", x: 43, y: 74 },
  elPaso: { name: "El Paso", x: 43, y: 88 },
  duluth: { name: "Duluth", x: 59, y: 30 },
  omaha: { name: "Omaha", x: 56, y: 47 },
  kansasCity: { name: "Kansas City", x: 59, y: 57 },
  oklahomaCity: { name: "Oklahoma City", x: 59, y: 70 },
  dallas: { name: "Dallas", x: 61, y: 83 },
  houston: { name: "Houston", x: 64, y: 92 },
  newOrleans: { name: "New Orleans", x: 73, y: 88 },
  chicago: { name: "Chicago", x: 70, y: 43 },
  saultSteMarie: { name: "Sault Ste. Marie", x: 69, y: 25 },
  toronto: { name: "Toronto", x: 78, y: 34 },
  pittsburgh: { name: "Pittsburgh", x: 79, y: 49 },
  nashville: { name: "Nashville", x: 73, y: 66 },
  atlanta: { name: "Atlanta", x: 80, y: 73 },
  miami: { name: "Miami", x: 89, y: 93 },
  montreal: { name: "Montreal", x: 87, y: 25 },
  boston: { name: "Boston", x: 94, y: 31 },
  newYork: { name: "New York", x: 90, y: 43 },
  washington: { name: "Washington", x: 88, y: 56 },
};

const route = (id, from, to, color, length, lane = 0) => ({
  id,
  from,
  to,
  color,
  length,
  lane,
  parallelGroup: [from, to].sort().join(":"),
});
export const ROUTES = [
  route("vancouver-seattle", "vancouver", "seattle", "gray", 1, -1),
  route("vancouver-seattle-2", "vancouver", "seattle", "gray", 1, 1),
  route("vancouver-calgary", "vancouver", "calgary", "gray", 3),
  route("seattle-portland", "seattle", "portland", "gray", 1, -1),
  route("seattle-portland-2", "seattle", "portland", "gray", 1, 1),
  route("seattle-calgary", "seattle", "calgary", "gray", 4),
  route("seattle-helena", "seattle", "helena", "yellow", 6),
  route("portland-san-francisco", "portland", "sanFrancisco", "green", 5, -1),
  route("portland-san-francisco-purple", "portland", "sanFrancisco", "purple", 5, 1),
  route("portland-salt-lake", "portland", "saltLakeCity", "blue", 6),
  route("san-francisco-los-angeles", "sanFrancisco", "losAngeles", "yellow", 3, -1),
  route("san-francisco-los-angeles-purple", "sanFrancisco", "losAngeles", "purple", 3, 1),
  route("san-francisco-salt-lake", "sanFrancisco", "saltLakeCity", "orange", 5),
  route("los-angeles-las-vegas", "losAngeles", "lasVegas", "gray", 2),
  route("los-angeles-phoenix", "losAngeles", "phoenix", "gray", 3),
  route("los-angeles-el-paso", "losAngeles", "elPaso", "black", 6),
  route("las-vegas-salt-lake", "lasVegas", "saltLakeCity", "orange", 3),
  route("phoenix-santa-fe", "phoenix", "santaFe", "gray", 3),
  route("phoenix-el-paso", "phoenix", "elPaso", "gray", 3),
  route("salt-lake-helena", "saltLakeCity", "helena", "purple", 3),
  route("salt-lake-denver", "saltLakeCity", "denver", "red", 3, -1),
  route("salt-lake-denver-yellow", "saltLakeCity", "denver", "yellow", 3, 1),
  route("calgary-helena", "calgary", "helena", "gray", 4),
  route("calgary-winnipeg", "calgary", "winnipeg", "white", 6),
  route("helena-winnipeg", "helena", "winnipeg", "blue", 4),
  route("helena-duluth", "helena", "duluth", "orange", 6),
  route("helena-omaha", "helena", "omaha", "red", 5),
  route("helena-denver", "helena", "denver", "green", 4, -1),
  route("helena-denver-purple", "helena", "denver", "purple", 4, 1),
  route("winnipeg-sault", "winnipeg", "saultSteMarie", "gray", 6),
  route("winnipeg-duluth", "winnipeg", "duluth", "black", 4),
  route("denver-omaha", "denver", "omaha", "purple", 4),
  route("denver-kansas-city", "denver", "kansasCity", "black", 4, -1),
  route("denver-kansas-city-orange", "denver", "kansasCity", "orange", 4, 1),
  route("denver-oklahoma", "denver", "oklahomaCity", "red", 4),
  route("denver-santa-fe", "denver", "santaFe", "gray", 2),
  route("santa-fe-oklahoma", "santaFe", "oklahomaCity", "blue", 3),
  route("santa-fe-el-paso", "santaFe", "elPaso", "gray", 2),
  route("el-paso-oklahoma", "elPaso", "oklahomaCity", "yellow", 5),
  route("el-paso-dallas", "elPaso", "dallas", "red", 4),
  route("el-paso-houston", "elPaso", "houston", "green", 6),
  route("duluth-sault", "duluth", "saultSteMarie", "gray", 3),
  route("duluth-toronto", "duluth", "toronto", "purple", 6),
  route("duluth-chicago", "duluth", "chicago", "red", 3),
  route("duluth-omaha", "duluth", "omaha", "gray", 2),
  route("omaha-chicago", "omaha", "chicago", "blue", 4),
  route("omaha-kansas-city", "omaha", "kansasCity", "gray", 1),
  route("kansas-city-oklahoma", "kansasCity", "oklahomaCity", "gray", 2, -1),
  route("kansas-city-oklahoma-2", "kansasCity", "oklahomaCity", "gray", 2, 1),
  route("kansas-city-nashville", "kansasCity", "nashville", "purple", 5),
  route("kansas-city-chicago", "kansasCity", "chicago", "white", 3),
  route("oklahoma-dallas", "oklahomaCity", "dallas", "gray", 2, -1),
  route("oklahoma-dallas-2", "oklahomaCity", "dallas", "gray", 2, 1),
  route("oklahoma-nashville", "oklahomaCity", "nashville", "white", 3),
  route("dallas-houston", "dallas", "houston", "gray", 1, -1),
  route("dallas-houston-2", "dallas", "houston", "gray", 1, 1),
  route("dallas-new-orleans", "dallas", "newOrleans", "gray", 2),
  route("houston-new-orleans", "houston", "newOrleans", "gray", 2),
  route("new-orleans-atlanta", "newOrleans", "atlanta", "yellow", 4, -1),
  route("new-orleans-atlanta-orange", "newOrleans", "atlanta", "orange", 4, 1),
  route("new-orleans-miami", "newOrleans", "miami", "red", 6),
  route("chicago-sault", "chicago", "saultSteMarie", "gray", 3),
  route("chicago-toronto", "chicago", "toronto", "white", 4),
  route("chicago-pittsburgh", "chicago", "pittsburgh", "orange", 3),
  route("chicago-nashville", "chicago", "nashville", "yellow", 3),
  route("sault-toronto", "saultSteMarie", "toronto", "gray", 2),
  route("sault-montreal", "saultSteMarie", "montreal", "black", 5),
  route("toronto-montreal", "toronto", "montreal", "gray", 3),
  route("toronto-pittsburgh", "toronto", "pittsburgh", "gray", 2),
  route("pittsburgh-new-york", "pittsburgh", "newYork", "green", 2, -1),
  route("pittsburgh-new-york-white", "pittsburgh", "newYork", "white", 2, 1),
  route("pittsburgh-washington", "pittsburgh", "washington", "gray", 2),
  route("pittsburgh-nashville", "pittsburgh", "nashville", "yellow", 4, -1),
  route("montreal-boston", "montreal", "boston", "gray", 2),
  route("montreal-new-york", "montreal", "newYork", "blue", 3),
  route("boston-new-york", "boston", "newYork", "yellow", 2, -1),
  route("boston-new-york-red", "boston", "newYork", "red", 2, 1),
  route("new-york-washington", "newYork", "washington", "orange", 2, -1),
  route("new-york-washington-black", "newYork", "washington", "black", 2, 1),
  route("nashville-pittsburgh", "pittsburgh", "nashville", "green", 4, 1),
  route("nashville-atlanta", "nashville", "atlanta", "gray", 1),
  route("atlanta-washington", "atlanta", "washington", "black", 2),
  route("atlanta-miami", "atlanta", "miami", "blue", 5),
  route("washington-miami", "washington", "miami", "purple", 4),
];

const ticket = (id, from, to, points) => ({ id, from, to, points });
export const DESTINATIONS = [
  ticket("la-ny", "losAngeles", "newYork", 21), ticket("sea-ny", "seattle", "newYork", 22),
  ticket("van-montreal", "vancouver", "montreal", 20), ticket("port-nash", "portland", "nashville", 17),
  ticket("sf-atl", "sanFrancisco", "atlanta", 17), ticket("la-miami", "losAngeles", "miami", 20),
  ticket("calg-phx", "calgary", "phoenix", 13), ticket("win-hou", "winnipeg", "houston", 12),
  ticket("helena-la", "helena", "losAngeles", 8), ticket("slc-chi", "saltLakeCity", "chicago", 11),
  ticket("den-pitt", "denver", "pittsburgh", 11), ticket("den-elpaso", "denver", "elPaso", 4),
  ticket("dul-hou", "duluth", "houston", 8), ticket("omaha-mont", "omaha", "montreal", 9),
  ticket("kc-miami", "kansasCity", "miami", 11), ticket("dal-ny", "dallas", "newYork", 11),
  ticket("chi-sf", "chicago", "sanFrancisco", 17), ticket("chi-no", "chicago", "newOrleans", 7),
  ticket("sault-nash", "saultSteMarie", "nashville", 8), ticket("tor-miami", "toronto", "miami", 10),
  ticket("mont-atl", "montreal", "atlanta", 9), ticket("bos-miami", "boston", "miami", 12),
  ticket("ny-atl", "newYork", "atlanta", 6), ticket("port-phx", "portland", "phoenix", 11),
  ticket("seat-den", "seattle", "denver", 10), ticket("sf-slc", "sanFrancisco", "saltLakeCity", 6),
  ticket("elpaso-atl", "elPaso", "atlanta", 10), ticket("hou-wash", "houston", "washington", 10),
  ticket("okc-bos", "oklahomaCity", "boston", 12), ticket("vegas-pitt", "lasVegas", "pittsburgh", 15),
];

export function shuffled(items, rng = Math.random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function createTrainDeck(rng = Math.random) {
  return shuffled([
    ...TRAIN_COLORS.flatMap((color) => Array.from({ length: 12 }, (_, index) => ({ id: `${color}-${index}`, color }))),
    ...Array.from({ length: 14 }, (_, index) => ({ id: `locomotive-${index}`, color: "locomotive" })),
  ], rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  return {
    roomCode,
    hostId: host.id,
    phase: "lobby",
    players: [{ ...host, color: host.color ?? PLAYER_COLORS[0], cards: [], destinations: [], pendingDestinations: [], trains: 45, score: 0 }],
    createdAt: now,
    updatedAt: now,
    log: [`${host.name} opened the station.`],
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= 5) return game;
  if (game.players.some((item) => item.id === player.id)) return game;
  const name = String(player.name || "Traveler").trim().slice(0, 20) || "Traveler";
  return {
    ...game,
    players: [...game.players, { ...player, name, color: PLAYER_COLORS[game.players.length], cards: [], destinations: [], pendingDestinations: [], trains: 45, score: 0 }],
    log: [`${name} joined the room.`, ...game.log].slice(0, 40),
  };
}

export function startGame(lobby, rng = Math.random) {
  if (lobby.phase !== "lobby" || lobby.players.length < 2 || lobby.players.length > 5) return lobby;
  let trainDeck = createTrainDeck(rng);
  let destinationDeck = shuffled(DESTINATIONS, rng);
  const players = lobby.players.map((player) => {
    const cards = trainDeck.slice(0, 4);
    trainDeck = trainDeck.slice(4);
    const pendingDestinations = destinationDeck.slice(0, 3);
    destinationDeck = destinationDeck.slice(3);
    return { ...player, cards, destinations: [], pendingDestinations, trains: 45, score: 0 };
  });
  const next = refillFaceUp({
    ...lobby,
    phase: "choosing-destinations",
    players,
    trainDeck,
    trainDiscard: [],
    destinationDeck,
    faceUp: [],
    claimedRoutes: {},
    currentPlayerIndex: 0,
    drawsThisTurn: 0,
    drawSource: null,
    lastRoundTriggeredBy: null,
    finalTurnsRemaining: null,
    winnerIds: [],
    finalScores: null,
    log: ["Choose at least two of your three destination tickets.", ...lobby.log].slice(0, 40),
  }, rng);
  return next;
}

export function chooseOpeningDestinations(game, playerId, destinationIds) {
  if (game.phase !== "choosing-destinations") return game;
  const player = game.players.find((item) => item.id === playerId);
  if (!player || player.pendingDestinations.length !== 3) return game;
  const selected = new Set(destinationIds);
  if (selected.size < 2 || [...selected].some((id) => !player.pendingDestinations.some((item) => item.id === id))) return game;
  const kept = player.pendingDestinations.filter((item) => selected.has(item.id));
  const returned = player.pendingDestinations.filter((item) => !selected.has(item.id));
  const players = game.players.map((item) => item.id === playerId
    ? { ...item, destinations: kept, pendingDestinations: [] }
    : item);
  const everyoneReady = players.every((item) => item.pendingDestinations.length === 0);
  return {
    ...game,
    players,
    destinationDeck: [...game.destinationDeck, ...returned],
    phase: everyoneReady ? "playing" : game.phase,
    log: [everyoneReady ? `${players[0].name} takes the first turn.` : `${player.name} locked in their destinations.`, ...game.log].slice(0, 40),
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function drawTrainCard(game, playerId, source, rng = Math.random) {
  if (game.phase !== "playing" || currentPlayer(game)?.id !== playerId || game.pendingDestinationChoice) return game;
  if (game.drawsThisTurn >= 2) return game;
  let prepared = game;
  if (source === "deck" && prepared.trainDeck.length === 0 && prepared.trainDiscard.length > 0) {
    prepared = { ...prepared, trainDeck: shuffled(prepared.trainDiscard, rng), trainDiscard: [] };
  }
  const faceIndex = typeof source === "number" ? source : -1;
  const faceCard = faceIndex >= 0 ? prepared.faceUp[faceIndex] : null;
  if (faceIndex >= 0 && !faceCard) return game;
  if (faceCard?.color === "locomotive" && game.drawsThisTurn > 0) return game;
  const drawn = faceCard ?? prepared.trainDeck[0];
  if (!drawn) return game;
  let next = {
    ...prepared,
    trainDeck: faceCard ? prepared.trainDeck : prepared.trainDeck.slice(1),
    faceUp: faceCard ? prepared.faceUp.filter((_, index) => index !== faceIndex) : prepared.faceUp,
    players: prepared.players.map((player) => player.id === playerId ? { ...player, cards: [...player.cards, drawn] } : player),
    drawsThisTurn: prepared.drawsThisTurn + (faceCard?.color === "locomotive" ? 2 : 1),
    drawSource: source === "deck" ? "deck" : "face-up",
    log: [`${currentPlayer(prepared).name} drew ${source === "deck" ? "from the deck" : `a ${TRAIN_COLOR_INFO[drawn.color].label} card`}.`, ...prepared.log].slice(0, 40),
  };
  next = refillFaceUp(next, rng);
  if (next.drawsThisTurn >= 2) next = endTurn(next);
  return next;
}

export function validPaymentColors(game, playerId, routeId) {
  const player = game.players.find((item) => item.id === playerId);
  const selectedRoute = ROUTES.find((item) => item.id === routeId);
  if (!player || !selectedRoute || !isRouteAvailable(game, playerId, routeId) || player.trains < selectedRoute.length) return [];
  const wilds = player.cards.filter((card) => card.color === "locomotive").length;
  const colors = selectedRoute.color === "gray" ? TRAIN_COLORS : [selectedRoute.color];
  return colors.filter((color) => player.cards.filter((card) => card.color === color).length + wilds >= selectedRoute.length);
}

export function isRouteAvailable(game, playerId, routeId) {
  const selectedRoute = ROUTES.find((item) => item.id === routeId);
  if (!selectedRoute || game.claimedRoutes[routeId]) return false;
  const parallelClaims = ROUTES
    .filter((item) => item.id !== routeId && item.parallelGroup === selectedRoute.parallelGroup)
    .map((item) => game.claimedRoutes[item.id])
    .filter(Boolean);
  if (parallelClaims.includes(playerId)) return false;
  if (game.players.length <= 3 && parallelClaims.length > 0) return false;
  return true;
}

export function claimRoute(game, playerId, routeId, paymentColor) {
  if (game.phase !== "playing" || currentPlayer(game)?.id !== playerId || game.drawsThisTurn > 0 || game.pendingDestinationChoice) return game;
  const selectedRoute = ROUTES.find((item) => item.id === routeId);
  if (!selectedRoute || !validPaymentColors(game, playerId, routeId).includes(paymentColor)) return game;
  const player = currentPlayer(game);
  let colorNeeded = selectedRoute.length;
  let wildNeeded = 0;
  const colorCards = player.cards.filter((card) => card.color === paymentColor);
  if (colorCards.length < colorNeeded) {
    wildNeeded = colorNeeded - colorCards.length;
    colorNeeded = colorCards.length;
  }
  const paidIds = new Set([
    ...colorCards.slice(0, colorNeeded).map((card) => card.id),
    ...player.cards.filter((card) => card.color === "locomotive").slice(0, wildNeeded).map((card) => card.id),
  ]);
  const paidCards = player.cards.filter((card) => paidIds.has(card.id));
  const next = {
    ...game,
    claimedRoutes: { ...game.claimedRoutes, [routeId]: playerId },
    trainDiscard: [...game.trainDiscard, ...paidCards],
    players: game.players.map((item) => item.id === playerId ? {
      ...item,
      cards: item.cards.filter((card) => !paidIds.has(card.id)),
      trains: item.trains - selectedRoute.length,
      score: item.score + ROUTE_POINTS[selectedRoute.length],
    } : item),
    log: [`${player.name} claimed ${CITIES[selectedRoute.from].name}–${CITIES[selectedRoute.to].name} for ${ROUTE_POINTS[selectedRoute.length]} points.`, ...game.log].slice(0, 40),
  };
  return endTurn(next);
}

export function drawDestinations(game, playerId, rng = Math.random) {
  if (game.phase !== "playing" || currentPlayer(game)?.id !== playerId || game.drawsThisTurn > 0 || game.pendingDestinationChoice) return game;
  let destinationDeck = [...game.destinationDeck];
  if (destinationDeck.length < 3) destinationDeck = shuffled(destinationDeck, rng);
  const choices = destinationDeck.slice(0, Math.min(3, destinationDeck.length));
  if (!choices.length) return game;
  return { ...game, destinationDeck: destinationDeck.slice(choices.length), pendingDestinationChoice: { playerId, choices } };
}

export function chooseDrawnDestinations(game, playerId, destinationIds) {
  const pending = game.pendingDestinationChoice;
  if (!pending || pending.playerId !== playerId) return game;
  const selected = new Set(destinationIds);
  if (selected.size < 1 || [...selected].some((id) => !pending.choices.some((item) => item.id === id))) return game;
  const kept = pending.choices.filter((item) => selected.has(item.id));
  const returned = pending.choices.filter((item) => !selected.has(item.id));
  const next = {
    ...game,
    pendingDestinationChoice: null,
    destinationDeck: [...game.destinationDeck, ...returned],
    players: game.players.map((player) => player.id === playerId ? { ...player, destinations: [...player.destinations, ...kept] } : player),
    log: [`${currentPlayer(game).name} kept ${kept.length} new destination ${kept.length === 1 ? "ticket" : "tickets"}.`, ...game.log].slice(0, 40),
  };
  return endTurn(next);
}

export function hasConnection(game, playerId, from, to) {
  const adjacency = {};
  ROUTES.forEach((item) => {
    if (game.claimedRoutes[item.id] !== playerId) return;
    (adjacency[item.from] ??= []).push(item.to);
    (adjacency[item.to] ??= []).push(item.from);
  });
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const city = queue.shift();
    if (city === to) return true;
    for (const neighbor of adjacency[city] ?? []) {
      if (!seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor); }
    }
  }
  return false;
}

export function longestRouteLength(game, playerId) {
  const owned = ROUTES.filter((item) => game.claimedRoutes[item.id] === playerId);
  const touching = {};
  owned.forEach((item) => {
    (touching[item.from] ??= []).push(item);
    (touching[item.to] ??= []).push(item);
  });
  function walk(city, used) {
    let best = 0;
    for (const item of touching[city] ?? []) {
      if (used.has(item.id)) continue;
      const nextUsed = new Set(used).add(item.id);
      const nextCity = item.from === city ? item.to : item.from;
      best = Math.max(best, item.length + walk(nextCity, nextUsed));
    }
    return best;
  }
  return Math.max(0, ...Object.keys(touching).map((city) => walk(city, new Set())));
}

export function finishGame(game) {
  const routeLengths = Object.fromEntries(game.players.map((player) => [player.id, longestRouteLength(game, player.id)]));
  const longest = Math.max(...Object.values(routeLengths));
  const longestIds = longest > 0 ? game.players.filter((player) => routeLengths[player.id] === longest).map((player) => player.id) : [];
  const finalScores = game.players.map((player) => {
    const ticketScore = player.destinations.reduce((sum, item) => sum + (hasConnection(game, player.id, item.from, item.to) ? item.points : -item.points), 0);
    return { playerId: player.id, routeScore: player.score, ticketScore, longestBonus: longestIds.includes(player.id) ? 10 : 0, longestRoute: routeLengths[player.id], total: player.score + ticketScore + (longestIds.includes(player.id) ? 10 : 0) };
  });
  const best = Math.max(...finalScores.map((item) => item.total));
  return {
    ...game,
    phase: "finished",
    finalScores,
    winnerIds: finalScores.filter((item) => item.total === best).map((item) => item.playerId),
    log: [`Game over! ${finalScores.filter((item) => item.total === best).map((score) => game.players.find((player) => player.id === score.playerId).name).join(" & ")} won with ${best} points.`, ...game.log].slice(0, 40),
  };
}

export function endTurn(game) {
  let finalTurnsRemaining = game.finalTurnsRemaining;
  let lastRoundTriggeredBy = game.lastRoundTriggeredBy;
  const player = currentPlayer(game);
  if (!lastRoundTriggeredBy && player.trains <= 2) {
    lastRoundTriggeredBy = player.id;
    finalTurnsRemaining = game.players.length;
  } else if (lastRoundTriggeredBy) {
    finalTurnsRemaining -= 1;
    if (finalTurnsRemaining <= 0) return finishGame({ ...game, finalTurnsRemaining: 0, lastRoundTriggeredBy });
  }
  return {
    ...game,
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
    drawsThisTurn: 0,
    drawSource: null,
    finalTurnsRemaining,
    lastRoundTriggeredBy,
    log: [lastRoundTriggeredBy && game.lastRoundTriggeredBy !== lastRoundTriggeredBy ? `${player.name} triggered the final round!` : `${game.players[(game.currentPlayerIndex + 1) % game.players.length].name}'s turn.`, ...game.log].slice(0, 40),
  };
}

function refillFaceUp(game, rng = Math.random) {
  let trainDeck = [...game.trainDeck];
  let trainDiscard = [...game.trainDiscard];
  let faceUp = [...game.faceUp];
  const refillDeck = () => {
    if (trainDeck.length === 0 && trainDiscard.length) {
      trainDeck = shuffled(trainDiscard, rng);
      trainDiscard = [];
    }
  };
  while (faceUp.length < 5) {
    refillDeck();
    if (!trainDeck.length) break;
    faceUp.push(trainDeck.shift());
  }
  let refreshes = 0;
  while (faceUp.filter((card) => card.color === "locomotive").length >= 3 && trainDeck.length + trainDiscard.length >= 5 && refreshes < 8) {
    trainDiscard.push(...faceUp);
    faceUp = [];
    while (faceUp.length < 5) {
      refillDeck();
      if (!trainDeck.length) break;
      faceUp.push(trainDeck.shift());
    }
    refreshes += 1;
  }
  return { ...game, trainDeck, trainDiscard, faceUp };
}

export function destinationLabel(destination) {
  return `${CITIES[destination.from].name} → ${CITIES[destination.to].name}`;
}
