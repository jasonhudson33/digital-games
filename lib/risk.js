export const PLAYER_COLORS = {
  human: "#f0b84b",
  bot1: "#d85b4a",
  bot2: "#4ca39b",
};

export const PLAYER_STYLES = [
  { name: "gold", color: "#f0b84b" },
  { name: "red", color: "#d85b4a" },
  { name: "teal", color: "#4ca39b" },
  { name: "blue", color: "#547fb5" },
  { name: "purple", color: "#8c68a6" },
  { name: "green", color: "#6c965b" },
];

export const CARD_TYPES = {
  infantry: { name: "Infantry", symbol: "♟" },
  cavalry: { name: "Cavalry", symbol: "♞" },
  artillery: { name: "Artillery", symbol: "✹" },
  wild: { name: "Wild", symbol: "★" },
};

export const CONTINENTS = {
  northAmerica: {
    name: "North America",
    bonus: 5,
    color: "#698f72",
    territories: ["alaska", "northwest-territory", "greenland", "alberta", "ontario", "quebec", "western-united-states", "eastern-united-states", "central-america"],
  },
  southAmerica: {
    name: "South America",
    bonus: 2,
    color: "#ad774e",
    territories: ["venezuela", "peru", "brazil", "argentina"],
  },
  europe: {
    name: "Europe",
    bonus: 5,
    color: "#8c7390",
    territories: ["iceland", "great-britain", "scandinavia", "northern-europe", "western-europe", "southern-europe", "ukraine"],
  },
  africa: {
    name: "Africa",
    bonus: 3,
    color: "#b49a5c",
    territories: ["north-africa", "egypt", "east-africa", "congo", "south-africa"],
  },
  asia: {
    name: "Asia",
    bonus: 7,
    color: "#6d829e",
    territories: ["ural", "siberia", "yakutsk", "kamchatka", "irkutsk", "mongolia", "japan", "afghanistan", "china", "middle-east", "india", "siam"],
  },
  australia: {
    name: "Australia",
    bonus: 2,
    color: "#9b6f68",
    territories: ["indonesia", "new-guinea", "western-australia", "eastern-australia"],
  },
};

const territory = (name, continent, x, y, neighbors) => ({ name, continent, x, y, neighbors });

export const TERRITORIES = {
  alaska: territory("Alaska", "northAmerica", 8, 19, ["northwest-territory", "alberta", "kamchatka"]),
  "northwest-territory": territory("Northwest Territory", "northAmerica", 18, 14, ["alaska", "alberta", "ontario", "greenland"]),
  greenland: territory("Greenland", "northAmerica", 38, 11, ["northwest-territory", "ontario", "quebec", "iceland"]),
  alberta: territory("Alberta", "northAmerica", 18, 25, ["alaska", "northwest-territory", "ontario", "western-united-states"]),
  ontario: territory("Ontario", "northAmerica", 26, 23, ["northwest-territory", "greenland", "quebec", "eastern-united-states", "western-united-states", "alberta"]),
  quebec: territory("Quebec", "northAmerica", 31, 22, ["greenland", "ontario", "eastern-united-states"]),
  "western-united-states": territory("Western United States", "northAmerica", 19, 32, ["alberta", "ontario", "eastern-united-states", "central-america"]),
  "eastern-united-states": territory("Eastern United States", "northAmerica", 27, 32, ["ontario", "quebec", "western-united-states", "central-america"]),
  "central-america": territory("Central America", "northAmerica", 24, 41, ["western-united-states", "eastern-united-states", "venezuela"]),

  venezuela: territory("Venezuela", "southAmerica", 32, 47, ["central-america", "peru", "brazil"]),
  peru: territory("Peru", "southAmerica", 29, 58, ["venezuela", "brazil", "argentina"]),
  brazil: territory("Brazil", "southAmerica", 38, 55, ["venezuela", "peru", "argentina", "north-africa"]),
  argentina: territory("Argentina", "southAmerica", 33, 72, ["peru", "brazil"]),

  iceland: territory("Iceland", "europe", 45, 16, ["greenland", "great-britain", "scandinavia"]),
  "great-britain": territory("Great Britain", "europe", 49, 23, ["iceland", "scandinavia", "northern-europe", "western-europe"]),
  scandinavia: territory("Scandinavia", "europe", 55, 16, ["iceland", "great-britain", "northern-europe", "ukraine"]),
  "northern-europe": territory("Northern Europe", "europe", 54, 24, ["great-britain", "scandinavia", "ukraine", "southern-europe", "western-europe"]),
  "western-europe": territory("Western Europe", "europe", 48, 30, ["great-britain", "northern-europe", "southern-europe", "north-africa"]),
  "southern-europe": territory("Southern Europe", "europe", 55, 31, ["western-europe", "northern-europe", "ukraine", "middle-east", "egypt", "north-africa"]),
  ukraine: territory("Ukraine", "europe", 61, 24, ["scandinavia", "northern-europe", "southern-europe", "ural", "afghanistan", "middle-east"]),

  "north-africa": territory("North Africa", "africa", 49, 41, ["brazil", "western-europe", "southern-europe", "egypt", "east-africa", "congo"]),
  egypt: territory("Egypt", "africa", 58, 40, ["north-africa", "southern-europe", "middle-east", "east-africa"]),
  "east-africa": territory("East Africa", "africa", 62, 51, ["egypt", "north-africa", "congo", "south-africa", "madagascar", "middle-east"]),
  congo: territory("Congo", "africa", 54, 53, ["north-africa", "east-africa", "south-africa"]),
  "south-africa": territory("South Africa", "africa", 57, 69, ["congo", "east-africa", "madagascar"]),
  madagascar: territory("Madagascar", "africa", 65, 66, ["east-africa", "south-africa"]),

  ural: territory("Ural", "asia", 67, 20, ["ukraine", "siberia", "china", "afghanistan"]),
  siberia: territory("Siberia", "asia", 75, 15, ["ural", "yakutsk", "irkutsk", "mongolia", "china"]),
  yakutsk: territory("Yakutsk", "asia", 85, 14, ["siberia", "irkutsk", "kamchatka"]),
  kamchatka: territory("Kamchatka", "asia", 94, 19, ["yakutsk", "irkutsk", "mongolia", "japan", "alaska"]),
  irkutsk: territory("Irkutsk", "asia", 80, 21, ["siberia", "yakutsk", "kamchatka", "mongolia"]),
  mongolia: territory("Mongolia", "asia", 80, 28, ["siberia", "irkutsk", "kamchatka", "japan", "china"]),
  japan: territory("Japan", "asia", 89, 32, ["kamchatka", "mongolia"]),
  afghanistan: territory("Afghanistan", "asia", 68, 31, ["ukraine", "ural", "china", "india", "middle-east"]),
  china: territory("China", "asia", 78, 34, ["ural", "siberia", "mongolia", "siam", "india", "afghanistan"]),
  "middle-east": territory("Middle East", "asia", 63, 37, ["ukraine", "afghanistan", "india", "east-africa", "egypt", "southern-europe"]),
  india: territory("India", "asia", 72, 41, ["middle-east", "afghanistan", "china", "siam"]),
  siam: territory("Siam", "asia", 79, 44, ["india", "china", "indonesia"]),

  indonesia: territory("Indonesia", "australia", 83, 52, ["siam", "new-guinea", "western-australia"]),
  "new-guinea": territory("New Guinea", "australia", 91, 54, ["indonesia", "western-australia", "eastern-australia"]),
  "western-australia": territory("Western Australia", "australia", 84, 66, ["indonesia", "new-guinea", "eastern-australia"]),
  "eastern-australia": territory("Eastern Australia", "australia", 92, 67, ["new-guinea", "western-australia"]),
};

export const MAP_CONNECTIONS = Object.entries(TERRITORIES).flatMap(([id, data]) =>
  data.neighbors
    .filter((neighborId) => id.localeCompare(neighborId) < 0)
    .map((neighborId) => [id, neighborId]),
);

export function shuffled(items, rng = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createCardDeck(rng = Math.random) {
  const types = ["infantry", "cavalry", "artillery"];
  const territoryCards = Object.keys(TERRITORIES).map((territoryId, index) => ({
    id: `card-${territoryId}`,
    territoryId,
    type: types[index % types.length],
  }));
  return shuffled([
    ...territoryCards,
    { id: "wild-1", territoryId: null, type: "wild" },
    { id: "wild-2", territoryId: null, type: "wild" },
  ], rng);
}

export function createRiskGame(humanName = "Commander", rng = Math.random) {
  return createRiskGameForPlayers([
    { id: "human", name: humanName.trim() || "Commander", color: PLAYER_COLORS.human, isBot: false, cards: [] },
    { id: "bot1", name: "General Vale", color: PLAYER_COLORS.bot1, isBot: true, cards: [] },
    { id: "bot2", name: "Admiral Sato", color: PLAYER_COLORS.bot2, isBot: true, cards: [] },
  ], rng);
}

export function createRiskGameFromLobby(lobby, rng = Math.random) {
  return createRiskGameForPlayers(lobby.players, rng, {
    roomCode: lobby.roomCode,
    hostId: lobby.hostId,
    createdAt: lobby.createdAt,
    cardTradeMode: lobby.cardTradeMode ?? "progressive",
  });
}

export function createRiskGameForPlayers(inputPlayers, rng = Math.random, room = {}) {
  const players = inputPlayers.map((player, index) => ({
    ...player,
    color: player.color ?? PLAYER_STYLES[index % PLAYER_STYLES.length].color,
    isBot: Boolean(player.isBot ?? player.isComputer),
    cards: [],
  }));
  if (players.length < 2 || players.length > 6) throw new Error("Risk requires 2–6 commanders.");
  const territories = {};
  const territoryIds = shuffled(Object.keys(TERRITORIES), rng);
  territoryIds.forEach((id, index) => {
    territories[id] = { ownerId: players[index % players.length].id, armies: 1 };
  });
  const startingArmies = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 }[players.length];
  players.forEach((player) => {
    const owned = territoriesForPlayer(territories, player.id);
    let armiesToPlace = startingArmies - owned.length;
    while (armiesToPlace > 0) {
      const territoryId = owned[Math.floor(rng() * owned.length)];
      territories[territoryId].armies += 1;
      armiesToPlace -= 1;
    }
  });
  const openingReinforcements = calculateReinforcements(territories, players[0].id);
  return {
    ...room,
    cardTradeMode: room.cardTradeMode === "normal" ? "normal" : "progressive",
    players,
    territories,
    currentPlayerIndex: 0,
    phase: "reinforce",
    reinforcements: openingReinforcements,
    round: 1,
    conqueredThisTurn: false,
    winnerId: null,
    lastBattle: null,
    pendingConquest: null,
    deck: createCardDeck(rng),
    discard: [],
    tradesCompleted: 0,
    log: [
      `${players[0].name} begins with ${openingReinforcements} armies to deploy.`,
      "The world has been divided. Your campaign begins now.",
    ],
    updatedAt: Date.now(),
  };
}

export function tradeBonusFor(tradesCompleted, mode = "progressive", set = []) {
  if (mode === "normal") {
    const types = new Set(set.filter((card) => card.type !== "wild").map((card) => card.type));
    if (types.size !== 1) return 10;
    const [type] = types;
    return { infantry: 4, cavalry: 6, artillery: 8 }[type] ?? 10;
  }
  const openingBonuses = [4, 6, 8, 10, 12, 15];
  return openingBonuses[tradesCompleted] ?? 15 + (tradesCompleted - 5) * 5;
}

export function findTradeSet(cards = []) {
  for (let first = 0; first < cards.length - 2; first += 1) {
    for (let second = first + 1; second < cards.length - 1; second += 1) {
      for (let third = second + 1; third < cards.length; third += 1) {
        const candidate = [cards[first], cards[second], cards[third]];
        const nonWildTypes = candidate.filter((card) => card.type !== "wild").map((card) => card.type);
        const distinctTypes = new Set(nonWildTypes);
        if (nonWildTypes.length === 0 || distinctTypes.size === 1 || distinctTypes.size === nonWildTypes.length) {
          return candidate;
        }
      }
    }
  }
  return null;
}

export function tradeCards(game, playerId = game.players[game.currentPlayerIndex]?.id) {
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (game.phase !== "reinforce" || currentPlayer?.id !== playerId) return game;
  const player = game.players.find((item) => item.id === playerId);
  const set = findTradeSet(player?.cards);
  if (!set) return game;
  const setIds = new Set(set.map((card) => card.id));
  const bonus = tradeBonusFor(game.tradesCompleted ?? 0, game.cardTradeMode, set);
  return {
    ...game,
    players: game.players.map((item) => item.id === playerId
      ? { ...item, cards: item.cards.filter((card) => !setIds.has(card.id)) }
      : item),
    discard: [...(game.discard ?? []), ...set],
    tradesCompleted: (game.tradesCompleted ?? 0) + 1,
    reinforcements: game.reinforcements + bonus,
    log: [`${player.name} traded a card set for ${bonus} bonus armies.`, ...game.log].slice(0, 40),
  };
}

export function awardConquestCard(game, rng = Math.random) {
  if (!game.conqueredThisTurn) return game;
  const player = game.players[game.currentPlayerIndex];
  let deck = [...(game.deck ?? [])];
  let discard = [...(game.discard ?? [])];
  if (deck.length === 0 && discard.length > 0) {
    deck = shuffled(discard, rng);
    discard = [];
  }
  const card = deck.shift();
  if (!card) return game;
  const cardName = card.territoryId ? TERRITORIES[card.territoryId].name : "Wild";
  return {
    ...game,
    deck,
    discard,
    players: game.players.map((item) => item.id === player.id
      ? { ...item, cards: [...(item.cards ?? []), card] }
      : item),
    log: [`${player.name} earned a ${cardName} card for conquering territory.`, ...game.log].slice(0, 40),
  };
}

export function territoriesForPlayer(territories, playerId) {
  return Object.keys(territories).filter((id) => territories[id].ownerId === playerId);
}

export function controlledContinents(territories, playerId) {
  return Object.entries(CONTINENTS)
    .filter(([, continent]) => continent.territories.every((id) => territories[id].ownerId === playerId))
    .map(([id]) => id);
}

export function calculateReinforcements(territories, playerId) {
  const territoryCount = territoriesForPlayer(territories, playerId).length;
  if (territoryCount === 0) return 0;
  const territoryArmies = Math.max(3, Math.floor(territoryCount / 3));
  const continentArmies = controlledContinents(territories, playerId)
    .reduce((sum, continentId) => sum + CONTINENTS[continentId].bonus, 0);
  return territoryArmies + continentArmies;
}

export function clampArmySelection(count, maximum) {
  if (!Number.isFinite(maximum) || maximum < 1) return 1;
  const normalized = Number.isFinite(count) ? Math.floor(count) : 1;
  return Math.min(Math.floor(maximum), Math.max(1, normalized));
}

export function placeReinforcement(game, territoryId, count = 1) {
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (game.winnerId || game.phase !== "reinforce" || count < 1 || count > game.reinforcements) return game;
  if (game.territories[territoryId]?.ownerId !== currentPlayer.id) return game;
  return {
    ...game,
    territories: {
      ...game.territories,
      [territoryId]: {
        ...game.territories[territoryId],
        armies: game.territories[territoryId].armies + count,
      },
    },
    reinforcements: game.reinforcements - count,
    log: [`${currentPlayer.name} deployed ${count} ${count === 1 ? "army" : "armies"} to ${TERRITORIES[territoryId].name}.`, ...game.log].slice(0, 40),
  };
}

export function rollDice(count, rng = Math.random) {
  return Array.from({ length: count }, () => Math.floor(rng() * 6) + 1).sort((a, b) => b - a);
}

export function resolveBattle(attackerArmies, defenderArmies, rng = Math.random, requestedAttackerDice) {
  const maximumAttackerDice = Math.min(3, Math.max(0, attackerArmies - 1));
  const attackerDiceCount = requestedAttackerDice == null
    ? maximumAttackerDice
    : Math.min(maximumAttackerDice, Math.max(1, Math.floor(requestedAttackerDice)));
  const attackerDice = rollDice(attackerDiceCount, rng);
  const defenderDice = rollDice(Math.min(2, Math.max(0, defenderArmies)), rng);
  const comparisons = Math.min(attackerDice.length, defenderDice.length);
  let attackerLosses = 0;
  let defenderLosses = 0;
  for (let index = 0; index < comparisons; index += 1) {
    if (attackerDice[index] > defenderDice[index]) defenderLosses += 1;
    else attackerLosses += 1;
  }
  return { attackerDice, defenderDice, attackerLosses, defenderLosses };
}

export function canAttack(game, fromId, toId) {
  const from = game.territories[fromId];
  const to = game.territories[toId];
  const playerId = game.players[game.currentPlayerIndex]?.id;
  return Boolean(
    !game.winnerId
    && game.phase === "attack"
    && !game.pendingConquest
    && from
    && to
    && from.ownerId === playerId
    && to.ownerId !== playerId
    && from.armies > 1
    && TERRITORIES[fromId].neighbors.includes(toId)
  );
}

export function attackTerritory(game, fromId, toId, options = {}) {
  if (!canAttack(game, fromId, toId)) return game;
  const rng = typeof options === "function" ? options : options.rng ?? Math.random;
  const requestedDice = typeof options === "object" ? options.attackDice : undefined;
  const attacker = game.players[game.currentPlayerIndex];
  const defender = game.players.find((player) => player.id === game.territories[toId].ownerId);
  const beforeFrom = game.territories[fromId];
  const beforeTo = game.territories[toId];
  const maximumDice = Math.min(3, beforeFrom.armies - 1);
  if (requestedDice != null && (!Number.isInteger(requestedDice) || requestedDice < 1 || requestedDice > maximumDice)) return game;
  const result = resolveBattle(beforeFrom.armies, beforeTo.armies, rng, requestedDice);
  const fromAfterLosses = beforeFrom.armies - result.attackerLosses;
  const defenderArmies = beforeTo.armies - result.defenderLosses;
  const conquered = defenderArmies <= 0;
  const territories = {
    ...game.territories,
    [fromId]: { ...beforeFrom, armies: fromAfterLosses },
    [toId]: conquered
      ? { ownerId: attacker.id, armies: 0 }
      : { ...beforeTo, armies: defenderArmies },
  };
  const defenderEliminated = conquered
    && !Object.values(territories).some((territoryState) => territoryState.ownerId === defender.id);
  const capturedCards = defenderEliminated ? defender.cards ?? [] : [];
  const players = defenderEliminated
    ? game.players.map((player) => {
      if (player.id === attacker.id) return { ...player, cards: [...(player.cards ?? []), ...capturedCards] };
      if (player.id === defender.id) return { ...player, cards: [] };
      return player;
    })
    : game.players;
  const rollSummary = `${attacker.name} rolled ${result.attackerDice.join("-")} vs ${defender.name}'s ${result.defenderDice.join("-")}`;
  const outcome = conquered
    ? ` and captured ${TERRITORIES[toId].name}!${defenderEliminated ? ` ${defender.name} was eliminated; ${attacker.name} took ${capturedCards.length} ${capturedCards.length === 1 ? "card" : "cards"}.` : ""}`
    : ` — losses ${result.attackerLosses}:${result.defenderLosses}.`;
  return {
    ...game,
    players,
    territories,
    conqueredThisTurn: game.conqueredThisTurn || conquered,
    pendingConquest: conquered ? {
      fromId,
      toId,
      minimum: result.attackerDice.length,
      maximum: fromAfterLosses - 1,
    } : null,
    lastBattle: {
      fromId,
      toId,
      attackerId: attacker.id,
      defenderId: defender.id,
      ...result,
      conquered,
      defenderEliminated,
      capturedCardCount: capturedCards.length,
    },
    log: [`${rollSummary}${outcome}`, ...game.log].slice(0, 40),
  };
}

export function resolveConquestMove(game, count) {
  const pending = game.pendingConquest;
  if (!pending || !Number.isInteger(count) || count < pending.minimum || count > pending.maximum) return game;
  const player = game.players[game.currentPlayerIndex];
  const from = game.territories[pending.fromId];
  const to = game.territories[pending.toId];
  if (from.ownerId !== player.id || to.ownerId !== player.id || from.armies <= count) return game;
  const territories = {
    ...game.territories,
    [pending.fromId]: { ...from, armies: from.armies - count },
    [pending.toId]: { ...to, armies: count },
  };
  const winnerId = Object.values(territories).every((territoryState) => territoryState.ownerId === player.id)
    ? player.id
    : null;
  return {
    ...game,
    territories,
    pendingConquest: null,
    winnerId,
    log: [
      winnerId
        ? `${player.name} conquered the world!`
        : `${player.name} moved ${count} armies into ${TERRITORIES[pending.toId].name}.`,
      ...game.log,
    ].slice(0, 40),
  };
}

export function hasOwnedPath(game, fromId, toId, playerId) {
  if (fromId === toId) return true;
  const visited = new Set([fromId]);
  const queue = [fromId];
  while (queue.length) {
    const current = queue.shift();
    for (const neighbor of TERRITORIES[current].neighbors) {
      if (visited.has(neighbor) || game.territories[neighbor].ownerId !== playerId) continue;
      if (neighbor === toId) return true;
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
  return false;
}

export function fortifyTerritory(game, fromId, toId, count) {
  const player = game.players[game.currentPlayerIndex];
  const from = game.territories[fromId];
  const to = game.territories[toId];
  if (
    game.winnerId
    || game.pendingConquest
    || game.phase !== "fortify"
    || !from
    || !to
    || from.ownerId !== player.id
    || to.ownerId !== player.id
    || !Number.isInteger(count)
    || count < 1
    || count >= from.armies
    || !hasOwnedPath(game, fromId, toId, player.id)
  ) return game;
  const moved = {
    ...game,
    territories: {
      ...game.territories,
      [fromId]: { ...from, armies: from.armies - count },
      [toId]: { ...to, armies: to.armies + count },
    },
    log: [`${player.name} fortified ${TERRITORIES[toId].name} with ${count} ${count === 1 ? "army" : "armies"}.`, ...game.log].slice(0, 40),
  };
  return beginNextTurn(moved);
}

export function advancePhase(game) {
  if (game.winnerId || game.pendingConquest) return game;
  if (game.phase === "reinforce") {
    if (game.reinforcements > 0) return game;
    return { ...game, phase: "attack", log: ["Attack phase — select one of your territories, then an adjacent rival.", ...game.log] };
  }
  if (game.phase === "attack") {
    return { ...game, phase: "fortify", log: ["Fortify phase — move armies once, or end your turn.", ...game.log] };
  }
  return beginNextTurn(game);
}

export function beginNextTurn(game, rng = Math.random) {
  const rewardedGame = awardConquestCard(game, rng);
  let nextIndex = rewardedGame.currentPlayerIndex;
  let checked = 0;
  do {
    nextIndex = (nextIndex + 1) % rewardedGame.players.length;
    checked += 1;
  } while (
    checked <= rewardedGame.players.length
    && territoriesForPlayer(rewardedGame.territories, rewardedGame.players[nextIndex].id).length === 0
  );
  const wrapped = nextIndex <= rewardedGame.currentPlayerIndex;
  const nextPlayer = rewardedGame.players[nextIndex];
  const reinforcements = calculateReinforcements(rewardedGame.territories, nextPlayer.id);
  return {
    ...rewardedGame,
    currentPlayerIndex: nextIndex,
    phase: "reinforce",
    reinforcements,
    round: rewardedGame.round + (wrapped ? 1 : 0),
    conqueredThisTurn: false,
    lastBattle: null,
    pendingConquest: null,
    log: [`${nextPlayer.name}'s turn — ${reinforcements} armies ready.`, ...rewardedGame.log].slice(0, 40),
  };
}

function borderTerritories(game, playerId) {
  return territoriesForPlayer(game.territories, playerId).filter((id) =>
    TERRITORIES[id].neighbors.some((neighbor) => game.territories[neighbor].ownerId !== playerId),
  );
}

function bestAttack(game, playerId) {
  const options = borderTerritories(game, playerId).flatMap((fromId) =>
    TERRITORIES[fromId].neighbors
      .filter((toId) => game.territories[toId].ownerId !== playerId)
      .map((toId) => ({
        fromId,
        toId,
        advantage: game.territories[fromId].armies - game.territories[toId].armies,
      })),
  );
  return options.sort((a, b) => b.advantage - a.advantage)[0] ?? null;
}

export function runComputerTurn(game, rng = Math.random) {
  const player = game.players[game.currentPlayerIndex];
  if (!player?.isBot || game.winnerId) return game;
  let next = game;
  while (findTradeSet(next.players[next.currentPlayerIndex].cards)) {
    next = tradeCards(next, player.id);
  }
  while (next.reinforcements > 0) {
    const borders = borderTerritories(next, player.id);
    const target = [...borders].sort((a, b) => next.territories[a].armies - next.territories[b].armies)[0]
      ?? territoriesForPlayer(next.territories, player.id)[0];
    next = placeReinforcement(next, target, 1);
  }
  next = advancePhase(next);
  for (let attacks = 0; attacks < 18 && !next.winnerId; attacks += 1) {
    const option = bestAttack(next, player.id);
    if (!option || option.advantage < 2 || next.territories[option.fromId].armies < 3) break;
    next = attackTerritory(next, option.fromId, option.toId, rng);
    if (next.pendingConquest) next = resolveConquestMove(next, next.pendingConquest.maximum);
  }
  if (next.winnerId) return next;
  next = advancePhase(next);
  return advancePhase(next);
}
